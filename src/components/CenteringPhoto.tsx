import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CenterBox } from '@/services/ocrBridge';
import { type AppTheme, radius } from '@/theme';
import { withAlpha } from '@/theme/color';
import type { Size } from '@/types/scan';
import type { Centering } from '@/utils/centering';

type Props = {
  image: string;
  aspect: number;
  outer: CenterBox | null;
  inner: CenterBox | null;
  centering: Centering | null;
};

const PILL_WIDTH = 34;
const PILL_HEIGHT = 20;

export function CenteringPhoto({ image, aspect, outer, inner, centering }: Props) {
  const styles = useThemedStyles(createStyles);
  const motion = useMotionEnabled();
  const [size, setSize] = useState<Size | null>(null);
  const [reveal] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!motion) {
      reveal.setValue(1);
      rise.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(rise, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(reveal, {
        toValue: 1,
        duration: 520,
        delay: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [motion, reveal, rise]);

  const marks = size && outer && inner && centering ? layoutMarks(size, outer, inner, centering) : null;

  return (
    <Animated.View
      style={[
        styles.frame,
        { aspectRatio: aspect },
        {
          opacity: rise,
          transform: [{ scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
        },
      ]}
      onLayout={(event) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
      accessibilityLabel={
        centering
          ? `Card photo with borders marked. Left ${centering.leftRight}, right ${100 - centering.leftRight}, top ${centering.topBottom}, bottom ${100 - centering.topBottom}.`
          : 'Card photo'
      }
    >
      <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="fill" />
      {marks ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: reveal }]} pointerEvents="none">
          {marks.bands.map((band) => (
            <View key={band.key} style={[styles.band, band.rect]} />
          ))}
          <View style={[styles.outerLine, marks.outer]} />
          <View style={[styles.innerLine, marks.inner]} />
          {marks.pills.map((pill) => (
            <View key={pill.key} style={[styles.pill, { left: pill.x - PILL_WIDTH / 2, top: pill.y - PILL_HEIGHT / 2 }]}>
              <Text style={styles.pillText}>{pill.label}</Text>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function layoutMarks(size: Size, outer: CenterBox, inner: CenterBox, centering: Centering) {
  const W = size.width;
  const H = size.height;
  const rect = (x0: number, y0: number, x1: number, y1: number) => ({
    left: x0 * W,
    top: y0 * H,
    width: Math.max(1, (x1 - x0) * W),
    height: Math.max(1, (y1 - y0) * H),
  });
  const midX = ((inner.x0 + inner.x1) / 2) * W;
  const midY = ((inner.y0 + inner.y1) / 2) * H;
  return {
    bands: [
      { key: 'left', rect: rect(outer.x0, outer.y0, inner.x0, outer.y1) },
      { key: 'right', rect: rect(inner.x1, outer.y0, outer.x1, outer.y1) },
      { key: 'top', rect: rect(inner.x0, outer.y0, inner.x1, inner.y0) },
      { key: 'bottom', rect: rect(inner.x0, inner.y1, inner.x1, outer.y1) },
    ],
    outer: rect(outer.x0, outer.y0, outer.x1, outer.y1),
    inner: rect(inner.x0, inner.y0, inner.x1, inner.y1),
    pills: [
      { key: 'left', x: ((outer.x0 + inner.x0) / 2) * W + PILL_WIDTH / 2 - 2, y: midY, label: String(centering.leftRight) },
      {
        key: 'right',
        x: ((inner.x1 + outer.x1) / 2) * W - PILL_WIDTH / 2 + 2,
        y: midY,
        label: String(100 - centering.leftRight),
      },
      { key: 'top', x: midX, y: ((outer.y0 + inner.y0) / 2) * H + PILL_HEIGHT / 2 - 2, label: String(centering.topBottom) },
      {
        key: 'bottom',
        x: midX,
        y: ((inner.y1 + outer.y1) / 2) * H - PILL_HEIGHT / 2 + 2,
        label: String(100 - centering.topBottom),
      },
    ],
  };
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    frame: {
      width: '100%',
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceRaised,
    },
    band: {
      position: 'absolute',
      backgroundColor: withAlpha(theme.colors.accent, 0.42),
    },
    outerLine: {
      position: 'absolute',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.85)',
    },
    innerLine: {
      position: 'absolute',
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
    },
    pill: {
      position: 'absolute',
      width: PILL_WIDTH,
      height: PILL_HEIGHT,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
    },
    pillText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.colors.onAccent,
      fontVariant: ['tabular-nums'],
    },
  });
}
