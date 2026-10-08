import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { SealedProduct } from '@/types/sealed';
import { getSealedMarketPrice } from '@/utils/sealed';
import { classifySealed, SEALED_TYPE_LABEL } from '@/utils/sealedType';
import { formatPrice } from '@/utils/price';

import { PressableScale } from './PressableScale';
import { ProductImage } from './ProductImage';

type Props = {
  products: SealedProduct[];
};

const TILE_WIDTH = 132;

export function SetSealed({ products }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          Sealed
        </Text>
        <Text style={styles.count}>{products.length === 1 ? '1 product' : `${products.length} products`}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {products.map((product) => {
          const price = getSealedMarketPrice(product);
          const type = classifySealed(product.name);
          return (
            <PressableScale
              key={product.productId}
              accessibilityRole="button"
              accessibilityLabel={product.name}
              onPress={() => {
                haptics.tap();
                router.push({
                  pathname: '/sealed/[id]',
                  params: {
                    id: String(product.productId),
                    groupId: String(product.groupId),
                    market: product.market ?? 'en',
                    ...(product.game ? { game: product.game } : {}),
                  },
                });
              }}
              style={styles.tile}
            >
              <View style={styles.art}>
                <ProductImage product={product} size={240} style={styles.image} transition={150} />
              </View>
              <Text style={styles.name} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.type} numberOfLines={1}>
                {type === 'other' ? 'Sealed' : SEALED_TYPE_LABEL[type]}
              </Text>
              <Text style={styles.price}>{price ? formatPrice(price) : 'No price'}</Text>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: {
      gap: spacing.md,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.heading,
      color: theme.colors.text,
    },
    count: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    row: {
      gap: spacing.md,
      paddingRight: spacing.md,
    },
    tile: {
      width: TILE_WIDTH,
      gap: 4,
      padding: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    art: {
      height: 112,
      borderRadius: radius.md,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    name: {
      ...typography.label,
      fontSize: 13,
      color: theme.colors.text,
    },
    type: {
      ...typography.caption,
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    price: {
      ...typography.label,
      fontSize: 14,
      color: theme.colors.price,
    },
  });
}
