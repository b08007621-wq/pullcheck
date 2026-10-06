import { Image, type ImageStyle } from 'expo-image';
import { useState } from 'react';
import type { StyleProp } from 'react-native';

import { useProductRender } from '@/hooks/useProductRender';
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
  const render = useProductRender(product);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const art = render.url && !failed.art ? render.url : null;
  const cutout = !art && !failed.cutout && !product.cardNumber;
  const source = !render.settled
    ? null
    : art ?? (cutout ? apiUrl(`/api/product-cutout?product=${product.productId}&size=${size}`) : largeProductImage(product.imageUrl));
  const stage = art ? 'art' : cutout ? 'cutout' : 'photo';

  return (
    <Image
      source={source}
      style={style}
      contentFit="contain"
      transition={transition}
      recyclingKey={`${product.productId}:${stage}`}
      onError={stage === 'photo' ? undefined : () => setFailed((value) => ({ ...value, [stage]: true }))}
      accessibilityLabel={product.name}
      accessibilityIgnoresInvertColors
    />
  );
}
