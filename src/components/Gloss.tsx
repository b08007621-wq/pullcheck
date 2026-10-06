import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

type Props = {
  strength?: number;
};

export function Gloss({ strength = 1 }: Props) {
  const theme = useTheme();
  if (!theme.gloss) return null;

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[`rgba(255,255,255,${0.62 * strength})`, `rgba(255,255,255,${0.14 * strength})`, 'rgba(255,255,255,0)']}
      locations={[0, 0.48, 0.5]}
      style={[StyleSheet.absoluteFill, styles.gloss]}
    />
  );
}

const styles = StyleSheet.create({
  gloss: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.8)',
  },
});
