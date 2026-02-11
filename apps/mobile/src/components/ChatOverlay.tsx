import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatOverlayProps {
  /** Chat transcript messages */
  messages: ChatMessage[];
  /** Whether the overlay is visible */
  visible?: boolean;
}

/**
 * Optional text transcript overlay shown at the bottom of the screen.
 * Displays the conversation history as text below the avatar.
 */
export function ChatOverlay({ messages, visible = true }: ChatOverlayProps) {
  if (!visible || messages.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.text,
                msg.role === 'user' ? styles.userText : styles.assistantText,
              ]}
            >
              {msg.text}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 120,
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: 8,
    gap: 6,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#4a9eff',
  },
  assistantText: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
