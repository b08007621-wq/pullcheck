import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';

type Props = {
  label: string;
  tone?: 'neutral' | 'accent' | 'gain' | 'loss';
};

export function Chip({ label, tone = 'neutral' }: Props) {
  const theme = useTheme();
  const color = {
    neutral: theme.colors.textMuted,
    accent: theme.colors.text,
    gain: theme.colors.gain,
    loss: theme.colors.loss,
  }[tone];

  return (
    <View style={[styles.chip, { backgroundColor: theme.colors.surfaceRaised }]}>
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  text: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
});
