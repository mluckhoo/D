import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AvatarCardProps {
  /** Name displayed below the avatar */
  name?: string;
  /** Status text (e.g., "Listening...", "Speaking...") */
  status?: string;
  /** Whether the AI is currently speaking */
  isSpeaking?: boolean;
  /** The 3D canvas as children */
  children: ReactNode;
}

/**
 * Card-style UI frame around the avatar.
 *
 * Renders a dark rounded card with the 3D avatar canvas filling
 * the main area, a name label, and a status indicator. Matches
 * the "Drea" reference screenshot aesthetic.
 */
export function AvatarCard({
  name = 'Drea',
  status = 'Ready',
  isSpeaking = false,
  children,
}: AvatarCardProps) {
  return (
    <View style={styles.card}>
      {/* Avatar 3D viewport */}
      <View style={styles.viewport}>{children}</View>

      {/* Bottom info bar */}
      <View style={styles.infoBar}>
        <View style={styles.nameRow}>
          <View
            style={[
              styles.statusDot,
              isSpeaking ? styles.statusActive : styles.statusIdle,
            ]}
          />
          <Text style={styles.name}>{name}</Text>
        </View>
        <Text style={styles.status}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  viewport: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  infoBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusIdle: {
    backgroundColor: '#4a9eff',
  },
  statusActive: {
    backgroundColor: '#00e676',
  },
  name: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  status: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginLeft: 16,
  },
});
