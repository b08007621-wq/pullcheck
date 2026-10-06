import { useCallback, useEffect, useRef, useState } from 'react';

import { matchCard } from '@/services/cardMatch';
import { type ApiError, isAbortError, toApiError } from '@/services/http';
import { readCardPhoto } from '@/services/identify';
import type { CardMatch, CardReading, IdentifyStage } from '@/types/identify';

export type CardIdentify = ReturnType<typeof useCardIdentify>;

export function useCardIdentify() {
  const [stage, setStage] = useState<IdentifyStage>('idle');
  const [reading, setReading] = useState<CardReading | null>(null);
  const [match, setMatch] = useState<CardMatch | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const identify = useCallback(async (imageBase64: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setReading(null);
    setMatch(null);
    setError(null);
    setStage('reading');

    try {
      const result = await readCardPhoto(imageBase64, controller.signal);
      if (controller.signal.aborted) return;
      setReading(result);
      if (!result.isPokemonCard) {
        setMatch({ status: 'none' });
        setStage('done');
        return;
      }
      setStage('matching');
      const found = await matchCard(result, controller.signal);
      if (controller.signal.aborted) return;
      setMatch(found);
      setStage('done');
    } catch (caught) {
      if (controller.signal.aborted || isAbortError(caught)) return;
      setError(toApiError(caught));
      setStage('error');
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setStage('idle');
    setReading(null);
    setMatch(null);
    setError(null);
  }, []);

  return { stage, reading, match, error, identify, reset };
}
