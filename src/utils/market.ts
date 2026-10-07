import type { Game } from '@/types/card';
import type { Market } from '@/types/sealed';

const MARKET_GAME: Record<Market, Game> = {
  en: 'pokemon',
  jp: 'pokemon',
  mtg: 'mtg',
  yugioh: 'yugioh',
  lorcana: 'lorcana',
};

export function isMarket(value: unknown): value is Market {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(MARKET_GAME, value);
}

export function parseMarket(value: string | undefined): Market {
  return isMarket(value) ? value : 'en';
}

export function marketGame(market: Market | undefined): Game {
  return MARKET_GAME[market ?? 'en'];
}

export function gameMarket(game: Game): Market {
  return game === 'pokemon' ? 'en' : game;
}

export function isPokemonMarket(market: Market | undefined): boolean {
  return marketGame(market) === 'pokemon';
}
