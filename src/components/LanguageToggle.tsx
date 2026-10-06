import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import type { Market } from '@/types/sealed';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

type Props = {
  value: Market;
  onChange: (market: Market) => void;
};

const LABELS: Record<Market, { short: string; full: string }> = {
  en: { short: 'EN', full: 'English cards and products' },
  jp: { short: 'JP', full: 'Japanese cards and products' },
};

export function LanguageToggle({ value, onChange }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const next: Market = value === 'en' ? 'jp' : 'en';

  return (
    <PressableScale
      onPress={() => {
        haptics.selection();
        onChange(next);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Showing ${LABELS[value].full}. Switch to ${LABELS[next].full}`}
      scaleTo={0.92}
      hitSlop={6}
    >
      <GlassSurface interactive style={styles.pill}>
        <Ionicons name="language-outline" size={16} color={theme.colors.accent} />
        <Text style={[styles.label, { color: theme.colors.text }]}>{LABELS[value].short}</Text>
      </GlassSurface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.pill,
  },
  label: {
    ...typography.label,
    fontSize: 14,
  },
});
