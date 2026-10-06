import { Image } from 'expo-image';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius } from '@/theme';
import type { SealedProduct } from '@/types/sealed';
import { largeProductImage } from '@/utils/sealed';

import { PressableScale } from './PressableScale';

type Props = {
  product: SealedProduct;
  onPress?: () => void;
};

const CARD_RATIO = 63 / 88;

export function ProductHero({ product, onPress }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const single = Boolean(product.cardNumber);
  const size = Math.min(width * 0.72, 340);
  const frame = single
    ? { width: Math.min(width * 0.7, 340), height: Math.min(width * 0.7, 340) / CARD_RATIO }
    : { width: size, height: size };

  return (
    <View style={styles.wrap}>
      <PressableScale
        onPress={onPress}
        disabled={!onPress}
        scaleTo={0.98}
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityHint={onPress ? 'Opens it in 3D' : undefined}
        style={[single ? styles.cardFrame : styles.frame, frame, { shadowColor: theme.colors.accent }]}
      >
        <Image
          source={largeProductImage(product.imageUrl)}
          placeholder={product.imageUrl}
          placeholderContentFit="contain"
          style={styles.image}
          contentFit="contain"
          transition={250}
          accessibilityLabel={product.name}
        />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  frame: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg + 8,
    padding: 14,
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  cardFrame: {
    shadowOpacity: 0.6,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  image: {
    flex: 1,
  },
});
