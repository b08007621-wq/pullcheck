import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';

type Props = {
  value: string | null;
  placeholder: string;
  accessibilityLabel: string;
  onPress: () => void;
};

export function EditableValue({ value, placeholder, accessibilityLabel, onPress }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={[styles.text, { color: value ? theme.colors.text : theme.colors.accent }]}>
        {value ?? placeholder}
      </Text>
      {value ? <Ionicons name="pencil" size={13} color={theme.colors.textFaint} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    ...typography.label,
    fontSize: 15,
    textAlign: 'right',
  },
});
