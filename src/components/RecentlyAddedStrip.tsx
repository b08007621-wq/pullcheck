import { Image } from 'expo-image';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { CollectionItem } from '@/types/collection';
import { itemPrice, itemTitle } from '@/utils/collectionValue';
import { formatRelativeTime } from '@/utils/date';
import { formatPrice } from '@/utils/price';

import { PressableScale } from './PressableScale';
import { ProductImage } from './ProductImage';
import { SectionPanel } from './SectionPanel';

type Props = {
  items: CollectionItem[];
  onOpen: (item: CollectionItem) => void;
  onLongPress: (item: CollectionItem) => void;
};

const COUNT = 12;
const TILE = 74;

export function RecentlyAddedStrip({ items, onOpen, onLongPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const recent = useMemo(
    () => [...items].sort((first, second) => second.lastAddedAt.localeCompare(first.lastAddedAt)).slice(0, COUNT),
    [items],
  );
  if (recent.length === 0) return null;

  return (
    <SectionPanel title="Recently added">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {recent.map((item) => {
          const price = itemPrice(item);
          return (
            <PressableScale
              key={item.key}
              onPress={() => onOpen(item)}
              onLongPress={() => onLongPress(item)}
              delayLongPress={320}
              accessibilityRole="button"
              accessibilityLabel={itemTitle(item)}
              style={styles.tile}
            >
              <View style={styles.image}>
                {item.kind === 'card' ? (
                  <Image source={item.card.images.small} style={styles.fill} contentFit="contain" recyclingKey={item.key} />
                ) : (
                  <ProductImage product={item.product} size={160} style={styles.fill} />
                )}
              </View>
              <Text style={styles.price} numberOfLines={1}>
                {price ? formatPrice(price) : '—'}
              </Text>
              <Text style={styles.when} numberOfLines={1}>
                {formatRelativeTime(item.lastAddedAt)}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>
    </SectionPanel>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      gap: spacing.md,
      paddingRight: spacing.sm,
    },
    tile: {
      width: TILE,
      gap: 2,
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
    when: {
      ...typography.caption,
      fontSize: 11,
      color: theme.colors.textFaint,
      textAlign: 'center',
    },
  });
}
