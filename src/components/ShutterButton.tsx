import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

import { GradientFill } from './GradientFill';
import { PressableScale } from './PressableScale';

type Props = {
  onPress: () => void;
  busy: boolean;
  disabled: boolean;
};

const SIZE = 82;
const RING = 5;

export function ShutterButton({ onPress, busy, disabled }: Props) {
  const theme = useTheme();
  const [press] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.spring(press, {
      toValue: busy ? 0.82 : 1,
      speed: 20,
      bounciness: busy ? 0 : 12,
      useNativeDriver: true,
    }).start();
  }, [busy, press]);

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || busy}
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel="Take photo of card"
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={[styles.ring, disabled && styles.disabled]}
    >
      <GradientFill />
      <View style={styles.gap}>
        <Animated.View style={[styles.core, { transform: [{ scale: press }] }]}>
          {busy ? <ActivityIndicator color={theme.colors.accent} /> : null}
        </Animated.View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gap: {
    width: SIZE - RING * 2,
    height: SIZE - RING * 2,
    borderRadius: (SIZE - RING * 2) / 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: SIZE - RING * 4,
    height: SIZE - RING * 4,
    borderRadius: (SIZE - RING * 4) / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
