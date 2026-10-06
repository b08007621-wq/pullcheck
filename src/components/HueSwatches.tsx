import { StyleSheet, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { hsl } from '@/theme';

import { PressableScale } from './PressableScale';

type Props = {
  hues: number[];
  value: number;
  saturation: number;
  lightness: number;
  onSelect: (hue: number) => void;
};

const SIZE = 30;

export function HueSwatches({ hues, value, saturation, lightness, onSelect }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();

  return (
    <View style={styles.row}>
      {hues.map((hue) => {
        const selected = Math.abs(hue - value) < 3;
        return (
          <PressableScale
            key={hue}
            scaleTo={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Color hue ${hue}`}
            accessibilityState={{ selected }}
            onPress={() => {
              haptics.selection();
              onSelect(hue);
            }}
            style={[
              styles.ring,
              { borderColor: selected ? theme.colors.text : 'transparent' },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: hsl(hue, saturation, lightness) }]} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ring: {
    width: SIZE + 8,
    height: SIZE + 8,
    borderRadius: (SIZE + 8) / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
});
