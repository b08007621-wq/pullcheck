export function hsl(hue: number, saturation: number, lightness: number): string {
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = clamp01(saturation / 100);
  const l = clamp01(lightness / 100);

  if (s === 0) return toHex(l, l, l);

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return toHex(channel(p, q, h + 1 / 3), channel(p, q, h), channel(p, q, h - 1 / 3));
}

export function relativeLuminance(hex: string): number {
  const value = Number.parseInt(hex.replace('#', '').slice(0, 6), 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((component) => {
    const c = component / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

export function readableOn(hex: string): string {
  return relativeLuminance(hex) > 0.45 ? '#15131A' : '#FFFFFF';
}

export function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.replace('#', '').slice(0, 6), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

function channel(p: number, q: number, t: number): number {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((component) => Math.round(component * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
