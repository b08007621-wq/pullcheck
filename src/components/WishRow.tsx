import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { WishItem } from '@/types/wishlist';
import { formatCollectorNumber } from '@/utils/card';
import { versionLabel } from '@/utils/cardVersion';
import { formatMoney } from '@/utils/price';
import { wishStatus } from '@/utils/wishlist';

import { ListRow, type RowPosition } from './ListRow';

type Props = {
  wish: WishItem;
  position: RowPosition;
  onPress: (wish: WishItem) => void;
  onRemove: (wish: WishItem) => void;
};

function WishRowView({ wish, position, onPress, onRemove }: Props) {
  const styles = useThemedStyles(createStyles);
  const status = wishStatus(wish);
  const version = versionLabel(wish.card, { variant: wish.variant, condition: 'NM' }, 'short');
  const subtitle = [`${wish.card.set.name} · #${formatCollectorNumber(wish.card)}`, version].filter(Boolean).join(' · ');

  return (
    <ListRow position={position} inset={70}>
      <View style={styles.row}>
        <View style={styles.mainWrap}>
          <Pressable
            onPress={() => onPress(wish)}
            accessibilityRole="button"
            accessibilityLabel={`${wish.card.name}${status.hit ? ', below your target' : ''}`}
            style={({ pressed }) => [styles.main, pressed && styles.pressed]}
          >
            <Image
              source={wish.card.images.small}
              style={styles.image}
              contentFit="contain"
              recyclingKey={wish.id}
              accessibilityIgnoresInvertColors
            />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {wish.card.name}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
              {status.hit ? (
                <View style={styles.badge}>
                  <Ionicons name="pricetag" size={11} color={styles.badgeText.color} />
                  <Text style={styles.badgeText}>Under target</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.values}>
              <Text style={[styles.price, status.hit && styles.priceHit]}>
                {status.price !== null ? formatMoney(status.price) : 'No price'}
              </Text>
              <Text style={styles.target}>
                {wish.target !== null ? `Target ${formatMoney(wish.target)}` : 'No target'}
              </Text>
            </View>
          </Pressable>
        </View>
        <Pressable
          onPress={() => onRemove(wish)}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${wish.card.name} from wishlist`}
          hitSlop={10}
        >
          <Ionicons name="close-circle" size={22} color={styles.remove.color} />
        </Pressable>
      </View>
    </ListRow>
  );
}

export const WishRow = memo(WishRowView);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingRight: spacing.lg,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    mainWrap: {
      flex: 1,
    },
    main: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingLeft: spacing.md,
    },
    image: {
      width: 46,
      height: 64,
      borderRadius: radius.sm - 2,
    },
    info: {
      flex: 1,
      gap: 3,
    },
    name: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: theme.colors.textFaint,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.gain,
    },
    badgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.gain,
    },
    values: {
      alignItems: 'flex-end',
      gap: 3,
    },
    price: {
      ...typography.label,
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    priceHit: {
      color: theme.colors.gain,
    },
    target: {
      ...typography.caption,
      fontSize: 12,
      color: theme.colors.textFaint,
      fontVariant: ['tabular-nums'],
    },
    remove: {
      color: theme.colors.textFaint,
    },
  });
}
