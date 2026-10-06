import type { Raster } from './raster';

export type UvRect = [number, number, number, number];

export type CardLayout = {
  window: UvRect | null;
  bounds: UvRect;
};

const WORK_WIDTH = 320;
const EDGE_THRESHOLD = 20;
const LINE_COVERAGE = 0.55;
const COLUMN_COVERAGE = 0.6;

export function detectCardLayout(raster: Raster): CardLayout {
  const bounds = opaqueBounds(raster);
  const scale = WORK_WIDTH / raster.width;
  const width = WORK_WIDTH;
  const height = Math.round(raster.height * scale);
  const lum = luminance(raster, width, height);

  const box = {
    x0: Math.round(bounds.x0 * scale),
    x1: Math.round(bounds.x1 * scale),
    y0: Math.round(bounds.y0 * scale),
    y1: Math.round(bounds.y1 * scale),
  };
  const cardWidth = box.x1 - box.x0;
  const cardHeight = box.y1 - box.y0;
  const rowAt = (fraction: number) => Math.round(box.y0 + cardHeight * fraction);
  const colAt = (fraction: number) => Math.round(box.x0 + cardWidth * fraction);

  const rowScore = (y: number) => {
    let hits = 0;
    const from = colAt(0.15);
    const to = colAt(0.85);
    for (let x = from; x < to; x++) {
      if (Math.abs(lum[(y + 1) * width + x]! - lum[(y - 1) * width + x]!) > EDGE_THRESHOLD) hits++;
    }
    return hits / Math.max(1, to - from);
  };

  const strongRows = (from: number, to: number) => {
    const rows: number[] = [];
    for (let y = Math.max(1, rowAt(from)); y <= Math.min(height - 2, rowAt(to)); y++) {
      if (rowScore(y) >= LINE_COVERAGE) rows.push(y);
    }
    return rows;
  };

  const topRows = strongRows(0.06, 0.17);
  const bottomRows = strongRows(0.42, 0.64);
  const result: CardLayout = { window: null, bounds: toUv(bounds, raster) };
  if (topRows.length === 0 || bottomRows.length === 0) return result;
  const top = topRows[topRows.length - 1]! + 1;
  const bottom = bottomRows[0]! - 1;
  if (bottom - top < cardHeight * 0.25) return result;

  const columnScore = (x: number) => {
    let hits = 0;
    const from = top + Math.round((bottom - top) * 0.1);
    const to = bottom - Math.round((bottom - top) * 0.1);
    for (let y = from; y < to; y++) {
      if (Math.abs(lum[y * width + x + 1]! - lum[y * width + x - 1]!) > EDGE_THRESHOLD) hits++;
    }
    return hits / Math.max(1, to - from);
  };

  const strongColumns = (from: number, to: number) => {
    const columns: number[] = [];
    for (let x = Math.max(1, colAt(from)); x <= Math.min(width - 2, colAt(to)); x++) {
      if (columnScore(x) >= COLUMN_COVERAGE) columns.push(x);
    }
    return columns;
  };

  const leftColumns = strongColumns(0.02, 0.16);
  const rightColumns = strongColumns(0.84, 0.98);
  const leftFraction = leftColumns.length ? (leftColumns[leftColumns.length - 1]! + 1 - box.x0) / cardWidth : null;
  const rightFraction = rightColumns.length ? (rightColumns[0]! - 1 - box.x0) / cardWidth : null;
  const leftOk = leftFraction !== null && leftFraction >= 0.055 && leftFraction <= 0.125;
  const rightOk = rightFraction !== null && rightFraction >= 0.875 && rightFraction <= 0.945;
  if (!leftOk && !rightOk) return result;
  const leftEdge = leftOk ? leftFraction! : 1 - rightFraction!;
  const rightEdge = rightOk ? rightFraction! : 1 - leftFraction!;
  const left = box.x0 + leftEdge * cardWidth;
  const right = box.x0 + rightEdge * cardWidth;

  result.window = [
    round(left / width),
    round(1 - bottom / height),
    round(right / width),
    round(1 - top / height),
  ];
  return result;
}

function opaqueBounds(raster: Raster) {
  const { width, height, data } = raster;
  let x0 = width;
  let y0 = height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4 + 3]! < 128) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x + 1);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y + 1);
    }
  }
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : { x0: 0, y0: 0, x1: width, y1: height };
}

function luminance(raster: Raster, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  const sx = raster.width / width;
  const sy = raster.height / height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      const fromY = Math.floor(y * sy);
      const toY = Math.max(fromY + 1, Math.floor((y + 1) * sy));
      const fromX = Math.floor(x * sx);
      const toX = Math.max(fromX + 1, Math.floor((x + 1) * sx));
      for (let yy = fromY; yy < toY; yy++) {
        for (let xx = fromX; xx < toX; xx++) {
          const index = (yy * raster.width + xx) * 4;
          sum += raster.data[index]! * 0.299 + raster.data[index + 1]! * 0.587 + raster.data[index + 2]! * 0.114;
          count++;
        }
      }
      out[y * width + x] = sum / count;
    }
  }
  return out;
}

function toUv(bounds: { x0: number; y0: number; x1: number; y1: number }, raster: Raster): UvRect {
  return [
    round(bounds.x0 / raster.width),
    round(1 - bounds.y1 / raster.height),
    round(bounds.x1 / raster.width),
    round(1 - bounds.y0 / raster.height),
  ];
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
