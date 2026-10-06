import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import type { IconName } from '@/types/icon';

import { PressableScale } from './PressableScale';

type Props = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary';
};

export function ActionButton({ label, onPress, icon, variant = 'primary' }: Props) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const contentColor = isPrimary ? theme.colors.onAccent : theme.colors.text;

  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} scaleTo={0.97}>
      <View
        style={[styles.button, { backgroundColor: isPrimary ? theme.colors.accent : theme.colors.surfaceRaised }]}
      >
        {icon ? <Ionicons name={icon} size={17} color={contentColor} /> : null}
        <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  label: {
    ...typography.label,
    fontSize: 16,
  },
});
