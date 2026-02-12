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

// ---------------------------------------------------------------------------
// Avatar Model GLB
// ---------------------------------------------------------------------------
// The AvatarModel component accepts any GLB with ARKit-compatible morph
// targets. It auto-detects naming conventions (ARKit, MetaHuman FACS, etc.)
// and maps everything to the canonical 52 ARKit blendshapes.
//
// ── Option A: Ready Player Me (easiest — recommended for public demos) ──
//   1. Go to https://readyplayer.me and create an avatar
//   2. Copy the avatar URL (e.g. https://models.readyplayer.me/<id>.glb)
//   3. Append ?morphTargets=ARKit to the URL
//   4. Paste the full URL below
//
//   Example:
//     const AVATAR_MODEL_URI = 'https://models.readyplayer.me/<your-id>.glb?morphTargets=ARKit';
//
// ── Option B: Avaturn ──
//   1. Create an avatar at https://avaturn.me
//   2. Export as GLB with ARKit blendshapes enabled
//   3. Host the file or place in assets/avatar/ and use require()
//
// ── Option C: Unreal MetaHuman (advanced) ──
//   1. Create avatar in MetaHuman Creator (metahuman.unrealengine.com)
//   2. In UE5: right-click MetaHuman → Export → "Export as FBX (DCC)"
//   3. Import FBX into Blender → export as GLB (include morph targets)
//   4. Place at assets/avatar/metahuman.glb and use require()
//
// For local files:
//   const AVATAR_MODEL_URI = require('../assets/avatar/avatar.glb');
//
// Set to undefined to show the placeholder (demo animation still works).
// ---------------------------------------------------------------------------
const AVATAR_MODEL_URI: string | undefined =
  'https://models.readyplayer.me/6185a4acfb622cf1cdc49348.glb?morphTargets=ARKit';

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
