import type { CardBack } from '@/three/cardBack';
import { cardFinish, singleFinish } from '@/three/cardFinish';
import type { ModelKind } from '@/three/models';
import type { Card } from '@/types/card';
import type { SealedProduct } from '@/types/sealed';

import { singleBack } from './cardBack';
import { largeProductImage } from './sealed';
import { productModelKind } from './sealedType';

export type ViewerParams = {
  kind: ModelKind;
  image: string;
  title: string;
  subtitle: string;
  product?: string;
  foil?: string;
  border?: string;
  era?: string;
  back?: CardBack;
};

export function cardViewerParams(card: Card, variant?: string | null): ViewerParams {
  const finish = cardFinish(card, variant);
  return {
    kind: 'card',
    image: card.images.large,
    title: card.name,
    subtitle: card.set.name,
    foil: finish.foil,
    border: finish.border,
    era: finish.era,
    back: 'international',
  };
}

export function productViewerParams(product: SealedProduct): ViewerParams | null {
  if (product.cardNumber) {
    const finish = singleFinish(product);
    return {
      kind: 'card',
      image: largeProductImage(product.imageUrl),
      title: product.name,
      subtitle: product.setName,
      foil: finish.foil,
      border: finish.border,
      era: finish.era,
      back: singleBack(product),
    };
  }
  const kind = productModelKind(product.name);
  if (!kind) return null;
  return {
    kind,
    image: largeProductImage(product.imageUrl),
    title: product.name,
    subtitle: product.setName,
    product: String(product.productId),
  };
}
