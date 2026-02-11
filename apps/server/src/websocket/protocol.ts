/**
 * WebSocket message type constants.
 * Mirrors the shared protocol definitions.
 */

/** Client → Server */
export enum ClientMessageType {
  AUDIO_IN = 0x01,
  SESSION_CONFIG = 0x02,
  END_OF_SPEECH = 0x03,
}

/** Server → Client */
export enum ServerMessageType {
  SESSION_READY = 0x10,
  AVATAR_FRAME = 0x11,
  RESPONSE_START = 0x12,
  RESPONSE_END = 0x13,
  TRANSCRIPT = 0x14,
  ERROR = 0xff,
}
