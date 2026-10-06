import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { GradientStops } from '@/theme';

import { Gloss } from './Gloss';

type Props = {
  colors?: GradientStops;
  style?: StyleProp<ViewStyle>;
};

export function GradientFill({ colors, style }: Props) {
  const theme = useTheme();
  const color = colors ? colors[Math.floor((colors.length - 1) / 2)] : theme.colors.accent;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color }, style]}>
      <Gloss />
    </View>
  );
}
