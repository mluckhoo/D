import React, { useCallback, useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { AvatarCard } from '../components/AvatarCard';
import { AvatarCanvas } from '../components/AvatarCanvas';
import { MicButton } from '../components/MicButton';
import { ChatOverlay } from '../components/ChatOverlay';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useWebSocket } from '../hooks/useWebSocket';
import { useBlendshapes } from '../hooks/useBlendshapes';
import { decodeAvatarFrame, ServerMessageType } from '../services/socketProtocol';

// Server URL — configure via environment or settings screen
const WS_URL = 'ws://localhost:8080/ws/chat';

// Placeholder avatar model — replace with Ready Player Me GLB export URL:
// https://models.readyplayer.me/{AVATAR_ID}.glb?morphTargets=ARKit&textureAtlas=1024
const AVATAR_MODEL_URI: string | undefined = undefined;

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

/**
 * Main screen of the app.
 *
 * Layout:
 * - Full-screen dark background
 * - Avatar card (3D face) fills most of the screen
 * - Chat transcript overlay at the bottom of the card
 * - Mic button at the very bottom
 *
 * For the MVP demo, the avatar runs a demo animation (blendshape test)
 * when no server is connected. When connected, it receives blendshapes
 * from Audio2Face-3D via the backend.
 */
export function HomeScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<string>('Demo mode');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [demoMode, setDemoMode] = useState(true);

  const blendshapes = useBlendshapes();
  const audioPlayback = useAudioPlayback();

  // Handle incoming avatar frames from the server
  const handleBinaryMessage = useCallback(
    (data: ArrayBuffer) => {
      const frame = decodeAvatarFrame(data);
      for (const bs of frame.blendshapeFrames) {
        blendshapes.pushFrame(frame.timestampMs / 1000, bs);
      }
      // TODO: queue audio chunk for playback
    },
    [blendshapes]
  );

  // Handle JSON messages from the server
  const handleJsonMessage = useCallback(
    (type: number, payload: Record<string, unknown>) => {
      switch (type) {
        case ServerMessageType.SESSION_READY:
          setStatus('Connected');
          setDemoMode(false);
          break;
        case ServerMessageType.RESPONSE_START:
          setIsSpeaking(true);
          setStatus('Speaking...');
          blendshapes.startPlayback();
          break;
        case ServerMessageType.RESPONSE_END:
          setIsSpeaking(false);
          setStatus('Ready');
          blendshapes.stopPlayback();
          break;
        case ServerMessageType.TRANSCRIPT:
          if (payload.role && payload.text) {
            setMessages((prev) => [
              ...prev,
              {
                role: payload.role as 'user' | 'assistant',
                text: payload.text as string,
              },
            ]);
          }
          break;
        case ServerMessageType.ERROR:
          setStatus(`Error: ${payload.message ?? 'Unknown'}`);
          break;
      }
    },
    [blendshapes]
  );

  const ws = useWebSocket({
    url: WS_URL,
    onBinaryMessage: handleBinaryMessage,
    onJsonMessage: handleJsonMessage,
    autoReconnect: false, // Don't auto-connect in demo mode
  });

  const audioCapture = useAudioCapture();

  // Handle mic button press
  const handleMicPress = useCallback(async () => {
    if (audioCapture.isRecording) {
      // Stop recording and send to server
      const uri = await audioCapture.stopRecording();
      if (uri) {
        setStatus('Processing...');
        // In full pipeline: stream audio chunks via ws.sendBinary()
        // For MVP demo: the recorded file URI can be sent to the server
        setMessages((prev) => [
          ...prev,
          { role: 'user', text: '[Voice message sent]' },
        ]);
      }
    } else {
      await audioCapture.startRecording();
      setStatus('Listening...');
    }
  }, [audioCapture, ws]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cardContainer}>
        <AvatarCard
          name="Drea"
          status={status}
          isSpeaking={isSpeaking}
        >
          <AvatarCanvas
            modelUri={AVATAR_MODEL_URI}
            demoAnimation={demoMode}
          />
        </AvatarCard>
      </View>

      <ChatOverlay messages={messages} />

      <MicButton
        isRecording={audioCapture.isRecording}
        isSpeaking={isSpeaking}
        onPress={handleMicPress}
        disabled={ws.status === 'connecting'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  cardContainer: {
    flex: 1,
    margin: 16,
    marginBottom: 8,
  },
});
