import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

type Props = {
  onPress: () => void;
};

export function RipButton({ onPress }: Props) {
  const theme = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open packs"
      hitSlop={6}
      scaleTo={0.94}
    >
      <GlassSurface interactive style={styles.pill}>
        <Ionicons name="gift-outline" size={18} color={theme.colors.accent} />
        <Text style={[styles.label, { color: theme.colors.text }]}>Open packs</Text>
      </GlassSurface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  label: {
    ...typography.label,
    fontSize: 14,
  },
});
