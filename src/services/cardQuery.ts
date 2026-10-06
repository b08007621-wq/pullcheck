export const MIN_NAME_LENGTH = 2;

const MAX_TOKENS = 6;
const SMART_APOSTROPHES = /[‘’ʼ`]/g;
const UNSUPPORTED_CHARACTERS = /[^0-9a-zÀ-ɏ'\s]/g;
const EDGE_APOSTROPHES = /^'+|'+$/g;

export function normalizeCardName(input: string): string {
  const tokens = input
    .toLowerCase()
    .replace(SMART_APOSTROPHES, "'")
    .replace(UNSUPPORTED_CHARACTERS, ' ')
    .split(/\s+/)
    .map((token) => token.replace(EDGE_APOSTROPHES, ''))
    .filter((token) => token.length > 0)
    .slice(0, MAX_TOKENS);

  return tokens.join('').length >= MIN_NAME_LENGTH ? tokens.join(' ') : '';
}

export function buildNameQuery(normalizedName: string): string {
  return normalizedName
    .split(' ')
    .map((token) => `name:${token}*`)
    .join(' ');
}
