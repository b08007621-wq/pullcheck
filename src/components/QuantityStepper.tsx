import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, typography } from '@/theme';

import { PressableScale } from './PressableScale';

type Props = {
  value: number;
  onChange: (value: number) => void;
  onRemoveRequest: () => void;
};

export function QuantityStepper({ value, onChange, onRemoveRequest }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();

  const decrease = () => {
    if (value <= 1) {
      onRemoveRequest();
      return;
    }
    haptics.tap();
    onChange(value - 1);
  };

  const increase = () => {
    haptics.tap();
    onChange(value + 1);
  };

  return (
    <View style={[styles.stepper, { backgroundColor: theme.colors.surfaceRaised }]}>
      <PressableScale
        onPress={decrease}
        scaleTo={0.85}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={value <= 1 ? 'Remove from collection' : 'Remove one copy'}
        style={styles.button}
      >
        <Ionicons name={value <= 1 ? 'trash-outline' : 'remove'} size={18} color={theme.colors.text} />
      </PressableScale>
      <Text style={[styles.value, { color: theme.colors.text }]} accessibilityLabel={`${value} copies`}>
        {value}
      </Text>
      <PressableScale
        onPress={increase}
        scaleTo={0.85}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Add one copy"
        style={styles.button}
      >
        <Ionicons name="add" size={18} color={theme.colors.text} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    padding: 2,
  },
  button: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...typography.label,
    minWidth: 28,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
