import { MIN_NAME_LENGTH } from './cardQuery';

const MAX_TOKENS = 8;

const ALIASES: Record<string, string[]> = {
  etb: ['elite', 'trainer', 'box'],
  etbs: ['elite', 'trainer', 'box'],
  pc: ['pokemon', 'center'],
  upc: ['ultra', 'premium', 'collection'],
  spc: ['super', 'premium', 'collection'],
  packs: ['pack'],
  boxes: ['box'],
  bundles: ['bundle'],
  tins: ['tin'],
  blisters: ['blister'],
  collections: ['collection'],
};

const PRODUCT_WORDS = new Set([
  'elite',
  'trainer',
  'box',
  'booster',
  'bundle',
  'pack',
  'blister',
  'tin',
  'mini',
  'collection',
  'premium',
  'ultra',
  'super',
  'pokemon',
  'center',
  'case',
  'display',
  'sleeved',
  'build',
  'battle',
  'half',
  'set',
  'of',
  'the',
  'and',
]);

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[éÉ]/g, 'e')
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[^0-9a-z'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toSearchTokens(query: string): string[] {
  const words = normalizeText(query)
    .split(' ')
    .filter((word) => word.length > 0);
  if (words.join('').length < MIN_NAME_LENGTH) return [];

  const tokens = words.flatMap((word) => ALIASES[word] ?? [word]);
  return [...new Set(tokens)].slice(0, MAX_TOKENS);
}

export function setNameScore(setName: string, tokens: string[]): number {
  const words = normalizeText(setName).split(' ');
  return tokens.filter(
    (token) => !PRODUCT_WORDS.has(token) && words.some((word) => word.startsWith(token)),
  ).length;
}

export function matchesAllTokens(haystack: string, tokens: string[]): boolean {
  const normalized = normalizeText(haystack);
  return tokens.every((token) => normalized.includes(token));
}
