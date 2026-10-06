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
const FINE_SURE = 0.55;
const FINE_SURE_GAP = 0.15;
const FINE_BACKUP = 0.45;
const FINE_STEADY = 0.5;
const FINE_STEADY_GAP = 0.1;
const FINE_PRESENT = 0.35;
const FINE_GUESS = 0.3;
const NUMBER_PICK_FINE = 0.3;
const MAX_CANDIDATES = 4;
const MAX_ALTERNATIVES = 6;
const LANGUAGES: DexLanguage[] = ['en', 'ja'];

export type VisionVerdict = 'sure' | 'maybe' | 'none';

export function judgeMatch(match: VisionMatch, previousTop: string | null): VisionVerdict {
  const top = match.results[0]?.key ?? null;
  if (!top) return 'none';
  const steady = top === previousTop;
  if (match.fine === null) {
    if (match.best >= SURE_SCORE && match.gap >= SURE_GAP) return 'sure';
    if (steady && match.best >= STEADY_SCORE && match.gap >= STEADY_GAP) return 'sure';
    return match.best >= PRESENT_SCORE ? 'maybe' : 'none';
  }
  if (match.fine >= FINE_SURE && match.fineGap >= FINE_SURE_GAP) return 'sure';
  if (match.best >= SURE_SCORE && match.gap >= SURE_GAP && match.fine >= FINE_BACKUP) return 'sure';
  if (steady && match.fine >= FINE_STEADY && match.fineGap >= FINE_STEADY_GAP) return 'sure';
  return match.fine >= FINE_PRESENT || match.best >= PRESENT_SCORE ? 'maybe' : 'none';
}

export function canGuess(match: VisionMatch): boolean {
  if (match.results.length === 0) return false;
  return match.fine === null ? match.best >= GUESS_SCORE : match.fine >= FINE_GUESS || match.best >= GUESS_SCORE;
}

export function samePictureKeys(match: VisionMatch): string[] {
  return match.results.filter((result) => result.same).map((result) => result.key);
}

export function guessKeys(match: VisionMatch): string[] {
  const floor = match.best - 0.08;
  return match.results
    .filter((result) => result.same || result.score >= floor || (result.fine ?? 0) >= FINE_GUESS)
    .map((result) => result.key);
}

export function alternativeKeys(match: VisionMatch, chosen: string[]): string[] {
  const seen = new Set(chosen);
  return match.results
    .map((result) => result.key)
    .filter((key) => !seen.has(key))
    .slice(0, MAX_ALTERNATIVES);
}

export function numberPickKeys(match: VisionMatch, text: ScanText): string[] {
  return match.results
    .filter((result) => (result.fine === null || result.fine >= NUMBER_PICK_FINE) && keyNumberMatches(result.key, text))
    .map((result) => result.key);
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

function keyNumberMatches(key: string, text: ScanText): boolean {
  return sameNumber(key.slice(key.lastIndexOf('-') + 1), text.number);
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
