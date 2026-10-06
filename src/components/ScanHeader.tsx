import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/theme';
import type { IconName } from '@/types/icon';

import { AppearanceButton } from './AppearanceButton';
import { ScanHint } from './ScanHint';

type Props = {
  topInset: number;
  hint: string;
  hintIcon: IconName;
  hintTone: 'neutral' | 'danger';
  action?: ReactNode;
};

export const SCAN_HEADER_HEIGHT = 112;

export function ScanHeader({ topInset, hint, hintIcon, hintTone, action }: Props) {
  return (
    <View style={[styles.header, { paddingTop: topInset + spacing.sm }]} pointerEvents="box-none">
      <View style={styles.titleRow} pointerEvents="box-none">
        <Text style={styles.title} accessibilityRole="header">
          Scan
        </Text>
        <View style={styles.actions} pointerEvents="box-none">
          {action}
          <AppearanceButton />
        </View>
      </View>
      <ScanHint message={hint} icon={hintIcon} tone={hintTone} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  },
});
