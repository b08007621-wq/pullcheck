import { PNG } from 'pngjs';

import { convexHull, type Point } from './image/geometry';
import { decodeImage, downscale } from './image/raster';
import { boundaryPoints, findSilhouette } from './image/silhouette';
import { fetchProductImage } from './remoteImage';

const CACHE_LIMIT = 120;
const MIN_PIECE_SHARE = 0.05;
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
  const silhouette = findSilhouette(raster);
  const solid = keepLargePieces(silhouette.backgroundMask, width, height);
  fillHull(solid, width, height, convexHull(boundaryPoints({ ...silhouette, mask: solid })));

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

function fillHull(solid: Uint8Array, width: number, height: number, hull: Point[]) {
  if (hull.length < 3) return;
  for (let y = 0; y < height; y++) {
    const scan = y + 0.5;
    let left = Infinity;
    let right = -Infinity;
    for (let index = 0; index < hull.length; index++) {
      const from = hull[index]!;
      const to = hull[(index + 1) % hull.length]!;
      if ((from.y <= scan && to.y > scan) || (to.y <= scan && from.y > scan)) {
        const x = from.x + ((scan - from.y) / (to.y - from.y)) * (to.x - from.x);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
    if (left > right) continue;
    for (let x = Math.max(0, Math.ceil(left)); x < Math.min(width, Math.floor(right)); x++) solid[y * width + x] = 1;
  }
}

function keepLargePieces(background: Uint8Array, width: number, height: number): Uint8Array {
  const total = width * height;
  const labels = new Int32Array(total).fill(-1);
  const queue = new Int32Array(total);
  const sizes: number[] = [];
  for (let start = 0; start < total; start++) {
    if (background[start] || labels[start] !== -1) continue;
    const label = sizes.length;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    labels[start] = label;
    while (head < tail) {
      const index = queue[head++]!;
      const x = index % width;
      const neighbors = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, index >= width ? index - width : -1, index < total - width ? index + width : -1];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || background[neighbor] || labels[neighbor] !== -1) continue;
        labels[neighbor] = label;
        queue[tail++] = neighbor;
      }
    }
    sizes.push(tail);
  }
  const largest = Math.max(0, ...sizes);
  const solid = new Uint8Array(total);
  for (let index = 0; index < total; index++) {
    const label = labels[index]!;
    if (label >= 0 && sizes[label]! >= largest * MIN_PIECE_SHARE) solid[index] = 1;
  }
  return solid;
}
