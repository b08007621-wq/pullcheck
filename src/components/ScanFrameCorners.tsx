import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useTheme } from '@/hooks/useTheme';
import type { Rect } from '@/types/scan';

type Props = {
  frame: Rect;
  locked: boolean;
  cornerRadius: number;
};

const ARM = 34;
const STROKE = 4;
const CORNERS = [
  { key: 'tl', top: true, left: true },
  { key: 'tr', top: true, left: false },
  { key: 'bl', top: false, left: true },
  { key: 'br', top: false, left: false },
] as const;

export function ScanFrameCorners({ frame, locked, cornerRadius }: Props) {
  const theme = useTheme();
  const motion = useMotionEnabled();
  const [breathe] = useState(() => new Animated.Value(0));
  const [lock] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!motion || locked) {
      breathe.setValue(0);
      return;
    }
    const step = (toValue: number) =>
      Animated.timing(breathe, {
        toValue,
        duration: 1400,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([step(1), step(0)]), { resetBeforeIteration: false });
    loop.start();
    return () => loop.stop();
  }, [motion, locked, breathe]);

  useEffect(() => {
    Animated.spring(lock, {
      toValue: locked ? 1 : 0,
      speed: 22,
      bounciness: locked ? 10 : 0,
      useNativeDriver: true,
    }).start();
  }, [locked, lock]);

  const scale = Animated.add(
    breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }),
    lock.interpolate({ inputRange: [0, 1], outputRange: [0, -0.05] }),
  );
  const color = locked ? '#FFFFFF' : theme.colors.accent;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.frame,
        { left: frame.x, top: frame.y, width: frame.width, height: frame.height, transform: [{ scale }] },
      ]}
    >
      {CORNERS.map((corner) => (
        <View
          key={corner.key}
          style={[
            styles.corner,
            {
              borderColor: color,
              shadowColor: color,
              borderTopWidth: corner.top ? STROKE : 0,
              borderBottomWidth: corner.top ? 0 : STROKE,
              borderLeftWidth: corner.left ? STROKE : 0,
              borderRightWidth: corner.left ? 0 : STROKE,
              borderTopLeftRadius: corner.top && corner.left ? cornerRadius : 0,
              borderTopRightRadius: corner.top && !corner.left ? cornerRadius : 0,
              borderBottomLeftRadius: !corner.top && corner.left ? cornerRadius : 0,
              borderBottomRightRadius: !corner.top && !corner.left ? cornerRadius : 0,
            },
            corner.top ? { top: 0 } : { bottom: 0 },
            corner.left ? { left: 0 } : { right: 0 },
          ]}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
  },
  corner: {
    position: 'absolute',
    width: ARM,
    height: ARM,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
