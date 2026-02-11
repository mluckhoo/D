import { useCallback, useRef } from 'react';
import {
  ARKIT_BLENDSHAPE_NAMES,
  BlendshapeName,
  createEmptyFrame,
} from '../utils/blendshapeMap';

interface TimestampedFrame {
  /** Seconds since response start */
  timestamp: number;
  /** 52 blendshape weights */
  values: Record<BlendshapeName, number>;
}

const MAX_BUFFER_SIZE = 60; // ~2 seconds at 30fps

/**
 * Ring buffer for blendshape frames with timestamp-based interpolation.
 *
 * Receives 30fps blendshape data from Audio2Face-3D via the server,
 * and provides smooth 60fps interpolation for useFrame() rendering.
 */
export function useBlendshapes() {
  const buffer = useRef<TimestampedFrame[]>([]);
  const playbackStartTime = useRef<number>(0);
  const isPlaying = useRef(false);

  /** Add a new blendshape frame from the server */
  const pushFrame = useCallback(
    (timestamp: number, values: Float32Array) => {
      const frame: Record<string, number> = {};
      ARKIT_BLENDSHAPE_NAMES.forEach((name, i) => {
        frame[name] = values[i] ?? 0;
      });

      buffer.current.push({
        timestamp,
        values: frame as Record<BlendshapeName, number>,
      });

      // Prune old frames to prevent memory growth
      if (buffer.current.length > MAX_BUFFER_SIZE) {
        buffer.current.splice(0, buffer.current.length - MAX_BUFFER_SIZE);
      }
    },
    []
  );

  /** Signal that audio playback has started (synchronization anchor) */
  const startPlayback = useCallback(() => {
    playbackStartTime.current = performance.now();
    isPlaying.current = true;
  }, []);

  /** Stop playback and clear buffer */
  const stopPlayback = useCallback(() => {
    isPlaying.current = false;
    buffer.current = [];
  }, []);

  /**
   * Get the interpolated blendshape frame for the current moment.
   * Called from useFrame() at 60fps.
   */
  const getCurrentFrame = useCallback((): Record<BlendshapeName, number> => {
    if (!isPlaying.current || buffer.current.length === 0) {
      return createEmptyFrame();
    }

    const elapsed = (performance.now() - playbackStartTime.current) / 1000;
    const frames = buffer.current;

    // Find bracketing frames
    let prevIdx = 0;
    for (let i = 0; i < frames.length - 1; i++) {
      if (frames[i + 1].timestamp > elapsed) {
        prevIdx = i;
        break;
      }
      prevIdx = i;
    }

    const prev = frames[prevIdx];
    const next = frames[Math.min(prevIdx + 1, frames.length - 1)];

    // If same frame or single frame, return directly
    if (prev === next || prev.timestamp === next.timestamp) {
      return { ...prev.values };
    }

    // Linear interpolation between frames
    const t = Math.max(
      0,
      Math.min(
        1,
        (elapsed - prev.timestamp) / (next.timestamp - prev.timestamp)
      )
    );

    const interpolated = createEmptyFrame();
    for (const name of ARKIT_BLENDSHAPE_NAMES) {
      interpolated[name] = prev.values[name] + t * (next.values[name] - prev.values[name]);
    }

    // Prune fully consumed frames (keep 1 behind for interpolation)
    if (prevIdx > 1) {
      buffer.current.splice(0, prevIdx - 1);
    }

    return interpolated;
  }, []);

  return {
    pushFrame,
    getCurrentFrame,
    startPlayback,
    stopPlayback,
  };
}
