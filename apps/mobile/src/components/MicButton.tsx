import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';

interface MicButtonProps {
  /** Whether the microphone is currently recording */
  isRecording: boolean;
  /** Whether the AI is currently speaking */
  isSpeaking: boolean;
  /** Called when the user taps the mic button */
  onPress: () => void;
  /** Whether the button is disabled (e.g., during connection) */
  disabled?: boolean;
}

/**
 * Microphone button for voice input.
 *
 * Displays as a large circular button with visual states:
 * - Idle: subtle outline, "Tap to speak"
 * - Recording: pulsing red ring, "Listening..."
 * - Speaking: animated blue ring, "Speaking..."
 */
export function MicButton({
  isRecording,
  isSpeaking,
  onPress,
  disabled = false,
}: MicButtonProps) {
  const getLabel = () => {
    if (isSpeaking) return 'Speaking...';
    if (isRecording) return 'Listening...';
    return 'Tap to speak';
  };

  const getButtonStyle = () => {
    if (isRecording) return [styles.button, styles.buttonRecording];
    if (isSpeaking) return [styles.button, styles.buttonSpeaking];
    return [styles.button, styles.buttonIdle];
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={onPress}
        disabled={disabled || isSpeaking}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          {/* Simple mic icon using unicode */}
          <Text style={styles.icon}>
            {isRecording ? '\u23F9' : '\u{1F3A4}'}
          </Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.label}>{getLabel()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  buttonIdle: {
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    borderColor: 'rgba(74, 158, 255, 0.4)',
  },
  buttonRecording: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderColor: '#ff4444',
  },
  buttonSpeaking: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: 'rgba(0, 230, 118, 0.4)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    marginTop: 8,
  },
});
