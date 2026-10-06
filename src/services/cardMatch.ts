import type { Card } from '@/types/card';
import type { CardMatch, CardReading } from '@/types/identify';

import { buildNameQuery, normalizeCardName } from './cardQuery';
import { enrichCardPrices } from './cardPrices';
import { findExtraCard } from './extraCards';
import { withAbort } from './http';
import { queryCards } from './pokemonTcg';

const CANDIDATE_LIMIT = 24;
const PROMO_CODES = /^(MEP|SVP|PR)$/;

type ParsedNumber = {
  query: string;
  number: string;
  total: number | null;
};

export async function matchCard(reading: CardReading, signal?: AbortSignal): Promise<CardMatch> {
  const name = normalizeCardName(reading.name);
  const parsed = parseCollectorNumber(reading.collectorNumber);
  const setCode = /^[A-Z0-9]{2,6}$/.test(reading.setCode.trim().toUpperCase())
    ? reading.setCode.trim().toUpperCase()
    : null;

  if (setCode && PROMO_CODES.test(setCode) && name) {
    const promos = await withAbort(findExtraCard(name, parsed?.number ?? null, true), signal).catch(() => []);
    if (promos.length === 1 && promos[0]) return { status: 'single', card: promos[0] };
    if (promos.length > 1) return { status: 'multiple', cards: promos };
  }

  const attempts = buildAttempts(name, parsed, setCode);
  for (const attempt of attempts) {
    const page = await queryCards(attempt.query, 1, CANDIDATE_LIMIT, signal);
    if (page.cards.length === 0) continue;

    const ranked = rankCandidates(page.cards, name, parsed, setCode);
    const best = ranked[0];
    if (best && (ranked.length === 1 || (attempt.precise && isStrongMatch(best, name, parsed, setCode)))) {
      const [card] = await enrichCardPrices([best]);
      return { status: 'single', card: card ?? best };
    }
    return { status: 'multiple', cards: await enrichCardPrices(ranked) };
  }
  if (name) {
    const promos = await withAbort(findExtraCard(name, parsed?.number ?? null), signal).catch(() => []);
    if (promos.length === 1 && promos[0]) return { status: 'single', card: promos[0] };
    if (promos.length > 1) return { status: 'multiple', cards: promos };
  }
  return { status: 'none' };
}

export function parseCollectorNumber(value: string): ParsedNumber | null {
  const cleaned = value.toUpperCase().replace(/\s+/g, '');
  const match = /^([A-Z]*\d+[A-Z]?)(?:\/([A-Z]*)(\d+))?$/.exec(cleaned);
  const printed = match?.[1];
  if (!match || !printed) return null;
  const total = match[3] ? Number.parseInt(match[3], 10) : null;
  const numeric = /^\d+$/.test(printed);
  return {
    query: numeric ? String(Number.parseInt(printed, 10)) : printed,
    number: normalizeNumber(printed),
    total: total && !match[2] ? total : null,
  };
}

function buildAttempts(name: string, parsed: ParsedNumber | null, setCode: string | null) {
  const nameQuery = name ? buildNameQuery(name) : '';
  const numberQuery = parsed ? `number:${parsed.query}` : '';
  const totalQuery = parsed?.total ? `set.printedTotal:${parsed.total}` : '';
  const codeQuery = setCode ? `set.ptcgoCode:${setCode}` : '';

  const attempts: { query: string; precise: boolean }[] = [];
  const add = (parts: string[], precise: boolean) => {
    const query = parts.filter(Boolean).join(' ');
    if (query && !attempts.some((attempt) => attempt.query === query)) attempts.push({ query, precise });
  };

  if (nameQuery && numberQuery) {
    if (codeQuery) add([nameQuery, numberQuery, codeQuery], true);
    if (totalQuery) add([nameQuery, numberQuery, totalQuery], true);
    add([nameQuery, numberQuery], true);
  }
  if (numberQuery && codeQuery) add([numberQuery, codeQuery], true);
  if (numberQuery && totalQuery) add([numberQuery, totalQuery], true);
  if (nameQuery) add([nameQuery], false);
  return attempts;
}

function rankCandidates(cards: Card[], name: string, parsed: ParsedNumber | null, setCode: string | null): Card[] {
  return [...cards].sort((first, second) => score(second, name, parsed, setCode) - score(first, name, parsed, setCode));
}

function score(card: Card, name: string, parsed: ParsedNumber | null, setCode: string | null): number {
  let points = 0;
  if (name && normalizeCardName(card.name) === name) points += 4;
  if (parsed && normalizeNumber(card.number) === parsed.number) points += 3;
  if (parsed?.total && card.set.printedTotal === parsed.total) points += 2;
  if (setCode && card.set.ptcgoCode?.toUpperCase() === setCode) points += 2;
  return points;
}

function isStrongMatch(card: Card, name: string, parsed: ParsedNumber | null, setCode: string | null): boolean {
  const numberMatches = parsed !== null && normalizeNumber(card.number) === parsed.number;
  const setMatches =
    (setCode !== null && card.set.ptcgoCode?.toUpperCase() === setCode) ||
    (parsed?.total != null && card.set.printedTotal === parsed.total);
  const nameMatches = !name || normalizeCardName(card.name) === name;
  return numberMatches && setMatches && nameMatches;
}

function normalizeNumber(value: string): string {
  const upper = value.toUpperCase();
  return /^\d+$/.test(upper) ? String(Number.parseInt(upper, 10)) : upper.replace(/^([A-Z]+)0+(\d)/, '$1$2');
}
