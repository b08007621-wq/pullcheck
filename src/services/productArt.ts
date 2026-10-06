import type { ArtKind } from '@/three/models';

import { apiUrl } from './apiBase';
import { getJson } from './http';

export type ProductArt = {
  mode: 'angled' | 'flat';
  aspect: number;
  depth: number;
  faces: {
    front: string;
    side: string;
    top: string;
  };
};

export async function fetchProductArt(productId: number, kind: ArtKind, signal?: AbortSignal): Promise<ProductArt> {
  const art = await getJson<ProductArt>(apiUrl(`/api/product-art?product=${productId}&kind=${kind}`), {
    signal,
    timeoutMs: 45_000,
    maxAttempts: 2,
  });
  return {
    ...art,
    faces: {
      front: apiUrl(art.faces.front),
      side: apiUrl(art.faces.side),
      top: apiUrl(art.faces.top),
    },
  };
}
