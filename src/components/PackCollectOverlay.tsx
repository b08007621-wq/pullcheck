import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useHaptics } from '@/hooks/useHaptics';
import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { Pull } from '@/types/rip';
import { formatMoney } from '@/utils/price';
import { pullPrice } from '@/utils/rip';

type Props = {
  pulls: Pull[];
  title: string;
  totalUsd: number;
  bestId: string | null;
  onDone: () => void;
};

const DEAL_STAGGER_MS = 120;
const HOLD_MS = 1100;
const GATHER_STAGGER_MS = 45;
const GATHER_MS = 520;
const MAX_SHOWN = 15;

export function PackCollectOverlay({ pulls, title, totalUsd, bestId, onDone }: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const motion = useMotionEnabled();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const shown = pulls.slice(0, MAX_SHOWN);
  const columns = shown.length > 9 ? 4 : 3;
  const gap = spacing.sm;
  const cardWidth = Math.min(118, (width - spacing.lg * 2 - gap * (columns - 1)) / columns);
  const cardHeight = cardWidth / (63 / 88);
  const [backdrop] = useState(() => new Animated.Value(0));
  const [deals] = useState(() => shown.map(() => new Animated.Value(motion ? 0 : 1)));
  const [gathers] = useState(() => shown.map(() => new Animated.Value(0)));
  const [counting, setCounting] = useState(false);
  const total = useAnimatedNumber(counting ? totalUsd : 0, motion);
  const finished = useRef(false);
  const gathering = useRef(false);
  const [layout, setLayout] = useState<{ x: number; y: number }[]>([]);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  const gather = useCallback(() => {
    if (gathering.current) return;
    gathering.current = true;
    haptics.collect();
    if (!motion) {
      finish();
      return;
    }
    Animated.stagger(
      GATHER_STAGGER_MS,
      gathers.map((value) =>
        Animated.timing(value, { toValue: 1, duration: GATHER_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ),
    ).start(() => finish());
  }, [finish, gathers, haptics, motion]);

  useEffect(() => {
    Animated.timing(backdrop, { toValue: 1, duration: motion ? 260 : 0, useNativeDriver: true }).start();
    if (!motion) {
      const timer = setTimeout(gather, 600);
      return () => clearTimeout(timer);
    }
    const ticks = deals.map((_, index) => setTimeout(() => haptics.selection(), 200 + index * DEAL_STAGGER_MS));
    const countTimer = setTimeout(() => setCounting(true), 260);
    const animation = Animated.sequence([
      Animated.delay(180),
      Animated.stagger(
        DEAL_STAGGER_MS,
        deals.map((value) => Animated.spring(value, { toValue: 1, speed: 11, bounciness: 9, useNativeDriver: true })),
      ),
      Animated.delay(HOLD_MS),
    ]);
    animation.start(({ finished: done }) => {
      if (done) gather();
    });
    return () => {
      animation.stop();
      ticks.forEach(clearTimeout);
      clearTimeout(countTimer);
    };
  }, [backdrop, deals, gather, haptics, motion]);

  const targetX = width * 0.83;
  const targetY = height + 30;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdrop }]}>
      <BlurView tint="dark" intensity={50} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
      <Pressable
        style={[styles.stage, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
        onPress={gather}
        accessibilityRole="button"
        accessibilityLabel="Add these cards to your collection"
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Pack opened</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.total}>{formatMoney(total)}</Text>
          <Text style={styles.count}>
            {pulls.length === 1 ? '1 card going into your collection' : `${pulls.length} cards going into your collection`}
          </Text>
        </View>
        <View
          style={[styles.grid, { gap }]}
          onLayout={(event) => setOrigin({ x: event.nativeEvent.layout.x, y: event.nativeEvent.layout.y })}
        >
          {shown.map((pull, index) => {
            const deal = deals[index] as Animated.Value;
            const travel = gathers[index] as Animated.Value;
            const spot = layout[index];
            const dx = spot ? targetX - (origin.x + spot.x + cardWidth / 2) : 0;
            const dy = spot ? targetY - (origin.y + spot.y + cardHeight / 2) : height;
            const price = pullPrice(pull);
            const best = pull.id === bestId;
            const rotateY = deal.interpolate({ inputRange: [0, 1], outputRange: ['85deg', '0deg'] });
            const lift = deal.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
            const grow = deal.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
            const flyX = travel.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
            const flyY = travel.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
            const shrink = travel.interpolate({ inputRange: [0, 1], outputRange: [1, 0.18] });
            const spin = travel.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-22deg'] });
            const fade = travel.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
            return (
              <View
                key={pull.id}
                onLayout={(event) => {
                  const { x, y } = event.nativeEvent.layout;
                  setLayout((current) => {
                    const next = [...current];
                    next[index] = { x, y };
                    return next;
                  });
                }}
                style={{ width: cardWidth }}
              >
                <Animated.View
                  style={{
                    opacity: Animated.multiply(deal, fade),
                    transform: [
                      { translateX: flyX },
                      { translateY: Animated.add(lift, flyY) },
                      { perspective: 800 },
                      { rotateY },
                      { rotate: spin },
                      { scale: Animated.multiply(grow, shrink) },
                    ],
                  }}
                >
                  <View style={best ? styles.glow : null}>
                    <View style={[styles.card, { width: cardWidth, height: cardHeight }, best && styles.best]}>
                      <Image source={pull.card.images.small} style={styles.fill} contentFit="contain" />
                    </View>
                  </View>
                  <Text style={[styles.price, best && styles.bestPrice]} numberOfLines={1}>
                    {price ? formatMoney(price.amount, price.currency) : '—'}
                  </Text>
                </Animated.View>
              </View>
            );
          })}
        </View>
        {pulls.length > MAX_SHOWN ? <Text style={styles.more}>{`+${pulls.length - MAX_SHOWN} more`}</Text> : null}
        <Text style={styles.hint}>Tap to skip</Text>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    dim: {
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    stage: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    header: {
      alignItems: 'center',
      gap: 2,
    },
    kicker: {
      ...typography.caption,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    title: {
      ...typography.label,
      color: '#FFFFFF',
    },
    total: {
      fontSize: 44,
      fontWeight: '800',
      color: theme.colors.gain,
      fontVariant: ['tabular-nums'],
    },
    count: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.75)',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    card: {
      borderRadius: radius.sm,
      overflow: 'hidden',
    },
    best: {
      borderWidth: 2,
      borderColor: theme.colors.accent,
    },
    glow: {
      borderRadius: radius.sm,
      shadowColor: theme.colors.accent,
      shadowOpacity: 0.9,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 0 },
    },
    fill: {
      width: '100%',
      height: '100%',
    },
    price: {
      ...typography.caption,
      fontWeight: '700',
      color: '#FFFFFF',
      textAlign: 'center',
      paddingTop: 3,
      fontVariant: ['tabular-nums'],
    },
    bestPrice: {
      color: theme.colors.accent,
    },
    more: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.75)',
    },
    hint: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.5)',
    },
  });
}
