import { WebSocket as WsWebSocket, RawData } from 'ws';
import { SessionManager } from '../services/sessionManager';
import { ConversationPipeline } from '../pipeline/conversationPipeline';

/** Client message types */
const MSG_AUDIO_IN = 0x01;
const MSG_SESSION_CONFIG = 0x02;
const MSG_END_OF_SPEECH = 0x03;

/**
 * WebSocket connection handler.
 *
 * Manages the lifecycle of a single client connection:
 * 1. Creates a session on connect
 * 2. Routes incoming messages to the conversation pipeline
 * 3. Cleans up session on disconnect
 */
export function createWebSocketHandler(
  sessionManager: SessionManager,
  pipeline: ConversationPipeline
) {
  return function handleConnection(ws: WsWebSocket) {
    const session = sessionManager.create(ws as unknown as import('ws').WebSocket);
    console.log(`Client connected: ${session.id}`);

    // Audio buffer to accumulate chunks for a complete utterance
    let audioChunks: Buffer[] = [];

    // Send SESSION_READY
    const readyPayload = JSON.stringify({ sessionId: session.id });
    const readyBuf = Buffer.alloc(1 + readyPayload.length);
    readyBuf.writeUInt8(0x10, 0); // SESSION_READY
    readyBuf.write(readyPayload, 1, 'utf-8');
    ws.send(readyBuf);

    ws.on('message', async (data: RawData, isBinary: boolean) => {
      if (!isBinary) return; // Ignore text messages

      const buf = Buffer.from(data as ArrayBuffer);
      if (buf.length < 1) return;

      const msgType = buf.readUInt8(0);

      switch (msgType) {
        case MSG_AUDIO_IN: {
          // Accumulate audio chunk (skip the type byte)
          const audioChunk = buf.subarray(1);
          audioChunks.push(audioChunk);
          break;
        }

        case MSG_END_OF_SPEECH: {
          // User finished speaking — process accumulated audio
          if (audioChunks.length > 0) {
            const fullAudio = Buffer.concat(audioChunks);
            audioChunks = [];

            console.log(
              `[${session.id}] Processing ${fullAudio.length} bytes of audio`
            );

            // Run through the conversation pipeline
            await pipeline.processUserAudio(
              session.id,
              fullAudio,
              ws as unknown as import('ws').WebSocket
            );
          }
          break;
        }

        case MSG_SESSION_CONFIG: {
          // Parse JSON configuration
          try {
            const jsonStr = buf.subarray(1).toString('utf-8');
            const configPayload = JSON.parse(jsonStr);
            console.log(`[${session.id}] Config:`, configPayload);
            // Future: apply persona, voice, language settings
          } catch {
            console.warn(`[${session.id}] Invalid session config message`);
          }
          break;
        }

        default:
          console.warn(`[${session.id}] Unknown message type: 0x${msgType.toString(16)}`);
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected: ${session.id}`);
      sessionManager.destroy(session.id);
      audioChunks = [];
    });

    ws.on('error', (err) => {
      console.error(`[${session.id}] WebSocket error:`, err);
    });
  };
}
