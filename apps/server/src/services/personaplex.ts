import { config } from '../config';

/**
 * PersonaPlex WebSocket client for full-duplex speech-to-speech conversation.
 *
 * PersonaPlex (NVIDIA, 7B model based on Moshi architecture) enables
 * natural conversation with simultaneous listening and speaking,
 * supporting interruptions and barge-in.
 *
 * Protocol: WebSocket with bidirectional streaming audio.
 * - Client sends: raw PCM audio chunks (24kHz, mono, float32)
 * - Server sends: response audio chunks (24kHz, mono, float32)
 *
 * Reference: https://github.com/NVIDIA/personaplex
 *
 * This client is Phase 4 — requires a deployed PersonaPlex server
 * or API access at personaplex.io.
 */

export interface PersonaPlexEvents {
  onAudioChunk: (audioBuffer: Buffer) => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onError: (error: Error) => void;
}

export class PersonaPlexClient {
  private ws: WebSocket | null = null;
  private events: PersonaPlexEvents;
  private isConnected = false;

  constructor(events: PersonaPlexEvents) {
    this.events = events;
  }

  /**
   * Connect to the PersonaPlex server.
   * The server must be running (see docker-compose.yml or self-host).
   */
  async connect(): Promise<void> {
    const url = config.personaplex.url;
    if (!url) {
      console.warn(
        'PersonaPlex URL not configured. Set PERSONAPLEX_URL in .env. ' +
        'Using interim STT+LLM+TTS pipeline instead.'
      );
      return;
    }

    return new Promise((resolve, reject) => {
      // PersonaPlex server expects a WebSocket connection
      // with optional query params for voice and text prompt
      const voice = config.personaplex.voice;
      const connectUrl = `${url}?voice=${encodeURIComponent(voice)}`;

      this.ws = new WebSocket(connectUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log('PersonaPlex connected');
        resolve();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        // PersonaPlex streams back audio as binary frames
        if (event.data instanceof ArrayBuffer) {
          this.events.onAudioChunk(Buffer.from(event.data));
        } else if (typeof event.data === 'string') {
          // JSON control messages
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'speech_start') {
              this.events.onSpeechStart();
            } else if (msg.type === 'speech_end') {
              this.events.onSpeechEnd();
            }
          } catch {
            // Ignore malformed messages
          }
        }
      };

      this.ws.onerror = (err) => {
        this.events.onError(new Error(`PersonaPlex WebSocket error: ${err}`));
        reject(err);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.log('PersonaPlex disconnected');
      };
    });
  }

  /**
   * Send an audio chunk to PersonaPlex for processing.
   * Audio should be PCM float32, 24kHz, mono.
   */
  sendAudio(audioBuffer: Buffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(audioBuffer);
    }
  }

  /**
   * Send a text prompt to configure the persona.
   * Must be sent before the first audio.
   */
  sendTextPrompt(prompt: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'text_prompt', content: prompt }));
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
