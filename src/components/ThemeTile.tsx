import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { type AppTheme, radius, spacing, typography } from '@/theme';

import { PressableScale } from './PressableScale';
import { ThemePreview } from './ThemePreview';

type Props = {
  option: AppTheme;
  selected: boolean;
  onPress: () => void;
  width: number;
};

export function ThemeTile({ option, selected, onPress, width }: Props) {
  const active = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${option.name} theme`}
      style={[
        styles.tile,
        {
          width,
          borderColor: selected ? active.colors.accent : active.colors.border,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          backgroundColor: active.colors.surface,
        },
      ]}
    >
      <ThemePreview theme={option} compact />
      <View style={styles.label}>
        <View style={styles.text}>
          <Text style={[styles.name, { color: active.colors.text }]} numberOfLines={1}>
            {option.name}
          </Text>
          <Text style={[styles.tagline, { color: active.colors.textMuted }]} numberOfLines={1}>
            {option.tagline}
          </Text>
        </View>
        {selected ? <Ionicons name="checkmark-circle" size={20} color={active.colors.accent} /> : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.lg,
    padding: 6,
    gap: spacing.sm,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  text: {
    flex: 1,
  },
  name: {
    ...typography.label,
    fontSize: 15,
  },
  tagline: {
    ...typography.caption,
    fontSize: 12,
  },
});
