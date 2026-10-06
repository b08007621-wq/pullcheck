import type { DexLanguage } from '@/types/tcgdex';

export type ScanText = {
  number: string;
  total: number | null;
  totalPrefix: string;
  printed: string;
  setCode: string | null;
  language: DexLanguage | null;
};

const PREFIX = '(TG|GG|SV|RC|SH|H)?';
const DIGIT = '[0-9OoIl|]';
const NUMBER = new RegExp(
  `(?:^|[^0-9])${PREFIX}([0-9O]${DIGIT}{0,2})\\s?[/⁄]\\s?${PREFIX}(${DIGIT}{2,3})(?![0-9])`,
  'g',
);
const LANGUAGE_TOKENS: Record<string, DexLanguage> = {
  EN: 'en',
  DE: 'de',
  FR: 'fr',
  ES: 'es',
  IT: 'it',
  PT: 'pt',
};

export function parseScanText(raw: string): ScanText | null {
  const lines = raw.split(/\n+/);
  for (const line of lines) {
    for (const match of line.matchAll(NUMBER)) {
      const [whole, prefix = '', digits, totalPrefix = '', totalDigits] = match;
      if (!digits || !totalDigits) continue;
      const numberDigits = fixDigits(digits);
      const total = Number.parseInt(fixDigits(totalDigits), 10);
      const value = Number.parseInt(numberDigits, 10);
      if (!Number.isFinite(total) || !Number.isFinite(value)) continue;
      if (!totalPrefix && (total < 10 || value === 0 || value > total * 2 + 10)) continue;
      const start = (match.index ?? 0) + whole.indexOf(prefix + digits);
      const before = line.slice(0, Math.max(0, start));
      const hints = readHints(before);
      const number = `${prefix}${numberDigits}`;
      return {
        number,
        total,
        totalPrefix,
        printed: `${number}/${totalPrefix}${fixDigits(totalDigits)}`,
        setCode: hints.setCode,
        language: hints.language,
      };
    }
  }
  return null;
}

export function nameScore(ocrText: string, cardName: string): number {
  const haystack = letters(ocrText);
  const needle = letters(cardName.replace(/\b(ex|EX|GX|V|VMAX|VSTAR|BREAK|LV\.?X|δ|◇|☆|Prime|LEGEND)\b/g, ''));
  if (needle.length < 3 || haystack.length === 0) return 0;
  if (haystack.includes(needle)) return 1;
  let best = 0;
  for (const size of [needle.length - 1, needle.length, needle.length + 1]) {
    if (size < 2 || size > haystack.length) continue;
    for (let start = 0; start + size <= haystack.length; start += 1) {
      const window = haystack.slice(start, start + size);
      const similarity = 1 - levenshtein(window, needle) / Math.max(window.length, needle.length);
      if (similarity > best) best = similarity;
    }
  }
  return best;
}

export function setCodeScore(setCode: string | null, abbreviation: string | null | undefined): number {
  if (!setCode || !abbreviation) return 0;
  const read = setCode.toUpperCase();
  const actual = abbreviation.toUpperCase();
  if (read === actual) return 1;
  if (read.startsWith(actual) || actual.startsWith(read)) return 0.7;
  return 1 - levenshtein(read, actual) / Math.max(read.length, actual.length);
}

function readHints(before: string): { setCode: string | null; language: DexLanguage | null } {
  const tokens = before
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-3);
  let language: DexLanguage | null = null;
  let setCode: string | null = null;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index] ?? '';
    const upper = token.toUpperCase();
    const glued = /^([A-Z0-9]{2,4})(EN|DE|FR|ES|IT|PT)$/.exec(upper);
    if (!language && LANGUAGE_TOKENS[upper]) {
      language = LANGUAGE_TOKENS[upper] ?? null;
      continue;
    }
    if (!setCode && glued?.[1] && glued[2]) {
      setCode = glued[1];
      language = language ?? LANGUAGE_TOKENS[glued[2]] ?? null;
      continue;
    }
    if (!setCode && /^[A-Za-z]{1,4}\d{0,2}[A-Za-z]?$/.test(token) && token.length >= 2) {
      setCode = token;
    }
  }
  return { setCode, language };
}

function fixDigits(value: string): string {
  return value.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1');
}

function letters(value: string): string {
  return value
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/ñ/g, 'n')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z]/g, '');
}

function levenshtein(first: string, second: string): number {
  if (first === second) return 0;
  let previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let row = 1; row <= first.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= second.length; column += 1) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1;
      current[column] = Math.min(
        (previous[column] ?? 0) + 1,
        (current[column - 1] ?? 0) + 1,
        (previous[column - 1] ?? 0) + cost,
      );
    }
    previous = current;
  }
  return previous[second.length] ?? Math.max(first.length, second.length);
}
