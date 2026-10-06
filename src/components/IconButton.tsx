import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { IconName } from '@/types/icon';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

type Props = {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
};

export function IconButton({ icon, onPress, accessibilityLabel, size = 40, color }: Props) {
  const theme = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      scaleTo={0.9}
    >
      <GlassSurface
        interactive
        style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Ionicons name={icon} size={size * 0.5} color={color ?? theme.colors.text} />
      </GlassSurface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
