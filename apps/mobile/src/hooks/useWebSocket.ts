import { useCallback, useEffect, useRef, useState } from 'react';
import { ServerMessageType } from '../services/socketProtocol';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseWebSocketOptions {
  url: string;
  /** Called when a binary message arrives */
  onBinaryMessage?: (data: ArrayBuffer) => void;
  /** Called when a JSON message arrives */
  onJsonMessage?: (type: number, payload: Record<string, unknown>) => void;
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
}

/**
 * WebSocket connection manager with reconnection logic.
 * Handles the binary protocol for audio + blendshape streaming.
 */
export function useWebSocket({
  url,
  onBinaryMessage,
  onJsonMessage,
  autoReconnect = true,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempt = useRef(0);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      setStatus('connected');
      reconnectAttempt.current = 0;
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const view = new DataView(event.data);
        const type = view.getUint8(0);

        if (type === ServerMessageType.AVATAR_FRAME) {
          onBinaryMessage?.(event.data);
        } else {
          // JSON messages (SESSION_READY, TRANSCRIPT, ERROR, etc.)
          try {
            const decoder = new TextDecoder();
            const jsonStr = decoder.decode(new Uint8Array(event.data, 1));
            const payload = JSON.parse(jsonStr);
            onJsonMessage?.(type, payload);
          } catch {
            // Non-JSON binary message
            onBinaryMessage?.(event.data);
          }
        }
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;

      if (autoReconnect) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30000);
        reconnectAttempt.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      setStatus('error');
    };

    wsRef.current = ws;
  }, [url, onBinaryMessage, onJsonMessage, autoReconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  /** Send a binary message (used for audio chunks) */
  const sendBinary = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  /** Send a JSON message */
  const sendJson = useCallback((type: number, payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const json = JSON.stringify(payload);
      const encoder = new TextEncoder();
      const jsonBytes = encoder.encode(json);
      const buf = new ArrayBuffer(1 + jsonBytes.length);
      new Uint8Array(buf)[0] = type;
      new Uint8Array(buf, 1).set(jsonBytes);
      wsRef.current.send(buf);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      wsRef.current?.close();
    };
  }, []);

  return { status, connect, disconnect, sendBinary, sendJson };
}
