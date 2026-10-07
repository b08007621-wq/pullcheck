import type { Market, SealedProduct } from '@/types/sealed';
import { classifySealed, sealedTypeRank } from '@/utils/sealedType';

import { ApiError, toApiError, withAbort } from './http';
import { matchesAllTokens, setNameScore, toSearchTokens } from './sealedQuery';
import {
  isMainSet,
  isMiscGroup,
  loadGroupCatalog,
  loadGroups,
  newestFirst,
  settleInBatches,
  type TcgcsvGroup,
} from './tcgcsv';

export type ProductKind = 'sealed' | 'singles';

const RECENT_SET_COUNT = 6;
const MAX_MATCHED_SETS = 6;

export async function searchProducts(
  query: string,
  market: Market,
  kind: ProductKind,
  signal?: AbortSignal,
): Promise<SealedProduct[]> {
  const tokens = toSearchTokens(query);
  if (tokens.length === 0) return [];

  const groups = await withAbort(loadGroups(market), signal);
  const targets = pickGroups(groups, tokens, kind);
  const settled = await withAbort(settleInBatches(targets, (group) => loadGroupCatalog(group)), signal);

  const lists: SealedProduct[][] = [];
  let firstError: unknown = null;
  for (const result of settled) {
    if (result.status === 'fulfilled') lists.push(kind === 'singles' ? result.value.singles : result.value.sealed);
    else firstError ??= result.reason;
  }
  if (lists.length === 0 && firstError) throw toApiError(firstError);

  return lists
    .flat()
    .filter((product) =>
      matchesAllTokens(`${product.name} ${product.setName} ${product.setCode ?? ''} ${product.cardNumber ?? ''}`, tokens),
    )
    .sort(kind === 'singles' ? compareSingles : compareProducts);
}

export function searchSealedProducts(query: string, signal?: AbortSignal): Promise<SealedProduct[]> {
  return searchProducts(query, 'en', 'sealed', signal);
}

export async function getSealedProduct(
  groupId: number,
  productId: number,
  signal?: AbortSignal,
  market: Market = 'en',
): Promise<SealedProduct> {
  const groups = await withAbort(loadGroups(market), signal);
  const group = groups.find((candidate) => candidate.groupId === groupId);
  if (!group) throw new ApiError('notFound');

  const catalog = await withAbort(loadGroupCatalog(group), signal);
  const product = [...catalog.sealed, ...catalog.singles].find((candidate) => candidate.productId === productId);
  if (!product) throw new ApiError('notFound');
  return product;
}

function pickGroups(groups: TcgcsvGroup[], tokens: string[], kind: ProductKind): TcgcsvGroup[] {
  const scored = groups.map((group) => ({ group, score: setNameScore(group.name, tokens) }));
  const best = Math.max(0, ...scored.map((entry) => entry.score));
  const misc = kind === 'sealed' ? groups.filter(isMiscGroup) : [];

  const sets =
    best > 0
      ? scored
          .filter((entry) => entry.score === best)
          .map((entry) => entry.group)
          .sort(newestFirst)
          .slice(0, MAX_MATCHED_SETS)
      : groups.filter(isMainSet).sort(newestFirst).slice(0, RECENT_SET_COUNT);

  return [...sets, ...misc.filter((group) => !sets.includes(group))];
}

function compareProducts(first: SealedProduct, second: SealedProduct): number {
  return (
    releaseTime(second) - releaseTime(first) ||
    sealedTypeRank(classifySealed(first.name)) - sealedTypeRank(classifySealed(second.name)) ||
    first.name.localeCompare(second.name)
  );
}

function compareSingles(first: SealedProduct, second: SealedProduct): number {
  return (
    releaseTime(second) - releaseTime(first) ||
    (second.prices?.market ?? 0) - (first.prices?.market ?? 0) ||
    first.name.localeCompare(second.name)
  );
}

function releaseTime(product: SealedProduct): number {
  const time = product.releasedOn ? Date.parse(product.releasedOn) : Number.NaN;
  return Number.isNaN(time) ? 0 : time;
}
