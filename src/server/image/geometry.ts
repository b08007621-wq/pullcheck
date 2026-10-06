export type Point = {
  x: number;
  y: number;
};

export type Quad = [Point, Point, Point, Point];

export type SquareMap = (u: number, v: number) => Point;

export function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length < 3) return sorted;
  const lower: Point[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Point[] = [];
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function intersectLines(a: Point, aDirection: Point, b: Point, bDirection: Point): Point | null {
  const denominator = aDirection.x * bDirection.y - aDirection.y * bDirection.x;
  if (Math.abs(denominator) < 1e-9) return null;
  const t = ((b.x - a.x) * bDirection.y - (b.y - a.y) * bDirection.x) / denominator;
  return { x: a.x + aDirection.x * t, y: a.y + aDirection.y * t };
}

export function squareToQuad([p0, p1, p2, p3]: Quad): SquareMap {
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    return (u, v) => ({
      x: p0.x + (p1.x - p0.x) * u + (p2.x - p1.x) * v,
      y: p0.y + (p1.y - p0.y) * u + (p2.y - p1.y) * v,
    });
  }
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const denominator = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / denominator;
  const h = (dx1 * sy - sx * dy1) / denominator;
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  return (u, v) => {
    const w = g * u + h * v + 1;
    return { x: (a * u + b * v + p0.x) / w, y: (d * u + e * v + p0.y) / w };
  };
}

export function insetQuad(quad: Quad, amount: number): Quad {
  const center = {
    x: quad.reduce((sum, point) => sum + point.x, 0) / 4,
    y: quad.reduce((sum, point) => sum + point.y, 0) / 4,
  };
  return quad.map((point) => {
    const dx = center.x - point.x;
    const dy = center.y - point.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: point.x + (dx / length) * amount, y: point.y + (dy / length) * amount };
  }) as Quad;
}

export function quadArea(quad: Quad): number {
  let area = 0;
  for (let index = 0; index < 4; index++) {
    const current = quad[index]!;
    const next = quad[(index + 1) % 4]!;
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
}

export function isConvex(quad: Quad): boolean {
  let sign = 0;
  for (let index = 0; index < 4; index++) {
    const turn = cross(quad[index]!, quad[(index + 1) % 4]!, quad[(index + 2) % 4]!);
    if (Math.abs(turn) < 1e-9) return false;
    const current = Math.sign(turn);
    if (sign !== 0 && current !== sign) return false;
    sign = current;
  }
  return true;
}

export function simplifyRing(points: Point[], count: number): Point[] {
  const ring = [...points];
  while (ring.length > count) {
    let smallest = Infinity;
    let removal = 0;
    for (let index = 0; index < ring.length; index++) {
      const previous = ring[(index - 1 + ring.length) % ring.length]!;
      const next = ring[(index + 1) % ring.length]!;
      const area = Math.abs(cross(previous, ring[index]!, next));
      if (area < smallest) {
        smallest = area;
        removal = index;
      }
    }
    ring.splice(removal, 1);
  }
  return ring;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}
