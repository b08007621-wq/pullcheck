import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { FreshPull } from '@/state/celebrateContext';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { formatMoney } from '@/utils/price';

type Props = {
  pull: FreshPull;
  onOpenCard: (cardId: string) => void;
  onDismiss: () => void;
};

const TILE = 86;
const STAGGER_MS = 70;

export function FreshPullPanel({ pull, onOpenCard, onDismiss }: Props) {
  const styles = useThemedStyles(createStyles);
  const motion = useMotionEnabled();
  const total = useAnimatedNumber(pull.totalUsd, motion);

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Just pulled</Text>
          <Text style={styles.title} numberOfLines={1}>
            {pull.title}
          </Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.total}>{formatMoney(total)}</Text>
          <Text style={styles.count}>{pull.cards.length === 1 ? '1 card' : `${pull.cards.length} cards`}</Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide just pulled">
          <Ionicons name="close" size={20} color={styles.close.color} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {pull.cards.map((card, index) => (
          <PulledCard key={`${card.id}-${index}`} card={card} index={index} motion={motion} onPress={() => onOpenCard(card.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function PulledCard({
  card,
  index,
  motion,
  onPress,
}: {
  card: FreshPull['cards'][number];
  index: number;
  motion: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const [enter] = useState(() => new Animated.Value(motion ? 0 : 1));

  useEffect(() => {
    if (!motion) return;
    Animated.sequence([
      Animated.delay(index * STAGGER_MS),
      Animated.spring(enter, { toValue: 1, speed: 12, bounciness: 10, useNativeDriver: true }),
    ]).start();
  }, [enter, index, motion]);

  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const rise = enter.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  return (
    <Animated.View style={{ opacity: enter, transform: [{ translateY: rise }, { scale }] }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={card.name} style={styles.tile}>
        <View style={styles.image}>
          {card.image ? <Image source={card.image} style={styles.fill} contentFit="contain" /> : null}
        </View>
        <Text style={styles.price} numberOfLines={1}>
          {card.amount !== null ? formatMoney(card.amount) : '—'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    panel: {
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    headerText: {
      flex: 1,
      gap: 1,
    },
    kicker: {
      ...typography.caption,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    title: {
      ...typography.label,
      color: theme.colors.text,
    },
    totalBox: {
      alignItems: 'flex-end',
    },
    total: {
      ...typography.heading,
      color: theme.colors.gain,
      fontVariant: ['tabular-nums'],
    },
    count: {
      ...typography.caption,
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    close: {
      color: theme.colors.textMuted,
    },
    row: {
      gap: spacing.sm,
      paddingRight: spacing.sm,
    },
    tile: {
      width: TILE,
      gap: 3,
    },
    image: {
      width: TILE,
      height: TILE / (63 / 88),
      borderRadius: radius.sm,
      overflow: 'hidden',
    },
    fill: {
      width: '100%',
      height: '100%',
    },
    price: {
      ...typography.caption,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
  });
}
