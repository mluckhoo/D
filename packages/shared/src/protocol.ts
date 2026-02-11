/**
 * Binary WebSocket protocol for real-time audio + blendshape streaming.
 *
 * All multi-byte numbers are big-endian (network byte order).
 */

// ── Message Types ──────────────────────────────────────────────

/** Client → Server */
export enum ClientMessageType {
  /** Raw PCM audio from microphone (binary payload) */
  AUDIO_IN = 0x01,
  /** Session configuration (JSON payload) */
  SESSION_CONFIG = 0x02,
  /** User explicitly signals done speaking */
  END_OF_SPEECH = 0x03,
}

/** Server → Client */
export enum ServerMessageType {
  /** Session initialized, ready for audio (JSON payload) */
  SESSION_READY = 0x10,
  /** Combined audio + blendshapes (binary payload) */
  AVATAR_FRAME = 0x11,
  /** AI begins a new response turn */
  RESPONSE_START = 0x12,
  /** AI finished responding */
  RESPONSE_END = 0x13,
  /** Text transcript (JSON payload) */
  TRANSCRIPT = 0x14,
  /** Error message (JSON payload) */
  ERROR = 0xff,
}

// ── Binary Frame Layout (AVATAR_FRAME = 0x11) ─────────────────
//
// Byte 0:        Message type (0x11)
// Bytes 1-4:     Sequence number (uint32)
// Bytes 5-8:     Timestamp in ms (uint32)
// Bytes 9-10:    Audio chunk length in bytes (uint16)
// Bytes 11-N:    Audio PCM data (24kHz, 16-bit, mono)
// Byte  N+1:     Number of blendshape frames (uint8)
// Bytes N+2..:   52 × float32 per frame (208 bytes each)

export const AUDIO_SAMPLE_RATE_IN = 16000; // mic capture rate
export const AUDIO_SAMPLE_RATE_OUT = 24000; // playback rate
export const AUDIO_BITS_PER_SAMPLE = 16;
export const AUDIO_CHANNELS = 1;
export const BLENDSHAPE_COUNT = 52;
export const BLENDSHAPE_FRAME_BYTES = BLENDSHAPE_COUNT * 4; // 52 × float32

// ── Encode / Decode Helpers ────────────────────────────────────

/**
 * Encode a client AUDIO_IN message.
 * Layout: [type:1][chunk:N]
 */
export function encodeAudioIn(pcmChunk: ArrayBuffer): ArrayBuffer {
  const buf = new ArrayBuffer(1 + pcmChunk.byteLength);
  const view = new DataView(buf);
  view.setUint8(0, ClientMessageType.AUDIO_IN);
  new Uint8Array(buf, 1).set(new Uint8Array(pcmChunk));
  return buf;
}

/**
 * Decode a server AVATAR_FRAME message.
 */
export function decodeAvatarFrame(data: ArrayBuffer): {
  sequence: number;
  timestampMs: number;
  audioChunk: ArrayBuffer;
  blendshapeFrames: Float32Array[];
} {
  const view = new DataView(data);
  let offset = 1; // skip type byte

  const sequence = view.getUint32(offset);
  offset += 4;
  const timestampMs = view.getUint32(offset);
  offset += 4;
  const audioLen = view.getUint16(offset);
  offset += 2;

  const audioChunk = data.slice(offset, offset + audioLen);
  offset += audioLen;

  const frameCount = view.getUint8(offset);
  offset += 1;

  const blendshapeFrames: Float32Array[] = [];
  for (let f = 0; f < frameCount; f++) {
    const frame = new Float32Array(BLENDSHAPE_COUNT);
    for (let i = 0; i < BLENDSHAPE_COUNT; i++) {
      frame[i] = view.getFloat32(offset);
      offset += 4;
    }
    blendshapeFrames.push(frame);
  }

  return { sequence, timestampMs, audioChunk, blendshapeFrames };
}

/**
 * Encode a server AVATAR_FRAME message (used by backend).
 */
export function encodeAvatarFrame(
  sequence: number,
  timestampMs: number,
  audioChunk: Buffer | ArrayBuffer,
  blendshapeFrames: Float32Array[]
): Buffer {
  const audioBytes =
    audioChunk instanceof Buffer ? audioChunk : Buffer.from(audioChunk);
  const frameCount = blendshapeFrames.length;
  const totalSize =
    1 + 4 + 4 + 2 + audioBytes.length + 1 + frameCount * BLENDSHAPE_FRAME_BYTES;

  const buf = Buffer.alloc(totalSize);
  let offset = 0;

  buf.writeUInt8(ServerMessageType.AVATAR_FRAME, offset);
  offset += 1;
  buf.writeUInt32BE(sequence, offset);
  offset += 4;
  buf.writeUInt32BE(timestampMs, offset);
  offset += 4;
  buf.writeUInt16BE(audioBytes.length, offset);
  offset += 2;
  audioBytes.copy(buf, offset);
  offset += audioBytes.length;
  buf.writeUInt8(frameCount, offset);
  offset += 1;

  for (const frame of blendshapeFrames) {
    for (let i = 0; i < BLENDSHAPE_COUNT; i++) {
      buf.writeFloatBE(frame[i], offset);
      offset += 4;
    }
  }

  return buf;
}
