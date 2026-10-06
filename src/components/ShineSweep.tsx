import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { useMotionEnabled } from '@/hooks/useMotionEnabled';

type Props = {
  width: number;
  height: number;
  delayMs?: number;
};

const SWEEP_MS = 1100;
const PAUSE_MS = 2600;

export function ShineSweep({ width, height, delayMs = 300 }: Props) {
  const motion = useMotionEnabled();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!motion) return;
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(progress, {
          toValue: 1,
          duration: SWEEP_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(PAUSE_MS),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [motion, delayMs, progress]);

  if (!motion || width === 0) return null;

  const bandWidth = width * 0.45;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-bandWidth * 1.6, width + bandWidth * 0.6],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.band,
        {
          width: bandWidth,
          height: height * 1.6,
          top: -height * 0.3,
          transform: [{ translateX }, { rotate: '18deg' }],
        },
      ]}
    >
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 0,
  },
});
