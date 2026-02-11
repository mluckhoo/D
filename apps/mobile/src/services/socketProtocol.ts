/**
 * WebSocket binary protocol encode/decode for the mobile client.
 *
 * Mirrors the shared protocol but with client-specific helpers.
 */

// ── Message Types ──────────────────────────────────────────────

export enum ClientMessageType {
  AUDIO_IN = 0x01,
  SESSION_CONFIG = 0x02,
  END_OF_SPEECH = 0x03,
}

export enum ServerMessageType {
  SESSION_READY = 0x10,
  AVATAR_FRAME = 0x11,
  RESPONSE_START = 0x12,
  RESPONSE_END = 0x13,
  TRANSCRIPT = 0x14,
  ERROR = 0xff,
}

// ── Constants ──────────────────────────────────────────────────

export const BLENDSHAPE_COUNT = 52;

// ── Decode AVATAR_FRAME ────────────────────────────────────────

export interface AvatarFrameData {
  sequence: number;
  timestampMs: number;
  audioChunk: ArrayBuffer;
  blendshapeFrames: Float32Array[];
}

export function decodeAvatarFrame(data: ArrayBuffer): AvatarFrameData {
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

// ── Encode AUDIO_IN ────────────────────────────────────────────

export function encodeAudioIn(pcmChunk: ArrayBuffer): ArrayBuffer {
  const buf = new ArrayBuffer(1 + pcmChunk.byteLength);
  const arr = new Uint8Array(buf);
  arr[0] = ClientMessageType.AUDIO_IN;
  arr.set(new Uint8Array(pcmChunk), 1);
  return buf;
}
