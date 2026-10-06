import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/theme';

import { GlassSurface } from './GlassSurface';

type Props = {
  onClose: () => void;
  children: ReactNode;
};

export function SheetModal({ onClose, children }: Props) {
  const theme = useTheme();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <BlurView
        tint={theme.mode === 'light' ? 'light' : 'dark'}
        intensity={theme.glass ? 45 : 25}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.frame}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <GlassSurface variant="sheet" style={styles.sheet}>
          {children}
        </GlassSurface>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  frame: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    maxHeight: '86%',
    borderRadius: radius.lg + 4,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
