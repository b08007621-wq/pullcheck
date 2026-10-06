import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

type Props = {
  trigger: number;
};

type Particle = {
  x: number;
  y: number;
  size: number;
};

const PARTICLE_COUNT = 16;
const BURST_MS = 700;

const PARTICLES: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2 + (index % 2) * 0.2;
  const distance = 70 + (index % 4) * 18;
  return {
    x: Math.cos(angle) * distance * 1.6,
    y: Math.sin(angle) * distance * 0.75,
    size: 6 + (index % 3) * 3,
  };
});

export function SparkleBurst({ trigger }: Props) {
  const theme = useTheme();
  const [progress] = useState(() => new Animated.Value(1));
  const palette = [...theme.gradient, theme.colors.accent, theme.colors.text];

  useEffect(() => {
    if (trigger === 0) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: BURST_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [trigger, progress]);

  const opacity = progress.interpolate({ inputRange: [0, 0.08, 0.7, 1], outputRange: [0, 1, 0.8, 0] });
  const scale = progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.3, 1.25, 0.2] });

  return (
    <View pointerEvents="none" style={styles.layer}>
      {PARTICLES.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              backgroundColor: palette[index % palette.length],
              opacity,
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.x] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.y] }) },
                { scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  particle: {
    position: 'absolute',
  },
});
