import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useTheme } from '@/hooks/useTheme';
import type { Rect } from '@/types/scan';

type Props = {
  frame: Rect;
  visible: boolean;
};

const SWEEP_MS = 2200;
const BEAM_HEIGHT = 56;

export function ScanLine({ frame, visible }: Props) {
  const theme = useTheme();
  const motion = useMotionEnabled();
  const [progress] = useState(() => new Animated.Value(0));
  const active = visible && motion;

  useEffect(() => {
    if (!active) return;
    progress.setValue(0);
    const sweep = (toValue: number) =>
      Animated.timing(progress, {
        toValue,
        duration: SWEEP_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([sweep(1), sweep(0)]), { resetBeforeIteration: false });
    loop.start();
    return () => loop.stop();
  }, [active, progress]);

  if (!active) return null;

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, frame.height - BEAM_HEIGHT],
  });
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.beam,
        { left: frame.x + 10, top: frame.y, width: frame.width - 20, opacity, transform: [{ translateY }] },
      ]}
    >
      <LinearGradient
        colors={['transparent', `${theme.colors.accent}55`, 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', theme.colors.accent, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.line}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  beam: {
    position: 'absolute',
    height: BEAM_HEIGHT,
    justifyContent: 'center',
  },
  line: {
    height: 2,
  },
});
