import { useCallback, useEffect, useState } from 'react';

import { type ApiError, isAbortError, toApiError } from '@/services/http';
import { toSearchTokens } from '@/services/sealedQuery';
import { type ProductKind, searchProducts } from '@/services/sealedProducts';
import type { Market, SealedProduct } from '@/types/sealed';

import type { SearchStatus } from './useCardSearch';
import { useDebouncedValue } from './useDebouncedValue';

const DEBOUNCE_MS = 450;

type Results = {
  key: string;
  products: SealedProduct[];
};

type Failure = {
  key: string;
  error: ApiError;
};

export type SealedSearch = ReturnType<typeof useSealedSearch>;

export function useSealedSearch(input: string, market: Market = 'en', kind: ProductKind = 'sealed', enabled = true) {
  const normalized = toSearchTokens(input).join(' ');
  const debounced = useDebouncedValue(normalized, DEBOUNCE_MS);
  const query = normalized && enabled ? debounced : '';
  const key = `${market}:${kind}:${query}`;

  const [results, setResults] = useState<Results | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const requestKey = `${market}:${kind}:${query}`;

    searchProducts(query, market, kind, controller.signal)
      .then((products) => {
        if (controller.signal.aborted) return;
        setFailure(null);
        setResults({ key: requestKey, products });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setFailure({ key: requestKey, error: toApiError(error) });
      });

    return () => controller.abort();
  }, [query, market, kind, attempt]);

  const current = query && results?.key === key ? results : null;
  const currentFailure = query && failure?.key === key ? failure : null;

  const retry = useCallback(() => {
    setFailure(null);
    setAttempt((value) => value + 1);
  }, []);

  return {
    status: resolveStatus(normalized, current, currentFailure),
    query,
    market,
    kind,
    products: current?.products ?? [],
    error: currentFailure?.error ?? null,
    isTyping: normalized !== '' && normalized !== debounced,
    retry,
  };
}

function resolveStatus(
  normalized: string,
  current: Results | null,
  failure: Failure | null,
): SearchStatus {
  if (!normalized) return 'idle';
  if (current) return 'success';
  if (failure) return 'error';
  return 'loading';
}
