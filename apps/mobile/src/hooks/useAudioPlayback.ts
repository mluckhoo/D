import { Audio, AVPlaybackStatus } from 'expo-av';
import { useCallback, useRef, useState } from 'react';

/**
 * Audio playback manager for streaming AI response audio.
 *
 * For the MVP, this plays complete audio files (recorded WAV from the server).
 * For real-time streaming, this will be replaced with a PCM buffer + AudioTrack
 * native module.
 */
export function useAudioPlayback() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  /** Play audio from a URI (local file or remote URL) */
  const playAudio = useCallback(async (uri: string): Promise<void> => {
    try {
      // Unload previous sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (err) {
      console.error('Failed to play audio:', err);
      setIsPlaying(false);
    }
  }, []);

  /** Stop current playback */
  const stopAudio = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsPlaying(false);
    } catch (err) {
      console.error('Failed to stop audio:', err);
    }
  }, []);

  return { isPlaying, playAudio, stopAudio };
}
