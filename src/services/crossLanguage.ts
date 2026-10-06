import type { Card } from '@/types/card';
import type { SealedProduct } from '@/types/sealed';

import { enrichCardPrices } from './cardPrices';
import { searchCardsByName } from './pokemonTcg';
import { normalizeText, setNameScore, toSearchTokens } from './sealedQuery';
import { isMainSet, loadGroupCatalog, loadGroups, newestFirst, settleInBatches, type TcgcsvGroup } from './tcgcsv';

const MATCHED_SETS = 2;
const RECENT_SETS = 4;
const LIMIT = 8;

export function baseCardName(name: string): string {
  return name
    .replace(/\s+-\s+.*$/, '')
    .replace(/[[(][^\])]*[\])]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function findJapaneseVersions(card: Card, signal?: AbortSignal): Promise<SealedProduct[]> {
  const target = normalizeText(baseCardName(card.name));
  if (!target) return [];
  const groups = (await loadGroups('jp')).filter((group) => !group.isSupplemental);
  const setTokens = toSearchTokens(card.set.name);
  const matched = groups
    .map((group) => ({ group, score: setTokens.length > 0 ? setNameScore(group.name, setTokens) : 0 }))
    .filter((entry) => entry.score > 0)
    .sort((first, second) => second.score - first.score || newestFirst(first.group, second.group))
    .slice(0, MATCHED_SETS)
    .map((entry) => entry.group);
  const recent = groups.filter(isMainSet).sort(newestFirst).slice(0, RECENT_SETS);
  const targets: TcgcsvGroup[] = [...matched, ...recent.filter((group) => !matched.includes(group))];

  const settled = await settleInBatches(targets, (group) => loadGroupCatalog(group));
  if (signal?.aborted) return [];
  const matchedIds = new Set(matched.map((group) => group.groupId));
  return settled
    .flatMap((result) => (result.status === 'fulfilled' ? result.value.singles : []))
    .filter((single) => normalizeText(baseCardName(single.name)) === target)
    .sort(
      (first, second) =>
        Number(matchedIds.has(second.groupId)) - Number(matchedIds.has(first.groupId)) ||
        (second.prices?.market ?? 0) - (first.prices?.market ?? 0),
    )
    .slice(0, LIMIT);
}

export async function findEnglishVersions(product: SealedProduct, signal?: AbortSignal): Promise<Card[]> {
  const name = baseCardName(product.name);
  if (!name) return [];
  const { cards } = await searchCardsByName(name, 1, signal);
  const target = normalizeText(name);
  const exact = cards.filter((card) => normalizeText(baseCardName(card.name)) === target).slice(0, LIMIT);
  return enrichCardPrices(exact);
}
