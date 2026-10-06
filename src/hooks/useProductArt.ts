import { useCallback } from 'react';

import { fetchProductArt, type ProductArt } from '@/services/productArt';
import { isArtKind, type ModelKind } from '@/three/models';

import { useResource } from './useResource';

export function useProductArt(kind: ModelKind, productId: number | null) {
  const key = isArtKind(kind) && productId !== null ? `${kind}:${productId}` : 'none';

  const load = useCallback(
    (signal: AbortSignal): Promise<ProductArt | null> =>
      isArtKind(kind) && productId !== null ? fetchProductArt(productId, kind, signal) : Promise.resolve(null),
    [kind, productId],
  );

  return useResource(key, load);
}
