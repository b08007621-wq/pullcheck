import type { Card, CardPage, Game } from '@/types/card';
import type { GameSet } from '@/types/gameSet';
import { gameOfId, type OtherGame } from '@/utils/game';

import { ApiError } from './http';
import { getLorcastCard, getLorcastCards, getLorcastSetCards, getLorcastSets, searchLorcast } from './lorcast';
import {
  getScryfallCard,
  getScryfallCards,
  getScryfallSetCards,
  getScryfallSets,
  MTG_LANGUAGES,
  type MtgLanguage,
  searchScryfall,
} from './scryfall';
import {
  getYgoCard,
  getYgoCards,
  getYgoSetCards,
  getYgoSets,
  searchYgo,
  YGO_LANGUAGES,
  type YgoLanguage,
} from './ygoprodeck';

type GameSource = {
  languages: readonly string[];
  search: (text: string, page: number, signal: AbortSignal | undefined, lang: string) => Promise<CardPage>;
  get: (id: string, signal?: AbortSignal, options?: { force?: boolean }) => Promise<Card>;
  many: (ids: string[]) => Promise<{ cards: Card[]; failed: number }>;
  sets: (signal?: AbortSignal) => Promise<GameSet[]>;
  setCards: (setId: string, signal?: AbortSignal) => Promise<Card[]>;
};

const SOURCES: Record<OtherGame, GameSource> = {
  mtg: {
    languages: MTG_LANGUAGES,
    search: (text, page, signal, lang) => searchScryfall(text, page, signal, lang as MtgLanguage),
    get: getScryfallCard,
    many: getScryfallCards,
    sets: getScryfallSets,
    setCards: getScryfallSetCards,
  },
  yugioh: {
    languages: YGO_LANGUAGES,
    search: (text, page, signal, lang) => searchYgo(text, page, signal, lang as YgoLanguage),
    get: getYgoCard,
    many: getYgoCards,
    sets: getYgoSets,
    setCards: getYgoSetCards,
  },
  lorcana: {
    languages: ['en'],
    search: (text, page, signal) => searchLorcast(text, page, signal),
    get: getLorcastCard,
    many: getLorcastCards,
    sets: getLorcastSets,
    setCards: getLorcastSetCards,
  },
};

export function gameLanguages(game: Game): readonly string[] {
  return game === 'pokemon' ? ['en', 'jp'] : SOURCES[game].languages;
}

export function searchGameCards(
  game: OtherGame,
  text: string,
  page: number,
  signal?: AbortSignal,
  lang = 'en',
): Promise<CardPage> {
  const source = SOURCES[game];
  return source.search(text, page, signal, source.languages.includes(lang) ? lang : 'en');
}

export function getGameCard(id: string, signal?: AbortSignal, options: { force?: boolean } = {}): Promise<Card> {
  const game = gameOfId(id);
  if (game === 'pokemon') return Promise.reject(new ApiError('notFound'));
  return SOURCES[game].get(id, signal, options);
}

export function getGameSets(game: OtherGame, signal?: AbortSignal): Promise<GameSet[]> {
  return SOURCES[game].sets(signal);
}

export function getGameSetCards(setId: string, signal?: AbortSignal): Promise<Card[]> {
  const game = gameOfId(setId);
  if (game === 'pokemon') return Promise.reject(new ApiError('notFound'));
  return SOURCES[game].setCards(setId, signal);
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
