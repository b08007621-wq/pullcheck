import { useCallback, useEffect, useState } from 'react';

import { type ApiError, isAbortError, toApiError } from '@/services/http';

type Keyed<T> = {
  key: string;
  value: T;
};

export function useResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [fresh, setFresh] = useState<Keyed<T> | null>(null);
  const [failure, setFailure] = useState<Keyed<ApiError> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    load(controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setFailure(null);
        setFresh({ key, value });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setFailure({ key, value: toApiError(error) });
      });

    return () => controller.abort();
  }, [key, load, attempt]);

  const retry = useCallback(() => {
    setFailure(null);
    setAttempt((value) => value + 1);
  }, []);

  return {
    data: fresh?.key === key ? fresh.value : null,
    error: failure?.key === key ? failure.value : null,
    retry,
  };
}
