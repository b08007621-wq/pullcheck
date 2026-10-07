import type { CardBack } from '@/three/cardBack';
import { cardFinish, singleFinish } from '@/three/cardFinish';
import type { ModelKind } from '@/three/models';
import type { Card } from '@/types/card';
import type { CollectionItem } from '@/types/collection';
import type { SealedProduct } from '@/types/sealed';

import { gameBack, singleBack } from './cardBack';
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
  pattern?: string;
  back?: CardBack;
  backImage?: string;
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
    pattern: finish.pattern,
    back: gameBack(card),
    ...(card.images.back ? { backImage: card.images.back } : {}),
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
      pattern: finish.pattern,
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

export function itemViewerParams(item: CollectionItem): ViewerParams | null {
  if (item.kind === 'card') {
    return cardViewerParams(item.card, item.variant);
  }
  return productViewerParams(item.product);
}
