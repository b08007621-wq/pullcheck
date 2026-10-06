import type { DexLanguage } from '@/types/tcgdex';
import type { ScanText } from '@/utils/scanText';

import type { VisionMatch } from './ocrBridge';
import type { ScanCandidate } from './scanMatch';
import { getDexCard } from './tcgdex';

const SURE_SCORE = 0.75;
const SURE_GAP = 0.05;
const STEADY_SCORE = 0.7;
const STEADY_GAP = 0.02;
const PRESENT_SCORE = 0.68;
const GUESS_SCORE = 0.62;
const MAX_CANDIDATES = 4;
const LANGUAGES: DexLanguage[] = ['en', 'ja'];

export type VisionVerdict = 'sure' | 'maybe' | 'none';

export function judgeMatch(match: VisionMatch, previousTop: string | null): VisionVerdict {
  const top = match.results[0]?.key ?? null;
  if (!top) return 'none';
  if (match.best >= SURE_SCORE && match.gap >= SURE_GAP) return 'sure';
  if (match.best >= STEADY_SCORE && match.gap >= STEADY_GAP && top === previousTop) return 'sure';
  return match.best >= PRESENT_SCORE ? 'maybe' : 'none';
}

export function canGuess(match: VisionMatch): boolean {
  return match.best >= GUESS_SCORE && match.results.length > 0;
}

export function samePictureKeys(match: VisionMatch): string[] {
  return match.results.filter((result) => result.same).map((result) => result.key);
}

export function guessKeys(match: VisionMatch): string[] {
  const floor = match.best - 0.08;
  return match.results.filter((result) => result.same || result.score >= floor).map((result) => result.key);
}

export async function visionCandidates(
  keys: string[],
  text: ScanText | null,
  signal?: AbortSignal,
): Promise<ScanCandidate[]> {
  const parsed = keys.map(parseKey).filter((entry): entry is { language: DexLanguage; id: string } => entry !== null);
  const ordered = text ? [...parsed].sort((first, second) => printedScore(second.id, text) - printedScore(first.id, text)) : parsed;
  const settled = await Promise.allSettled(
    ordered.slice(0, MAX_CANDIDATES).map(async ({ language, id }) => ({
      card: await getDexCard(language, id, signal),
      language,
    })),
  );
  const found: ScanCandidate[] = [];
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    const { card, language } = result.value;
    found.push({ card, language, setCode: null, nameScore: 0, codeScore: 0 });
  }
  if (!text) return found;
  return found.sort((first, second) => printedFit(second, text) - printedFit(first, text));
}

export function printedMatches(candidate: ScanCandidate, text: ScanText): boolean {
  return printedFit(candidate, text) >= 2;
}

function parseKey(key: string): { language: DexLanguage; id: string } | null {
  const split = key.indexOf(':');
  if (split < 0) return null;
  const language = key.slice(0, split) as DexLanguage;
  return LANGUAGES.includes(language) ? { language, id: key.slice(split + 1) } : null;
}

function printedScore(id: string, text: ScanText): number {
  return sameNumber(id.slice(id.lastIndexOf('-') + 1), text.number) ? 1 : 0;
}

function printedFit(candidate: ScanCandidate, text: ScanText): number {
  let fit = 0;
  if (sameNumber(candidate.card.localId, text.number)) fit += 2;
  const official = candidate.card.set.cardCount?.official;
  if (text.total !== null && official === text.total) fit += 1;
  if (text.language && text.language === candidate.language) fit += 0.5;
  return fit;
}

function sameNumber(localId: string, number: string): boolean {
  const strip = (value: string) => value.toUpperCase().replace(/^([A-Z]*)0+(?=\d)/, '$1');
  return strip(localId) === strip(number);
}
