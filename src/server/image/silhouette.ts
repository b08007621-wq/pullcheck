import type { Point } from './geometry';
import type { Raster } from './raster';

export type Silhouette = {
  width: number;
  height: number;
  mask: Uint8Array;
  background: 'white' | 'black' | 'none';
  coverage: number;
  backgroundMask: Uint8Array;
};

type Tone = 0 | 1 | 2;

const NONE: Tone = 0;
const WHITE: Tone = 1;
const BLACK: Tone = 2;

export type ToneLimits = {
  whiteLow: number;
  whiteSpread: number;
  blackHigh: number;
};

export const STRICT_TONES: ToneLimits = { whiteLow: 248, whiteSpread: 7, blackHigh: 14 };
export const SOFT_TONES: ToneLimits = { whiteLow: 232, whiteSpread: 20, blackHigh: 18 };

export function findSilhouette(raster: Raster, limits: ToneLimits = STRICT_TONES): Silhouette {
  const { width, height, data } = raster;
  const tones = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index++) {
    tones[index] = toneOf(data[index * 4]!, data[index * 4 + 1]!, data[index * 4 + 2]!, limits);
  }

  const background = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const seed = (index: number) => {
    if (tones[index] === NONE || background[index]) return;
    background[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++]!;
    const tone = tones[index]!;
    const x = index % width;
    const y = (index - x) / width;
    const neighbors = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1];
    for (const neighbor of neighbors) {
      if (neighbor < 0 || background[neighbor] || tones[neighbor] !== tone) continue;
      background[neighbor] = 1;
      queue[tail++] = neighbor;
    }
  }

  let whiteCount = 0;
  let blackCount = 0;
  for (let index = 0; index < width * height; index++) {
    if (!background[index]) continue;
    if (tones[index] === WHITE) whiteCount++;
    else blackCount++;
  }

  const mask = largestComponent(background, width, height);
  let filled = 0;
  for (const value of mask) filled += value;
  const coverage = filled / (width * height);
  const bgPixels = whiteCount + blackCount;
  const kind = bgPixels < width * height * 0.004 ? 'none' : whiteCount >= blackCount ? 'white' : 'black';
  return { width, height, mask, background: kind, coverage, backgroundMask: background };
}

export function boundaryPoints(silhouette: Silhouette): Point[] {
  const { width, height, mask } = silhouette;
  const points: Point[] = [];
  for (let y = 0; y < height; y++) {
    let first = -1;
    let last = -1;
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      if (first < 0) first = x;
      last = x;
    }
    if (first >= 0) {
      points.push({ x: first, y: y + 0.5 }, { x: last + 1, y: y + 0.5 });
    }
  }
  for (let x = 0; x < width; x++) {
    const top = topOf(silhouette, x);
    if (top === null) continue;
    let bottom = top;
    for (let y = height - 1; y >= 0; y--) {
      if (mask[y * width + x]) {
        bottom = y;
        break;
      }
    }
    points.push({ x: x + 0.5, y: top }, { x: x + 0.5, y: bottom + 1 });
  }
  return points;
}

export function topOf(silhouette: Silhouette, column: number): number | null {
  const { width, height, mask } = silhouette;
  const x = Math.min(width - 1, Math.max(0, Math.round(column)));
  for (let y = 0; y < height; y++) {
    if (mask[y * width + x]) return y;
  }
  return null;
}

function toneOf(red: number, green: number, blue: number, limits: ToneLimits): Tone {
  const low = Math.min(red, green, blue);
  const high = Math.max(red, green, blue);
  if (low > limits.whiteLow && high - low < limits.whiteSpread) return WHITE;
  if (high < limits.blackHigh) return BLACK;
  return NONE;
}

function largestComponent(background: Uint8Array, width: number, height: number): Uint8Array {
  const labels = new Int32Array(width * height).fill(-1);
  const queue = new Int32Array(width * height);
  let best = -1;
  let bestSize = 0;
  let label = 0;
  for (let start = 0; start < width * height; start++) {
    if (background[start] || labels[start] !== -1) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    labels[start] = label;
    while (head < tail) {
      const index = queue[head++]!;
      const x = index % width;
      const y = (index - x) / width;
      const neighbors = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || background[neighbor] || labels[neighbor] !== -1) continue;
        labels[neighbor] = label;
        queue[tail++] = neighbor;
      }
    }
    if (tail > bestSize) {
      bestSize = tail;
      best = label;
    }
    label++;
  }
  const mask = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index++) {
    mask[index] = labels[index] === best ? 1 : 0;
  }
  return mask;
}
