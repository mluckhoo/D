import { config } from '../config';
import { Audio2FaceClient, BlendshapeFrame } from '../services/audio2face';
import { SessionManager } from '../services/sessionManager';
import { WebSocket } from 'ws';

/**
 * Conversation pipeline that orchestrates the full voice-to-voice flow:
 *
 * Phase 3 (MVP):
 *   User audio → Whisper STT → LLM → ElevenLabs TTS → Audio2Face → Client
 *
 * Phase 4 (PersonaPlex):
 *   User audio → PersonaPlex (full-duplex) → Audio2Face → Client
 *
 * This module handles the Phase 3 interim pipeline using HTTP APIs.
 */

const BLENDSHAPE_COUNT = 52;

export class ConversationPipeline {
  private audio2face: Audio2FaceClient;
  private sessionManager: SessionManager;

  constructor(audio2face: Audio2FaceClient, sessionManager: SessionManager) {
    this.audio2face = audio2face;
    this.sessionManager = sessionManager;
  }

  /**
   * Process a complete user audio recording through the full pipeline.
   *
   * Steps:
   * 1. Transcribe audio with Whisper (STT)
   * 2. Generate response with LLM
   * 3. Synthesize speech with ElevenLabs (TTS)
   * 4. Generate blendshapes with Audio2Face-3D
   * 5. Stream audio + blendshapes to client
   */
  async processUserAudio(
    sessionId: string,
    audioBuffer: Buffer,
    ws: WebSocket
  ): Promise<void> {
    const session = this.sessionManager.get(sessionId);
    if (!session) return;

    try {
      // Notify client: response starting
      this.sendJsonMessage(ws, 0x12, {}); // RESPONSE_START

      // Step 1: Speech-to-Text (Whisper via OpenAI API)
      const transcript = await this.transcribeAudio(audioBuffer);
      console.log(`[${sessionId}] User said: "${transcript}"`);

      // Send user transcript to client
      this.sendJsonMessage(ws, 0x14, { role: 'user', text: transcript });
      this.sessionManager.addMessage(session, 'user', transcript);

      // Step 2: Generate LLM response
      const responseText = await this.generateResponse(session.conversationHistory);
      console.log(`[${sessionId}] AI response: "${responseText}"`);

      // Send assistant transcript to client
      this.sendJsonMessage(ws, 0x14, { role: 'assistant', text: responseText });
      this.sessionManager.addMessage(session, 'assistant', responseText);

      // Step 3: Text-to-Speech (ElevenLabs)
      const ttsAudio = await this.synthesizeSpeech(responseText);

      // Step 4: Generate blendshapes (Audio2Face-3D or fallback)
      const blendshapeFrames = await this.audio2face.processAudio(ttsAudio, 24000);

      // Step 5: Stream audio + blendshapes to client
      await this.streamToClient(ws, session, ttsAudio, blendshapeFrames);

      // Notify client: response ended
      this.sendJsonMessage(ws, 0x13, {}); // RESPONSE_END
    } catch (err) {
      console.error(`[${sessionId}] Pipeline error:`, err);
      this.sendJsonMessage(ws, 0xff, {
        message: err instanceof Error ? err.message : 'Pipeline error',
      });
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper API.
   */
  private async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    if (!config.openai.apiKey) {
      return '[Whisper STT not configured — set OPENAI_API_KEY in .env]';
    }

    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');

    const response = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.openai.apiKey}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { text: string };
    return data.text;
  }

  /**
   * Generate a conversational response using OpenAI GPT.
   */
  private async generateResponse(
    history: Array<{ role: string; content: string }>
  ): Promise<string> {
    if (!config.openai.apiKey) {
      return 'Hello! I am Drea. To enable full conversation, please configure the OpenAI API key in the server .env file.';
    }

    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openai.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'You are Drea, a friendly and expressive AI assistant with a warm personality. ' +
                'Keep responses concise (1-3 sentences) since they will be spoken aloud. ' +
                'Be natural and conversational. Express emotions through your words.',
            },
            ...history,
          ],
          max_tokens: 150,
          temperature: 0.8,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content ?? 'I had trouble thinking of a response.';
  }

  /**
   * Synthesize speech using ElevenLabs API.
   * Returns PCM audio buffer (24kHz, 16-bit, mono).
   */
  private async synthesizeSpeech(text: string): Promise<Buffer> {
    if (!config.elevenlabs.apiKey) {
      // Return a silent audio buffer as fallback
      console.warn('ElevenLabs not configured. Returning silent audio.');
      return Buffer.alloc(24000 * 2 * 2); // 2 seconds of silence at 24kHz 16-bit
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenlabs.voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': config.elevenlabs.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          output_format: 'pcm_24000',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `ElevenLabs API error: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Stream audio + blendshape frames to the client as AVATAR_FRAME packets.
   */
  private async streamToClient(
    ws: WebSocket,
    session: ReturnType<SessionManager['create']>,
    audioBuffer: Buffer,
    frames: BlendshapeFrame[]
  ): Promise<void> {
    if (frames.length === 0) return;

    const audioChunkDuration = 1 / 30; // One frame's worth of audio at 30fps
    const audioBytesPerFrame = Math.floor(24000 * 2 * audioChunkDuration); // 24kHz 16-bit

    for (let i = 0; i < frames.length; i++) {
      const seq = this.sessionManager.getNextSequence(session);
      const timestampMs = Math.floor(frames[i].timestamp * 1000);

      // Extract corresponding audio chunk
      const audioStart = i * audioBytesPerFrame;
      const audioEnd = Math.min(audioStart + audioBytesPerFrame, audioBuffer.length);
      const audioChunk = audioBuffer.subarray(audioStart, audioEnd);

      // Encode AVATAR_FRAME binary packet
      const packet = this.encodeAvatarFrame(
        seq,
        timestampMs,
        audioChunk,
        frames[i].weights
      );

      // Send if connection is still open
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(packet);
      }

      // Pace the sending at ~30fps to match real-time playback
      // (In production, use a more precise timer)
      await new Promise((resolve) => setTimeout(resolve, 33));
    }
  }

  /**
   * Encode a single AVATAR_FRAME binary packet.
   */
  private encodeAvatarFrame(
    sequence: number,
    timestampMs: number,
    audioChunk: Buffer,
    blendshapeWeights: Float32Array
  ): Buffer {
    const totalSize =
      1 + 4 + 4 + 2 + audioChunk.length + 1 + BLENDSHAPE_COUNT * 4;
    const buf = Buffer.alloc(totalSize);
    let offset = 0;

    buf.writeUInt8(0x11, offset); // AVATAR_FRAME
    offset += 1;
    buf.writeUInt32BE(sequence, offset);
    offset += 4;
    buf.writeUInt32BE(timestampMs, offset);
    offset += 4;
    buf.writeUInt16BE(audioChunk.length, offset);
    offset += 2;
    audioChunk.copy(buf, offset);
    offset += audioChunk.length;
    buf.writeUInt8(1, offset); // 1 blendshape frame per packet
    offset += 1;

    for (let i = 0; i < BLENDSHAPE_COUNT; i++) {
      buf.writeFloatBE(blendshapeWeights[i] ?? 0, offset);
      offset += 4;
    }

    return buf;
  }

  /** Send a JSON control message to the client */
  private sendJsonMessage(
    ws: WebSocket,
    type: number,
    payload: Record<string, unknown>
  ): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    const json = JSON.stringify(payload);
    const jsonBuf = Buffer.from(json, 'utf-8');
    const buf = Buffer.alloc(1 + jsonBuf.length);
    buf.writeUInt8(type, 0);
    jsonBuf.copy(buf, 1);
    ws.send(buf);
  }
}
