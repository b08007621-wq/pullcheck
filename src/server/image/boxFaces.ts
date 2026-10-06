import {
  convexHull,
  distance,
  insetQuad,
  intersectLines,
  isConvex,
  type Point,
  type Quad,
  quadArea,
  simplifyRing,
  squareToQuad,
} from './geometry';
import { boxBlur, createRaster, downscale, type Raster, resize, sampleInto } from './raster';
import { boundaryPoints, findSilhouette, type Silhouette, SOFT_TONES, topOf } from './silhouette';

export type BoxLayout = {
  mode: 'angled' | 'flat';
  front: Quad;
  side: Quad | null;
  sideOnLeft: boolean;
  frontAspect: number;
};

export type BoxFaces = {
  layout: BoxLayout;
  front: Raster;
  side: Raster;
  top: Raster;
};

const ANALYSIS_SIZE = 480;
const FRONT_WIDTH = 1024;
const SIDE_STRIP = 0.035;

export function locateBox(raster: Raster): BoxLayout {
  const { raster: small, scale } = downscale(raster, ANALYSIS_SIZE);
  const silhouette = findSilhouette(small);
  const full: Quad = [
    { x: 0, y: 0 },
    { x: raster.width, y: 0 },
    { x: raster.width, y: raster.height },
    { x: 0, y: raster.height },
  ];
  if (silhouette.background === 'none' || silhouette.coverage > 0.985) return flatLayout(full);

  const layout = angledLayout(silhouette);
  if (!layout) return flatLayout(boundsQuad(silhouette, scale));
  return {
    ...layout,
    front: insetQuad(unscale(layout.front, scale), 2.5),
    side: layout.side ? insetQuad(unscale(layout.side, scale), 2.5) : null,
  };
}

export function renderBoxFaces(raster: Raster, layout: BoxLayout, depthRatio: number): BoxFaces {
  const frontHeight = Math.round(clamp(FRONT_WIDTH / layout.frontAspect, 560, 1400));
  const front = warp(raster, layout.front, FRONT_WIDTH, frontHeight);
  const sideWidth = Math.max(64, Math.round(frontHeight * depthRatio));
  const side = layout.side ? warp(raster, layout.side, sideWidth, frontHeight) : edgeStrip(front, sideWidth, frontHeight);
  const top = resize(boxBlur(downscale(front, 96).raster, 6), 256, 128);
  return { layout, front, side, top };
}

export function renderFlatFaces(raster: Raster): BoxFaces {
  const { raster: small, scale } = downscale(raster, ANALYSIS_SIZE);
  const silhouette = findSilhouette(small, SOFT_TONES);
  const crop =
    silhouette.background === 'none' || silhouette.coverage > 0.985
      ? ([
          { x: 0, y: 0 },
          { x: raster.width, y: 0 },
          { x: raster.width, y: raster.height },
          { x: 0, y: raster.height },
        ] as Quad)
      : boundsQuad(silhouette, scale);
  const aspect = clamp(distance(crop[0], crop[1]) / Math.max(1, distance(crop[0], crop[3])), 0.35, 2.5);
  const lid = fillBackground(warp(raster, crop, FRONT_WIDTH, Math.round(clamp(FRONT_WIDTH / aspect, 400, 1800))));
  const rim = rimColor(lid);
  const side = createRaster(64, 64);
  for (let y = 0; y < 64; y++) {
    const shade = 0.78 + 0.32 * Math.sin((y / 63) * Math.PI);
    for (let x = 0; x < 64; x++) {
      const index = (y * 64 + x) * 4;
      side.data[index] = Math.min(255, rim[0] * shade);
      side.data[index + 1] = Math.min(255, rim[1] * shade);
      side.data[index + 2] = Math.min(255, rim[2] * shade);
      side.data[index + 3] = 255;
    }
  }
  return {
    layout: { mode: 'flat', front: crop, side: null, sideOnLeft: true, frontAspect: aspect },
    front: lid,
    side,
    top: side,
  };
}

function fillBackground(raster: Raster): Raster {
  const { raster: small } = downscale(raster, 256);
  const silhouette = findSilhouette(small, SOFT_TONES);
  if (silhouette.background === 'none') return raster;
  const { width, height } = small;
  const filled = new Uint8Array(silhouette.mask);
  const colors = new Float32Array(width * height * 3);
  for (let index = 0; index < width * height; index++) {
    colors[index * 3] = small.data[index * 4]!;
    colors[index * 3 + 1] = small.data[index * 4 + 1]!;
    colors[index * 3 + 2] = small.data[index * 4 + 2]!;
  }
  for (let pass = 0; pass < 48; pass++) {
    const next = new Uint8Array(filled);
    let changed = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        if (filled[index]) continue;
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const neighbor = ny * width + nx;
          if (!filled[neighbor]) continue;
          red += colors[neighbor * 3]!;
          green += colors[neighbor * 3 + 1]!;
          blue += colors[neighbor * 3 + 2]!;
          count++;
        }
        if (count === 0) continue;
        colors[index * 3] = red / count;
        colors[index * 3 + 1] = green / count;
        colors[index * 3 + 2] = blue / count;
        next[index] = 1;
        changed = true;
      }
    }
    filled.set(next);
    if (!changed) break;
  }
  const out = createRaster(raster.width, raster.height);
  out.data.set(raster.data);
  for (let y = 0; y < raster.height; y++) {
    const sy = Math.min(height - 1, Math.floor((y / raster.height) * height));
    for (let x = 0; x < raster.width; x++) {
      const sx = Math.min(width - 1, Math.floor((x / raster.width) * width));
      const source = sy * width + sx;
      if (silhouette.mask[source]) continue;
      const index = (y * raster.width + x) * 4;
      out.data[index] = colors[source * 3]!;
      out.data[index + 1] = colors[source * 3 + 1]!;
      out.data[index + 2] = colors[source * 3 + 2]!;
      out.data[index + 3] = 255;
    }
  }
  return out;
}

function rimColor(raster: Raster): [number, number, number] {
  const { width, height, data } = raster;
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const edge = Math.min(x / width, 1 - x / width, y / height, 1 - y / height);
      if (edge < 0.02 || edge > 0.06) continue;
      const index = (y * width + x) * 4;
      red += data[index]!;
      green += data[index + 1]!;
      blue += data[index + 2]!;
      count++;
    }
  }
  return count ? [red / count, green / count, blue / count] : [180, 180, 190];
}

function angledLayout(silhouette: Silhouette): Omit<BoxLayout, 'front' | 'side'> & { front: Quad; side: Quad | null } | null {
  const hull = convexHull(boundaryPoints(silhouette));
  if (hull.length < 4) return null;
  const xs = hull.map((point) => point.x);
  const ys = hull.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  if (width < silhouette.width * 0.2 || height < silhouette.height * 0.2) return null;

  const hexagon = simplifyRing(hull, 6);
  const count = hexagon.length;
  const at = (index: number) => hexagon[((index % count) + count) % count]!;
  const bottomIndex = hexagon.reduce((best, point, index) => (point.y > hexagon[best]!.y ? index : best), 0);
  const bottom = at(bottomIndex);
  const toward = at(bottomIndex + 1).x > at(bottomIndex - 1).x ? 1 : -1;
  const bottomRight = at(bottomIndex + toward);
  const topRight = at(bottomIndex + toward * 2);
  const peak = at(bottomIndex + toward * 3);
  const topLeft = at(bottomIndex - toward * 2);
  const bottomLeft = at(bottomIndex - toward);

  const single = bottom.x - minX < width * 0.05 || maxX - bottom.x < width * 0.05;
  if (single) return fourCorners(hull);

  const silhouetteTop = topOf(silhouette, bottom.x);
  const top =
    Math.abs(peak.x - bottom.x) <= width * 0.08
      ? peak
      : silhouetteTop !== null
        ? { x: bottom.x, y: silhouetteTop }
        : intersectLines(topRight, sub(bottom, bottomRight), topLeft, sub(bottom, bottomLeft));
  if (!top || top.y >= bottom.y - height * 0.3) return null;
  if (topRight.y >= bottomRight.y || topLeft.y >= bottomLeft.y) return null;

  const frontOnRight = maxX - bottom.x >= bottom.x - minX;
  const rightFace: Quad = [top, topRight, bottomRight, bottom];
  const leftFace: Quad = [topLeft, top, bottom, bottomLeft];
  const front = frontOnRight ? rightFace : leftFace;
  const side = frontOnRight ? leftFace : rightFace;
  if (!isConvex(front) || !isUpright(front) || quadArea(front) < silhouette.width * silhouette.height * 0.15) {
    return fourCorners(hull);
  }
  return {
    mode: 'angled',
    front,
    side: isConvex(side) && isUpright(side) ? side : null,
    sideOnLeft: frontOnRight,
    frontAspect: aspectOf(front),
  };
}

function flatLayout(quad: Quad): BoxLayout {
  return { mode: 'flat', front: quad, side: null, sideOnLeft: true, frontAspect: aspectOf(quad) };
}

function boundsQuad(silhouette: Silhouette, scale: number): Quad {
  const { width, height, mask } = silhouette;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + 1);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + 1);
    }
  }
  return unscale(
    [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ],
    scale,
  );
}

function warp(raster: Raster, quad: Quad, width: number, height: number): Raster {
  const map = squareToQuad(quad);
  const out = createRaster(width, height);
  const color = [0, 0, 0];
  const offsets = [0.25, 0.75];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let red = 0;
      let green = 0;
      let blue = 0;
      for (const oy of offsets) {
        for (const ox of offsets) {
          const point = map((x + ox) / width, (y + oy) / height);
          sampleInto(raster, point.x, point.y, color);
          red += color[0]!;
          green += color[1]!;
          blue += color[2]!;
        }
      }
      const index = (y * width + x) * 4;
      out.data[index] = red / 4;
      out.data[index + 1] = green / 4;
      out.data[index + 2] = blue / 4;
      out.data[index + 3] = 255;
    }
  }
  return out;
}

function edgeStrip(front: Raster, width: number, height: number): Raster {
  const strip: Quad = [
    { x: 0, y: 0 },
    { x: front.width * SIDE_STRIP, y: 0 },
    { x: front.width * SIDE_STRIP, y: front.height },
    { x: 0, y: front.height },
  ];
  return warp(front, strip, width, height);
}

function aspectOf(quad: Quad): number {
  const [topLeft, topRight, bottomRight, bottomLeft] = quad;
  const across = (distance(topLeft, topRight) + distance(bottomLeft, bottomRight)) / 2;
  const down = (distance(topLeft, bottomLeft) + distance(topRight, bottomRight)) / 2;
  return clamp(across / Math.max(1, down), 0.35, 2.5);
}

function unscale(quad: Quad, scale: number): Quad {
  return quad.map((point) => ({ x: point.x / scale, y: point.y / scale })) as Quad;
}

function fourCorners(hull: Point[]): BoxLayout | null {
  const quad = orderQuad(simplifyRing(hull, 4));
  if (!quad || !isConvex(quad) || !isUpright(quad)) return null;
  return { mode: 'flat', front: quad, side: null, sideOnLeft: true, frontAspect: aspectOf(quad) };
}

function isUpright([topLeft, topRight, bottomRight, bottomLeft]: Quad): boolean {
  const steep = (a: Point, b: Point) => Math.abs(Math.atan2(b.x - a.x, b.y - a.y)) < 0.35;
  const level = (a: Point, b: Point) => Math.abs(Math.atan2(b.y - a.y, b.x - a.x)) < 0.45;
  return steep(topLeft, bottomLeft) && steep(topRight, bottomRight) && level(topLeft, topRight) && level(bottomLeft, bottomRight);
}

function orderQuad(points: Point[]): Quad | null {
  if (points.length !== 4) return null;
  const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
  const byDiff = [...points].sort((a, b) => a.x - a.y - (b.x - b.y));
  return [bySum[0]!, byDiff[3]!, bySum[3]!, byDiff[0]!];
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
