import { Image, type ImageStyle } from 'expo-image';
import { useState } from 'react';
import type { StyleProp } from 'react-native';

import { apiUrl } from '@/services/apiBase';
import { largeProductImage } from '@/utils/sealed';
import type { SealedProduct } from '@/types/sealed';

type Props = {
  product: SealedProduct;
  size: number;
  style?: StyleProp<ImageStyle>;
  transition?: number;
};

export function ProductImage({ product, size, style, transition = 200 }: Props) {
  const [failed, setFailed] = useState(false);
  const cutout = !failed && !product.cardNumber;
  const source = cutout
    ? apiUrl(`/api/product-cutout?product=${product.productId}&size=${size}`)
    : largeProductImage(product.imageUrl);

  return (
    <Image
      source={source}
      style={style}
      contentFit="contain"
      transition={transition}
      recyclingKey={String(product.productId)}
      onError={cutout ? () => setFailed(true) : undefined}
      accessibilityLabel={product.name}
      accessibilityIgnoresInvertColors
    />
  );
}
