import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing } from '@/theme';

type Props = {
  count?: number;
  imageShape?: 'card' | 'square';
};

export function SkeletonRows({ count = 6, imageShape = 'card' }: Props) {
  const styles = useThemedStyles(createStyles);
  const motion = useMotionEnabled();
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!motion) return;
    const step = (toValue: number) =>
      Animated.timing(pulse, {
        toValue,
        duration: 750,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([step(1), step(0)]), { resetBeforeIteration: false });
    loop.start();
    return () => loop.stop();
  }, [motion, pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });

  return (
    <View style={styles.list} accessibilityRole="progressbar" accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, index) => (
        <Animated.View key={index} style={[styles.row, { opacity }]}>
          <View style={[styles.block, imageShape === 'card' ? styles.cardImage : styles.squareImage]} />
          <View style={styles.lines}>
            <View style={[styles.block, styles.line, { width: `${70 - (index % 3) * 12}%` }]} />
            <View style={[styles.block, styles.line, styles.short]} />
            <View style={[styles.block, styles.line, styles.shorter]} />
          </View>
          <View style={[styles.block, styles.price]} />
        </Animated.View>
      ))}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    list: {
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.sm,
      paddingRight: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    block: {
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: radius.sm,
    },
    cardImage: {
      width: 60,
      height: 84,
    },
    squareImage: {
      width: 72,
      height: 72,
    },
    lines: {
      flex: 1,
      gap: spacing.sm,
    },
    line: {
      height: 12,
    },
    short: {
      width: '45%',
    },
    shorter: {
      width: '30%',
      height: 10,
    },
    price: {
      width: 56,
      height: 16,
    },
  });
}
