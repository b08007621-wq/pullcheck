import { locateBox, renderBoxFaces, renderFlatFaces } from './image/boxFaces';
import { decodeImage, encodeJpeg } from './image/raster';
import { fetchProductImage } from './remoteImage';

type Family = 'box' | 'flat';

const KINDS = {
  bundle: { family: 'box', depth: 0.44 },
  boosterbox: { family: 'box', depth: 0.55 },
  etb: { family: 'box', depth: 0.49 },
  pcetb: { family: 'box', depth: 0.49 },
  collection: { family: 'box', depth: 0.34 },
  special: { family: 'box', depth: 0.34 },
  premium: { family: 'box', depth: 0.35 },
  poster: { family: 'box', depth: 0.16 },
  large: { family: 'box', depth: 0.34 },
  blister: { family: 'flat', depth: 0.04 },
  blister2: { family: 'flat', depth: 0.04 },
  blister3: { family: 'flat', depth: 0.04 },
  tin: { family: 'flat', depth: 0.4 },
  minitin: { family: 'flat', depth: 0.22 },
} satisfies Record<string, { family: Family; depth: number }>;

export type ArtKind = keyof typeof KINDS;

export type FaceName = 'front' | 'side' | 'top';

export type ProductArt = {
  mode: 'angled' | 'flat';
  sideOnLeft: boolean;
  aspect: number;
  depth: number;
  faces: Record<FaceName, Uint8Array>;
};

export const ART_KIND_PATTERN = Object.keys(KINDS).join('|');

const CACHE_LIMIT = 40;

const cache = new Map<string, Promise<ProductArt>>();

export function isArtKind(value: unknown): value is ArtKind {
  return typeof value === 'string' && Object.hasOwn(KINDS, value);
}

export function isFaceName(value: unknown): value is FaceName {
  return value === 'front' || value === 'side' || value === 'top';
}

export function getProductArt(productId: number, kind: ArtKind): Promise<ProductArt> {
  const key = `${productId}:${kind}`;
  const cached = cache.get(key);
  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }
  const work = buildArt(productId, kind);
  cache.set(key, work);
  work.catch(() => cache.delete(key));
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return work;
}

async function buildArt(productId: number, kind: ArtKind): Promise<ProductArt> {
  const raster = decodeImage(await fetchProductImage(productId));
  const { family, depth } = KINDS[kind];
  if (family === 'flat') {
    const faces = renderFlatFaces(raster);
    return {
      mode: 'flat',
      sideOnLeft: true,
      aspect: Math.min(2.2, Math.max(0.4, faces.layout.frontAspect)),
      depth,
      faces: {
        front: encodeJpeg(faces.front, 90),
        side: encodeJpeg(faces.side, 88),
        top: encodeJpeg(faces.top, 85),
      },
    };
  }
  const layout = locateBox(raster);
  const faces = renderBoxFaces(raster, layout, depth);
  return {
    mode: layout.mode,
    sideOnLeft: layout.sideOnLeft,
    aspect: Math.min(2.2, Math.max(0.45, layout.frontAspect)),
    depth,
    faces: {
      front: encodeJpeg(faces.front, 90),
      side: encodeJpeg(faces.side, 88),
      top: encodeJpeg(faces.top, 85),
    },
  };
}
