import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useTheme } from '@/hooks/useTheme';
import { radius } from '@/theme';
import type { CelebrateBurst, CelebrateRect } from '@/state/celebrateContext';
import { formatMoney } from '@/utils/price';

type Props = {
  burst: CelebrateBurst;
  target: { x: number; y: number } | null;
  onArrive: (burst: CelebrateBurst) => void;
  onLand: (burst: CelebrateBurst) => void;
};

const CARD_WIDTH = 120;
const LANDED_WIDTH = 22;
const ARC = 90;
const FLIGHT_MS = 860;
const FLOAT_MS = 1150;

export function FlyingBurst({ burst, target, onArrive, onLand }: Props) {
  const theme = useTheme();
  const motion = useMotionEnabled();
  const { width, height } = useWindowDimensions();
  const [pop] = useState(() => new Animated.Value(0.6));
  const [flight] = useState(() => new Animated.Value(0));
  const [float] = useState(() => new Animated.Value(0));
  const from = burst.from ?? centered(width, height);
  const goal = target ?? { x: width * 0.83, y: height - 48 };
  const dx = goal.x - (from.x + from.width / 2);
  const dy = goal.y - (from.y + from.height / 2);
  const shrink = LANDED_WIDTH / Math.max(from.width, 1);
  const flies = burst.fly && burst.image !== null;

  useEffect(() => {
    if (!motion) {
      const timer = setTimeout(() => {
        onArrive(burst);
        onLand(burst);
      }, burst.delay);
      return () => clearTimeout(timer);
    }
    const travel = Animated.sequence([
      Animated.delay(burst.delay),
      Animated.timing(pop, { toValue: 1.15, duration: 140, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
      Animated.timing(flight, {
        toValue: 1,
        duration: FLIGHT_MS,
        easing: Easing.bezier(0.5, 0, 0.3, 1),
        useNativeDriver: true,
      }),
    ]);
    const rise = Animated.sequence([
      Animated.delay(burst.delay),
      Animated.timing(float, { toValue: 1, duration: FLOAT_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    let settled = 0;
    const settle = () => {
      settled += 1;
      if (settled === 2) onLand(burst);
    };
    travel.start(({ finished }) => {
      if (!finished) return;
      onArrive(burst);
      settle();
    });
    rise.start(({ finished }) => {
      if (finished) settle();
    });
    return () => {
      travel.stop();
      rise.stop();
    };
  }, [burst, motion, onArrive, onLand, pop, flight, float]);

  const translateX = flight.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = flight.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, dy * 0.2 - ARC, dy] });
  const travel = flight.interpolate({ inputRange: [0, 1], outputRange: [1, shrink] });
  const rotate = flight.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-16deg'] });
  const opacity = flight.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });
  const rise = float.interpolate({ inputRange: [0, 1], outputRange: [0, -64] });
  const fade = float.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 1, 0] });

  return (
    <>
      {flies ? (
        <Animated.View
          style={[
            styles.card,
            {
              left: from.x,
              top: from.y,
              width: from.width,
              height: from.height,
              shadowColor: theme.colors.accent,
              opacity,
              transform: [{ translateX }, { translateY }, { scale: Animated.multiply(pop, travel) }, { rotate }],
            },
          ]}
        >
          <Image source={burst.image} style={styles.image} contentFit="contain" />
        </Animated.View>
      ) : null}
      {burst.amount !== null && burst.amount > 0 ? (
        <Animated.View
          style={[
            styles.amountWrap,
            { left: from.x - 40, width: from.width + 80, top: from.y - 12, opacity: fade, transform: [{ translateY: rise }] },
          ]}
        >
          <View style={[styles.amountPill, { backgroundColor: theme.colors.gain }]}>
            <Text style={[styles.amount, { color: theme.colors.background }]}>{`+${formatMoney(burst.amount)}`}</Text>
          </View>
        </Animated.View>
      ) : null}
    </>
  );
}

function centered(width: number, height: number): CelebrateRect {
  const cardHeight = CARD_WIDTH / (63 / 88);
  return { x: (width - CARD_WIDTH) / 2, y: height * 0.32, width: CARD_WIDTH, height: cardHeight };
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderRadius: radius.sm,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
  },
  amountWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  amountPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  amount: {
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
