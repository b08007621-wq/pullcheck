import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { SealedProduct } from '@/types/sealed';
import { getMsrp } from '@/utils/msrp';
import { getSealedMarketPrice } from '@/utils/sealed';
import { classifySealed, SEALED_TYPE_LABEL } from '@/utils/sealedType';

import { MsrpCompare } from './MsrpCompare';
import { OwnedBadge } from './OwnedBadge';
import { PressableScale } from './PressableScale';
import { PriceTag } from './PriceTag';

type Props = {
  product: SealedProduct;
  ownedQuantity: number;
  onPress: (product: SealedProduct) => void;
};

function SealedListItemView({ product, ownedQuantity, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const market = getSealedMarketPrice(product);

  return (
    <PressableScale
      onPress={() => onPress(product)}
      accessibilityRole="button"
      accessibilityLabel={product.name}
      style={styles.row}
    >
      <View style={styles.imageWrap}>
        <Image
          source={product.imageUrl}
          style={styles.image}
          contentFit="contain"
          transition={150}
          recyclingKey={String(product.productId)}
          accessibilityIgnoresInvertColors
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {product.cardNumber
            ? [`#${product.cardNumber}`, product.rarity, product.setName].filter(Boolean).join(' · ')
            : `${SEALED_TYPE_LABEL[classifySealed(product.name)]} · ${product.setName}`}
        </Text>
        {product.market !== 'jp' ? <MsrpCompare msrp={getMsrp(product)} market={market} /> : null}
        {ownedQuantity > 0 ? <OwnedBadge quantity={ownedQuantity} /> : null}
      </View>
      <PriceTag price={market} />
    </PressableScale>
  );
}

export const SealedListItem = memo(SealedListItemView);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
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
    imageWrap: {
      width: 72,
      height: 72,
      borderRadius: radius.md,
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
      padding: 4,
    },
    image: {
      flex: 1,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
    },
    meta: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
  });
}
