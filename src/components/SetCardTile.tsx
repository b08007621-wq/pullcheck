import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { SetMode } from '@/types/set';
import { formatMoney } from '@/utils/price';
import { type SetEntry, variantPip } from '@/utils/setProgress';

import { PressableScale } from './PressableScale';

type Props = {
  entry: SetEntry;
  mode: SetMode;
  width: number;
  wished: boolean;
  onPress: (entry: SetEntry) => void;
};

function SetCardTileView({ entry, mode, width, wished, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const { card, slots, copies, complete, started } = entry;
  const price = tilePrice(entry);
  const height = width / (63 / 88);

  return (
    <PressableScale
      onPress={() => onPress(entry)}
      accessibilityRole="button"
      accessibilityLabel={`${card.name}, number ${card.number}, ${complete ? 'owned' : started ? 'partly owned' : 'missing'}`}
      style={{ width }}
    >
      <View style={[styles.frame, { height }, complete && styles.frameOwned]}>
        <Image
          source={card.images.small}
          style={[StyleSheet.absoluteFill, !started && styles.missing]}
          contentFit="cover"
          recyclingKey={card.id}
          transition={120}
        />
        {copies > 1 ? (
          <View style={styles.count}>
            <Text style={styles.countText}>×{copies}</Text>
          </View>
        ) : complete ? (
          <View style={styles.check}>
            <Ionicons name="checkmark" size={12} color={styles.checkIcon.color} />
          </View>
        ) : null}
        {wished && !complete ? (
          <View style={styles.heart}>
            <Ionicons name="heart" size={12} color={styles.heartIcon.color} />
          </View>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text style={styles.number} numberOfLines={1}>
          #{card.number}
        </Text>
        <Text style={[styles.price, !started && styles.priceMissing]} numberOfLines={1}>
          {price === null ? '—' : formatCompact(price)}
        </Text>
      </View>
      {mode === 'master' && slots.length > 1 ? (
        <View style={styles.pips}>
          {slots.map((slot) => (
            <View key={slot.variant ?? 'none'} style={[styles.pip, slot.owned > 0 && styles.pipOwned]}>
              <Text style={[styles.pipText, slot.owned > 0 && styles.pipTextOwned]}>{variantPip(slot.variant)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </PressableScale>
  );
}

export const SetCardTile = memo(SetCardTileView);

function tilePrice(entry: SetEntry): number | null {
  const missing = entry.slots.filter((slot) => slot.owned === 0 && slot.price !== null);
  const pool = missing.length > 0 ? missing : entry.slots.filter((slot) => slot.price !== null);
  return pool.length > 0 ? Math.min(...pool.map((slot) => slot.price ?? 0)) : null;
}

function formatCompact(amount: number): string {
  return amount >= 1000 ? `$${(amount / 1000).toFixed(1)}k` : formatMoney(amount);
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    frame: {
      borderRadius: radius.sm + 2,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    frameOwned: {
      borderColor: theme.colors.gain,
    },
    missing: {
      opacity: 0.28,
    },
    count: {
      position: 'absolute',
      top: 4,
      right: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(0,0,0,0.72)',
    },
    countText: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
      fontVariant: ['tabular-nums'],
    },
    check: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.gain,
    },
    checkIcon: {
      color: '#06210F',
    },
    heart: {
      position: 'absolute',
      top: 4,
      left: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    heartIcon: {
      color: theme.colors.accent,
    },
    meta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: spacing.xs,
      marginTop: 5,
    },
    number: {
      ...typography.caption,
      fontSize: 11,
      color: theme.colors.textMuted,
      flexShrink: 1,
    },
    price: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    priceMissing: {
      color: theme.colors.textFaint,
    },
    pips: {
      flexDirection: 'row',
      gap: 3,
      marginTop: 4,
    },
    pip: {
      minWidth: 18,
      height: 16,
      paddingHorizontal: 3,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    pipOwned: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    pipText: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.colors.textFaint,
    },
    pipTextOwned: {
      color: theme.colors.onAccent,
    },
  });
}
