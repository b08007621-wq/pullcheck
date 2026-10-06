export function largerImage(url: string): string {
  if (url.includes('images.pokemontcg.io') && !url.includes('_hires')) return url.replace(/\.png$/, '_hires.png');
  return url.replace(/_200w\.jpg$/, '_in_1000x1000.jpg');
}

export function scanThumb(base: string | undefined, fallback: string | null | undefined): string | null {
  return base ? `${base}/low.webp` : (fallback ?? null);
}

export function scanLarge(base: string | undefined, fallback: string | null | undefined): string | null {
  return base ? `${base}/high.webp` : fallback ? largerImage(fallback) : null;
}
