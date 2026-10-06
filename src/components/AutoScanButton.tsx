import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

type Props = {
  on: boolean;
  onPress: () => void;
};

export function AutoScanButton({ on, onPress }: Props) {
  const theme = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityLabel="Auto scan"
      accessibilityState={{ checked: on }}
      hitSlop={6}
      scaleTo={0.94}
    >
      <GlassSurface interactive style={[styles.pill, on && { backgroundColor: theme.colors.accent }]}>
        <Ionicons name={on ? 'scan' : 'scan-outline'} size={18} color={on ? theme.colors.onAccent : theme.colors.text} />
        <Text style={[styles.label, { color: on ? theme.colors.onAccent : theme.colors.text }]}>Auto</Text>
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
    overflow: 'hidden',
  },
  label: {
    ...typography.label,
    fontSize: 14,
  },
});
