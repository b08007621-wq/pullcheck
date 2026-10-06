import { type CardLayout, detectCardLayout } from './image/cardLayout';
import { decodeImage } from './image/raster';
import { fetchCardImage } from './remoteImage';

const CACHE_LIMIT = 300;
const cache = new Map<string, Promise<CardLayout>>();

export function getCardLayout(url: string): Promise<CardLayout> {
  const cached = cache.get(url);
  if (cached) {
    cache.delete(url);
    cache.set(url, cached);
    return cached;
  }
  const work = fetchCardImage(url).then((bytes) => detectCardLayout(decodeImage(bytes)));
  cache.set(url, work);
  work.catch(() => cache.delete(url));
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return work;
}
