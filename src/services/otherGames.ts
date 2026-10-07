import type { Card, CardPage, Game } from '@/types/card';
import { gameOfId } from '@/utils/game';

import { ApiError } from './http';
import { getLorcastCard, getLorcastCards, searchLorcast } from './lorcast';
import { getScryfallCard, getScryfallCards, searchScryfall } from './scryfall';
import { getYgoCard, getYgoCards, searchYgo } from './ygoprodeck';

type OtherGame = Exclude<Game, 'pokemon'>;

type GameSource = {
  search: (text: string, page: number, signal?: AbortSignal) => Promise<CardPage>;
  get: (id: string, signal?: AbortSignal, options?: { force?: boolean }) => Promise<Card>;
  many: (ids: string[]) => Promise<{ cards: Card[]; failed: number }>;
};

const SOURCES: Record<OtherGame, GameSource> = {
  mtg: { search: searchScryfall, get: getScryfallCard, many: getScryfallCards },
  yugioh: { search: searchYgo, get: getYgoCard, many: getYgoCards },
  lorcana: { search: searchLorcast, get: getLorcastCard, many: getLorcastCards },
};

export function searchGameCards(game: OtherGame, text: string, page: number, signal?: AbortSignal): Promise<CardPage> {
  return SOURCES[game].search(text, page, signal);
}

export function getGameCard(id: string, signal?: AbortSignal, options: { force?: boolean } = {}): Promise<Card> {
  const game = gameOfId(id);
  if (game === 'pokemon') return Promise.reject(new ApiError('notFound'));
  return SOURCES[game].get(id, signal, options);
}

export async function refreshGameCards(ids: string[]): Promise<{ cards: Card[]; failed: number }> {
  const byGame = new Map<OtherGame, string[]>();
  for (const id of ids) {
    const game = gameOfId(id);
    if (game === 'pokemon') continue;
    byGame.set(game, [...(byGame.get(game) ?? []), id]);
  }
  const results = await Promise.all([...byGame].map(([game, list]) => SOURCES[game].many(list)));
  return {
    cards: results.flatMap((result) => result.cards),
    failed: results.reduce((sum, result) => sum + result.failed, 0),
  };
}
