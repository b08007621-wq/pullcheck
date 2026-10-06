import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import type { Card } from '@/types/card';
import { cardVersionPrice, defaultVersion } from '@/utils/cardVersion';
import { formatPrice, variantLabel } from '@/utils/price';
import { CARD_RATIO } from '@/utils/scanFrame';

type Props = {
  media?: ReactNode;
  name: string;
  image: string | null;
  setName: string;
  number: string;
  card: Card | null;
  failed: boolean;
};

const IMAGE_HEIGHT = 236;

export function ScanResultBody({ media, name, image, setName, number, card, failed }: Props) {
  const theme = useTheme();
  const version = card ? defaultVersion(card) : null;
  const price = card && version ? cardVersionPrice(card, version) : null;
  const priceCaption = price
    ? [price.currency === 'EUR' ? 'Cardmarket trend' : 'TCGplayer market', version?.variant ? variantLabel(version.variant) : null]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <View style={styles.body}>
      {media ?? (
        <View style={[styles.imageFrame, { backgroundColor: theme.colors.surfaceRaised }]}>
          {image ? (
            <Image
              source={image}
              style={styles.image}
              contentFit="cover"
              transition={180}
              recyclingKey={image}
              accessibilityLabel={name}
            />
          ) : null}
        </View>
      )}
      <View style={styles.text}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={[styles.meta, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {setName} · #{number}
        </Text>
      </View>
      <View style={styles.priceBlock}>
        {card ? (
          price ? (
            <>
              <Text style={[styles.price, { color: theme.colors.price }]}>{formatPrice(price)}</Text>
              <Text style={[styles.caption, { color: theme.colors.textFaint }]}>{priceCaption}</Text>
            </>
          ) : (
            <Text style={[styles.caption, { color: theme.colors.textMuted }]}>No TCGplayer price yet</Text>
          )
        ) : failed ? (
          <Text style={[styles.caption, { color: theme.colors.textMuted }]}>Couldn’t load the price</Text>
        ) : (
          <ActivityIndicator color={theme.colors.textMuted} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    gap: spacing.md,
  },
  imageFrame: {
    height: IMAGE_HEIGHT,
    width: IMAGE_HEIGHT * CARD_RATIO,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  text: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.lg,
  },
  name: {
    ...typography.heading,
    fontSize: 22,
    textAlign: 'center',
  },
  meta: {
    ...typography.caption,
    fontSize: 14,
  },
  priceBlock: {
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
  price: {
    fontSize: 30,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  caption: {
    ...typography.caption,
  },
});
