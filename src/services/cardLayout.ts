import type { UvRect } from '@/three/cardFinish';

import { apiUrl } from './apiBase';
import { getJson } from './http';

export type CardLayout = {
  window: UvRect | null;
};

export function fetchCardLayout(imageUrl: string, signal?: AbortSignal): Promise<CardLayout> {
  return getJson<CardLayout>(apiUrl(`/api/card-layout?src=${encodeURIComponent(imageUrl)}`), {
    signal,
    timeoutMs: 10_000,
    maxAttempts: 1,
  });
}
