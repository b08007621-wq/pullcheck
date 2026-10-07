import type { Card } from '@/types/card';

import { getKnownCard, rememberCards } from './pokemonTcg';

export type BrowseStop = {
  id: string;
  entry?: string;
};

export type BrowsePlace = {
  index: number;
  total: number;
  previous: BrowseStop | null;
  next: BrowseStop | null;
};

const MAX_STOPS = 3000;

let stops: BrowseStop[] = [];

export function setBrowseList(next: (BrowseStop & { card?: Card })[]): void {
  const kept = next.slice(0, MAX_STOPS);
  stops = kept.map(({ id, entry }) => ({ id, entry }));
  rememberCards(kept.flatMap(({ id, card }) => (card && !getKnownCard(id) ? [card] : [])));
}

export function browsePlace(id: string, entry?: string | null): BrowsePlace | null {
  let index = entry ? stops.findIndex((stop) => stop.id === id && stop.entry === entry) : -1;
  if (index < 0) index = stops.findIndex((stop) => stop.id === id);
  if (index < 0 || stops.length < 2) return null;
  return {
    index,
    total: stops.length,
    previous: stops[index - 1] ?? null,
    next: stops[index + 1] ?? null,
  };
}
