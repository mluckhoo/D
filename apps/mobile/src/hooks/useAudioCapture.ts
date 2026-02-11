import { Audio } from 'expo-av';
import { useCallback, useRef, useState } from 'react';

interface UseAudioCaptureOptions {
  /** Called with PCM audio chunk (base64 encoded from expo-av) */
  onAudioChunk?: (base64Data: string) => void;
  /** Sample rate in Hz (default: 16000 for Audio2Face-3D) */
  sampleRate?: number;
}

/**
 * Microphone capture using expo-av.
 * Streams audio data for real-time voice input.
 */
export function useAudioCapture({
  onAudioChunk,
  sampleRate = 16000,
}: UseAudioCaptureOptions = {}) {
  const recording = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        console.warn('Microphone permission not granted');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate,
          numberOfChannels: 1,
          bitRate: sampleRate * 16,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate,
          numberOfChannels: 1,
          bitRate: sampleRate * 16,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: sampleRate * 16,
        },
      });

      recording.current = rec;
      setIsRecording(true);

      // Set up metering callback for audio level monitoring
      rec.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.metering !== undefined) {
          // Metering is available — audio is flowing
        }
      });
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [sampleRate, onAudioChunk]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recording.current) return null;

    try {
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      recording.current = null;
      setIsRecording(false);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      return uri;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setIsRecording(false);
      return null;
    }
  }, []);

  return { isRecording, startRecording, stopRecording };
}
