import type { ImportEntry } from '@/state/collectionReducer';
import type { DexCard, DexSetBrief } from '@/types/tcgdex';
import type { ImportRow } from '@/utils/csvImport';
import { nameScore } from '@/utils/scanText';

import { normalizeText } from './sealedQuery';
import { dexToCard, findDexSetCard, getDexCard, isDigitalSet, loadDexSets, searchDexCards } from './tcgdex';

export type ImportMiss = {
  row: ImportRow;
  reason: string;
};

export type ImportResult = {
  entries: (ImportEntry & { row: ImportRow })[];
  missed: ImportMiss[];
};

const CONCURRENCY = 4;
const NAME_FLOOR = 0.55;

export async function matchImportRows(
  rows: ImportRow[],
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<ImportResult> {
  const sets = (await loadDexSets('en', signal)).filter((set) => !isDigitalSet(set.id));
  const resolveSet = setResolver(sets);
  const entries: ImportResult['entries'] = [];
  const missed: ImportMiss[] = [];
  let next = 0;
  let done = 0;

  const worker = async () => {
    while (next < rows.length) {
      if (signal?.aborted) return;
      const row = rows[next++] as ImportRow;
      try {
        const outcome = await matchRow(row, resolveSet, signal);
        if ('reason' in outcome) missed.push(outcome);
        else entries.push(outcome);
      } catch {
        missed.push({ row, reason: 'Couldn’t reach the card database' });
      }
      done += 1;
      onProgress(done, rows.length);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  entries.sort((first, second) => first.row.line - second.row.line);
  missed.sort((first, second) => first.row.line - second.row.line);
  return { entries, missed };
}

async function matchRow(
  row: ImportRow,
  resolveSet: (name: string, code: string) => DexSetBrief | null,
  signal?: AbortSignal,
): Promise<(ImportEntry & { row: ImportRow }) | ImportMiss> {
  if (row.sealed) return { row, reason: 'Sealed products aren’t imported yet' };
  if (/japan|jp|日本/i.test(row.language)) return { row, reason: 'Japanese cards aren’t imported yet' };
  let found: DexCard | null = null;
  const set = resolveSet(row.set, row.setCode);
  if (set && row.number) found = await findDexSetCard('en', set.id, row.number, signal).catch(() => null);
  if (found && nameScore(row.name, found.name) < NAME_FLOOR) found = null;
  if (!found && row.number) found = await searchByName(row, signal);
  if (!found) return { row, reason: row.number ? 'No card with that name and number' : 'No card number to match' };
  const card = await dexToCard(found, 'en', signal);
  return {
    row,
    card,
    version: { variant: row.variant, condition: row.condition },
    quantity: row.quantity,
    paid: row.paid,
    grading: row.grading,
    binder: row.binder,
  };
}

async function searchByName(row: ImportRow, signal?: AbortSignal): Promise<DexCard | null> {
  const word = row.name.split(/\s+/).find((part) => part.length >= 3) ?? row.name;
  const briefs = (await searchDexCards('en', word, row.number, signal).catch(() => [])).filter(
    (brief) => !isDigitalSet(brief.id) && nameScore(row.name, brief.name) >= NAME_FLOOR,
  );
  if (briefs.length === 0) return null;
  const cards = await Promise.all(briefs.slice(0, 6).map((brief) => getDexCard('en', brief.id, signal).catch(() => null)));
  const wantedSet = normalizeText(row.set);
  const ranked = cards
    .filter((card): card is DexCard => card !== null)
    .sort((first, second) => setFit(second, wantedSet) - setFit(first, wantedSet));
  const best = ranked[0];
  if (!best) return null;
  if (wantedSet && ranked.length > 1 && setFit(best, wantedSet) === 0) return null;
  return best;
}

function setFit(card: DexCard, wanted: string): number {
  if (!wanted) return 0;
  const name = normalizeText(card.set.name);
  if (name === wanted) return 3;
  if (wanted.endsWith(name) || name.endsWith(wanted)) return 2;
  if (wanted.includes(name) || name.includes(wanted)) return 1;
  return 0;
}

function setResolver(sets: DexSetBrief[]) {
  const cache = new Map<string, DexSetBrief | null>();
  return (name: string, code: string): DexSetBrief | null => {
    const key = `${name}|${code}`;
    if (cache.has(key)) return cache.get(key) ?? null;
    const wanted = normalizeText(name.replace(/^[A-Za-z]{1,6}[\d.]*[a-z]?:\s*/, ''));
    const byCode = code ? sets.find((set) => set.id.toLowerCase() === code.toLowerCase()) : undefined;
    const exact = sets.filter((set) => normalizeText(set.name) === wanted);
    const partial = sets.filter((set) => {
      const other = normalizeText(set.name);
      return wanted.length > 2 && (wanted.endsWith(` ${other}`) || other.endsWith(` ${wanted}`) || other === wanted.replace(/ set$/, ''));
    });
    const match = byCode ?? (exact.length === 1 ? exact[0] : undefined) ?? (partial.length === 1 ? partial[0] : undefined) ?? null;
    cache.set(key, match);
    return match;
  };
}
