import type { DexCard, DexLanguage, DexSet } from '@/types/tcgdex';
import { nameScore, type ScanText, setCodeScore } from '@/utils/scanText';

import { findDexSetCard, getDexCard, getDexSet, isDigitalSet, loadDexSets, searchDexCards } from './tcgdex';

const MAX_SETS = 8;
const NAME_CONFIRMED = 0.72;
const CODE_NAME_FLOOR = 0.45;
const LOCALIZED: DexLanguage[] = ['de', 'fr'];
const GALLERY_SUFFIX: Record<string, string> = { TG: 'tg', GG: 'gg' };
const NAME_FALLBACK_BELOW = 0.5;
const NAME_WORDS = 2;
const NAME_RESULTS = 4;

export type ScanCandidate = {
  card: DexCard;
  language: DexLanguage;
  setCode: string | null;
  nameScore: number;
  codeScore: number;
};

export async function findScanCandidates(
  text: ScanText,
  nameText: string,
  signal?: AbortSignal,
): Promise<ScanCandidate[]> {
  const [english, japanese] = await Promise.all([
    englishCandidates(text, signal),
    japaneseCandidates(text, signal).catch(() => []),
  ]);
  const scored = withNameScores([...english, ...japanese], nameText);
  if (nameText && scored.length > 0 && scored.every((candidate) => candidate.nameScore < NAME_CONFIRMED)) {
    await Promise.all(scored.map((candidate) => scoreLocalizedNames(candidate, nameText, signal)));
  }
  if (nameText && scored.every((candidate) => candidate.nameScore < NAME_FALLBACK_BELOW)) {
    const byName = await nameCandidates(text, nameText, signal).catch(() => []);
    const known = new Set(scored.map((candidate) => candidate.card.id));
    scored.push(...withNameScores(byName, nameText).filter((candidate) => !known.has(candidate.card.id)));
  }
  return scored.sort((first, second) => rank(second) - rank(first));
}

function withNameScores(found: Omit<ScanCandidate, 'nameScore'>[], nameText: string): ScanCandidate[] {
  return found.map((candidate) => ({
    ...candidate,
    nameScore: nameText ? nameScore(nameText, candidate.card.name) : 0,
  }));
}

export function isConfirmed(candidates: ScanCandidate[]): boolean {
  const [best, next] = candidates;
  if (!best) return false;
  if (best.nameScore >= NAME_CONFIRMED) return !next || best.nameScore - next.nameScore >= 0.15;
  return best.codeScore >= 0.99 && best.nameScore >= CODE_NAME_FLOOR && (!next || next.codeScore < 0.99);
}

async function englishCandidates(text: ScanText, signal?: AbortSignal) {
  if (text.total === null) return [];
  const sets = await loadDexSets('en', signal);
  const suffix = GALLERY_SUFFIX[text.totalPrefix] ?? null;
  const matching = sets.filter(
    (set) =>
      !isDigitalSet(set.id) &&
      set.cardCount.official === text.total &&
      (!suffix || set.id.toLowerCase().endsWith(suffix)),
  );
  const details = await Promise.all(
    matching.slice(0, MAX_SETS).map((set) => getDexSet('en', set.id, signal).catch(() => null)),
  );
  const ranked = details
    .filter((set): set is DexSet => set !== null)
    .map((set) => ({ set, codeScore: setCodeScore(text.setCode, set.abbreviation?.official) }))
    .sort((first, second) => second.codeScore - first.codeScore);
  const cards = await Promise.all(
    ranked.map(({ set }) => findDexSetCard('en', set.id, text.number, signal).catch(() => null)),
  );
  return cards.flatMap((card, index) => {
    const entry = ranked[index];
    if (!card || !entry) return [];
    return [
      {
        card,
        language: 'en' as const,
        setCode: entry.set.abbreviation?.official ?? null,
        codeScore: entry.codeScore,
      },
    ];
  });
}

async function nameCandidates(text: ScanText, nameText: string, signal?: AbortSignal) {
  const words = [...new Set(nameText.match(/[A-Za-zÀ-ÿ]{4,}/g) ?? [])]
    .sort((first, second) => second.length - first.length)
    .slice(0, NAME_WORDS);
  const briefs = (
    await Promise.all(words.map((word) => searchDexCards('en', word, text.number, signal).catch(() => [])))
  )
    .flat()
    .filter((brief, index, all) => !isDigitalSet(brief.id) && all.findIndex((other) => other.id === brief.id) === index)
    .slice(0, NAME_RESULTS);
  const cards = await Promise.all(briefs.map((brief) => getDexCard('en', brief.id, signal).catch(() => null)));
  const found = await Promise.all(
    cards.map(async (card) => {
      if (!card) return null;
      const set = await getDexSet('en', card.set.id, signal).catch(() => null);
      const code = set?.abbreviation?.official ?? null;
      return { card, language: 'en' as const, setCode: code, codeScore: setCodeScore(text.setCode, code) };
    }),
  );
  return found.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

async function japaneseCandidates(text: ScanText, signal?: AbortSignal) {
  if (!text.setCode) return [];
  const code = text.setCode.toLowerCase();
  const sets = await loadDexSets('ja', signal);
  const set = sets.find((candidate) => candidate.id.toLowerCase() === code);
  if (!set) return [];
  const card = await findDexSetCard('ja', set.id, text.number, signal);
  return card ? [{ card, language: 'ja' as const, setCode: set.id, codeScore: 1 }] : [];
}

async function scoreLocalizedNames(candidate: ScanCandidate, nameText: string, signal?: AbortSignal) {
  if (candidate.language !== 'en') return;
  const settled = await Promise.allSettled(
    LOCALIZED.map((language) => getDexCard(language, candidate.card.id, signal)),
  );
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    candidate.nameScore = Math.max(candidate.nameScore, nameScore(nameText, result.value.name));
  }
}

function rank(candidate: ScanCandidate): number {
  return candidate.nameScore * 2 + candidate.codeScore * 0.5;
}
