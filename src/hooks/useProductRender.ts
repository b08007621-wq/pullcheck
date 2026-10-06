import { useEffect, useState } from 'react';

import { type AssetManifest, loadAssetManifest, productArtUrl } from '@/services/productAssets';
import type { SealedProduct } from '@/types/sealed';

const WAIT_MS = 2500;

let loaded: AssetManifest | null = null;

export function useProductRender(product: SealedProduct): { url: string | null; settled: boolean } {
  const [manifest, setManifest] = useState<AssetManifest | null>(loaded);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (manifest) return;
    let active = true;
    const timer = setTimeout(() => {
      if (active) setFailed(true);
    }, WAIT_MS);
    loadAssetManifest().then(
      (value) => {
        loaded = value;
        if (active) setManifest(value);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [manifest]);

  return { url: manifest ? productArtUrl(product, manifest) : null, settled: manifest !== null || failed };
}
