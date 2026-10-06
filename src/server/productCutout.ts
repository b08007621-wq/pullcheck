import { PNG } from 'pngjs';

import { decodeImage, downscale } from './image/raster';
import { findSilhouette, SOFT_TONES } from './image/silhouette';
import { fetchProductImage } from './remoteImage';

const CACHE_LIMIT = 120;
const cache = new Map<string, Promise<Uint8Array>>();

export function getProductCutout(productId: number, size: number): Promise<Uint8Array> {
  const key = `${productId}:${size}`;
  const cached = cache.get(key);
  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }
  const work = fetchProductImage(productId).then((bytes) => cutout(bytes, size));
  cache.set(key, work);
  work.catch(() => cache.delete(key));
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return work;
}

function cutout(bytes: Uint8Array, size: number): Uint8Array {
  const { raster } = downscale(decodeImage(bytes), size);
  const { width, height, data } = raster;
  const silhouette = findSilhouette(raster, SOFT_TONES);
  const solid = new Uint8Array(width * height);
  for (let index = 0; index < solid.length; index++) solid[index] = silhouette.mask[index] ? 1 : 0;

  const eroded = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      eroded[index] =
        solid[index] && (edge || (solid[index - 1] && solid[index + 1] && solid[index - width] && solid[index + width]))
          ? 1
          : 0;
    }
  }

  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          sum += eroded[ny * width + nx]!;
          count++;
        }
      }
      const index = (y * width + x) * 4;
      out.data[index] = data[index]!;
      out.data[index + 1] = data[index + 1]!;
      out.data[index + 2] = data[index + 2]!;
      out.data[index + 3] = Math.round((sum / count) * 255);
    }
  }
  return new Uint8Array(PNG.sync.write(out));
}
