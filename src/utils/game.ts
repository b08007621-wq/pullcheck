import type { Card, Game } from '@/types/card';

export type OtherGame = Exclude<Game, 'pokemon'>;

export type GameInfo = {
  game: Game;
  label: string;
  short: string;
  placeholder: string;
  suggestions: string[];
  source: string;
};

export const GAMES: GameInfo[] = [
  {
    game: 'pokemon',
    label: 'Pokémon',
    short: 'Pokémon',
    placeholder: 'Card name, e.g. Charizard',
    suggestions: ['Charizard', 'Pikachu', 'Umbreon', 'Mew', 'Gengar'],
    source: 'Pokémon TCG API',
  },
  {
    game: 'mtg',
    label: 'Magic: The Gathering',
    short: 'Magic',
    placeholder: 'Card name, e.g. Black Lotus',
    suggestions: ['Lightning Bolt', 'Sol Ring', 'Black Lotus', 'The One Ring', 'Sheoldred'],
    source: 'Scryfall',
  },
  {
    game: 'yugioh',
    label: 'Yu-Gi-Oh!',
    short: 'Yu-Gi-Oh!',
    placeholder: 'Card name, e.g. Dark Magician',
    suggestions: ['Dark Magician', 'Blue-Eyes White Dragon', 'Ash Blossom', 'Exodia', 'Red-Eyes'],
    source: 'YGOPRODeck',
  },
  {
    game: 'lorcana',
    label: 'Disney Lorcana',
    short: 'Lorcana',
    placeholder: 'Card name, e.g. Elsa',
    suggestions: ['Elsa', 'Mickey Mouse', 'Stitch', 'Maleficent', 'Ursula'],
    source: 'Lorcast',
  },
];

const ID_PREFIX: Record<OtherGame, string> = {
  mtg: 'mtg-',
  yugioh: 'ygo-',
  lorcana: 'lor-',
};

export function gameInfo(game: Game): GameInfo {
  return GAMES.find((entry) => entry.game === game) ?? GAMES[0]!;
}

export function isGame(value: unknown): value is Game {
  return GAMES.some((entry) => entry.game === value);
}

export function gameIdPrefix(game: OtherGame): string {
  return ID_PREFIX[game];
}

export function gameOfId(id: string): Game {
  for (const [game, prefix] of Object.entries(ID_PREFIX) as [OtherGame, string][]) {
    if (id.startsWith(prefix)) return game;
  }
  return 'pokemon';
}

export function gameOf(card: Card): Game {
  return card.game ?? gameOfId(card.id);
}

export function isOtherGameId(id: string): boolean {
  return gameOfId(id) !== 'pokemon';
}

export function isOtherGame(card: Card): boolean {
  return gameOf(card) !== 'pokemon';
}

export function slashDate(value: string | null | undefined): string {
  return (value ?? '').slice(0, 10).replace(/-/g, '/');
}

export function priceNumber(value: string | number | null | undefined): number | null {
  const amount = typeof value === 'number' ? value : Number.parseFloat(value ?? '');
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

const LANGUAGE_LABELS: Record<string, { short: string; full: string }> = {
  en: { short: 'EN', full: 'English' },
  jp: { short: 'JP', full: 'Japanese' },
  ja: { short: 'JP', full: 'Japanese' },
  de: { short: 'DE', full: 'German' },
  fr: { short: 'FR', full: 'French' },
  it: { short: 'IT', full: 'Italian' },
  es: { short: 'ES', full: 'Spanish' },
  pt: { short: 'PT', full: 'Portuguese' },
  ko: { short: 'KO', full: 'Korean' },
  ru: { short: 'RU', full: 'Russian' },
  zhs: { short: '简', full: 'Simplified Chinese' },
  zht: { short: '繁', full: 'Traditional Chinese' },
};

export function languageLabel(code: string): { short: string; full: string } {
  return LANGUAGE_LABELS[code] ?? { short: code.toUpperCase(), full: code.toUpperCase() };
}
