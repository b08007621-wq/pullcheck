import { useCallback } from 'react';

import { type CardLayout, fetchCardLayout } from '@/services/cardLayout';

import { useResource } from './useResource';

export function useCardLayout(imageUrl: string | null) {
  const load = useCallback(
    (signal: AbortSignal): Promise<CardLayout | null> => (imageUrl ? fetchCardLayout(imageUrl, signal) : Promise.resolve(null)),
    [imageUrl],
  );
  return useResource(`layout:${imageUrl ?? ''}`, load);
}
