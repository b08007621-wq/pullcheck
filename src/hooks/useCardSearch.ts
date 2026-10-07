import { useCallback, useEffect, useMemo, useState } from 'react';

import { normalizeCardName } from '@/services/cardQuery';
import { enrichCardPrices, needsPrices } from '@/services/cardPrices';
import { loadExtraIndex, searchExtraCards, subscribeExtraIndex, withExtraPrices } from '@/services/extraCards';
import { type ApiError, isAbortError, toApiError } from '@/services/http';
import { searchGameCards } from '@/services/otherGames';
import { searchCardsByName } from '@/services/pokemonTcg';
import type { Card, Game } from '@/types/card';

import { useDebouncedValue } from './useDebouncedValue';

const DEBOUNCE_MS = 400;
const MAX_EXTRA_PRICED = 30;

export type SearchStatus = 'idle' | 'loading' | 'error' | 'success';

type Results = {
  query: string;
  cards: Card[];
  page: number;
  totalCount: number;
  hasMore: boolean;
  stale: boolean;
};

type Failure = {
  query: string;
  page: number;
  error: ApiError;
};

type PageTarget = {
  query: string;
  page: number;
};

export type CardSearch = ReturnType<typeof useCardSearch>;

export function useCardSearch(input: string, game: Game = 'pokemon') {
  const pokemon = game === 'pokemon';
  const name = pokemon ? normalizeCardName(input) : normalizeOtherName(input);
  const debouncedName = useDebouncedValue(name, DEBOUNCE_MS);
  const text = name ? debouncedName : '';
  const query = text ? `${game}|${text}` : '';

  const [results, setResults] = useState<Results | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [target, setTarget] = useState<PageTarget | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [extraTick, setExtraTick] = useState(0);
  const [pricedExtras, setPricedExtras] = useState<Map<string, Card>>(() => new Map());

  const current = query && results?.query === query ? results : null;
  const currentFailure = query && failure?.query === query ? failure : null;
  const page = resolvePage(query, current, target);
  const extraMatches = useMemo(() => (pokemon && text && extraTick >= 0 ? searchExtraCards(text) : []), [pokemon, text, extraTick]);

  useEffect(() => subscribeExtraIndex(() => setExtraTick((value) => value + 1)), []);

  useEffect(() => {
    if (pokemon && text) loadExtraIndex().catch(() => {});
  }, [pokemon, text]);

  useEffect(() => {
    const unpriced = extraMatches.filter((card) => !pricedExtras.has(card.id)).slice(0, MAX_EXTRA_PRICED);
    if (unpriced.length === 0) return;
    let active = true;
    withExtraPrices(unpriced)
      .then((priced) => {
        if (!active) return;
        setPricedExtras((previous) => {
          const next = new Map(previous);
          for (const card of priced) next.set(card.id, card);
          return next;
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [extraMatches, pricedExtras]);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();

    const request =
      game === 'pokemon' ? searchCardsByName(text, page, controller.signal) : searchGameCards(game, text, page, controller.signal);
    request
      .then((result) => {
        if (controller.signal.aborted) return;
        setFailure(null);
        setResults((previous) => ({
          query,
          page,
          totalCount: result.totalCount,
          hasMore: result.cards.length > 0 && page * result.pageSize < result.totalCount,
          stale: Boolean(result.stale) || (page > 1 && previous?.query === query && previous.stale),
          cards:
            page > 1 && previous?.query === query
              ? appendUnique(previous.cards, result.cards)
              : result.cards,
        }));
        if (game !== 'pokemon' || !result.cards.some(needsPrices)) return;
        enrichCardPrices(result.cards).then((enriched) => {
          setResults((previous) =>
            previous?.query === query ? { ...previous, cards: replaceById(previous.cards, enriched) } : previous,
          );
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setFailure({ query, page, error: toApiError(error) });
      });

    return () => controller.abort();
  }, [query, text, game, page, attempt]);

  const isLoadingMore = current !== null && page > current.page && currentFailure === null;
  const loadMoreFailed =
    current !== null && currentFailure !== null && currentFailure.page > current.page;

  const loadMore = useCallback(() => {
    if (!current?.hasMore || isLoadingMore || loadMoreFailed) return;
    setTarget({ query: current.query, page: current.page + 1 });
  }, [current, isLoadingMore, loadMoreFailed]);

  const retry = useCallback(() => {
    setFailure(null);
    setAttempt((value) => value + 1);
  }, []);

  const extras = extraMatches.slice(0, MAX_EXTRA_PRICED).map((card) => pricedExtras.get(card.id) ?? card);

  return {
    status: resolveStatus(name, current, currentFailure),
    query: text,
    cards: current ? mergeByRelease(current.cards, extras) : [],
    totalCount: (current?.totalCount ?? 0) + (current ? extras.length : 0),
    hasMore: current?.hasMore ?? false,
    isStale: current?.stale ?? false,
    error: currentFailure?.error ?? null,
    isTyping: name !== '' && name !== debouncedName,
    isLoadingMore,
    loadMoreFailed,
    loadMore,
    retry,
  };
}

function normalizeOtherName(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, ' ');
  return trimmed.length >= 2 ? trimmed : '';
}

function resolveStatus(
  name: string,
  current: Results | null,
  failure: Failure | null,
): SearchStatus {
  if (!name) return 'idle';
  if (current) return 'success';
  if (failure) return 'error';
  return 'loading';
}

function resolvePage(query: string, current: Results | null, target: PageTarget | null): number {
  if (!current) return 1;
  const wantsNextPage = target?.query === query && target.page === current.page + 1;
  return wantsNextPage ? target.page : current.page;
}

function replaceById(existing: Card[], updates: Card[]): Card[] {
  const byId = new Map(updates.map((card) => [card.id, card]));
  return existing.map((card) => byId.get(card.id) ?? card);
}

function mergeByRelease(cards: Card[], extras: Card[]): Card[] {
  if (extras.length === 0) return cards;
  const merged = [...cards];
  for (const extra of extras) {
    const index = merged.findIndex((card) => card.set.releaseDate < extra.set.releaseDate);
    merged.splice(index === -1 ? merged.length : index, 0, extra);
  }
  return merged;
}

function appendUnique(existing: Card[], incoming: Card[]): Card[] {
  const seen = new Set(existing.map((card) => card.id));
  return [...existing, ...incoming.filter((card) => !seen.has(card.id))];
}
