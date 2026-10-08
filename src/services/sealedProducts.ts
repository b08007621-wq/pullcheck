import type { Game } from '@/types/card';
import type { Market, SealedProduct } from '@/types/sealed';
import { classifySealed, sealedTypeRank } from '@/utils/sealedType';

import { ApiError, toApiError, withAbort } from './http';
import { matchesAllTokens, normalizeText, setNameScore, toSearchTokens } from './sealedQuery';
import {
  displaySetName,
  isMainSet,
  loadGameGroups,
  loadGroupCatalog,
  loadGroups,
  newestFirst,
  settleInBatches,
  type TcgcsvGroup,
} from './tcgcsv';

export type ProductKind = 'sealed' | 'singles';

const RECENT_SET_COUNT = 6;
const MAX_MATCHED_SETS = 6;
const MISC_GROUP_NAME = /^miscellaneous cards & products$/i;

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
  game?: Game,
): Promise<SealedProduct> {
  const groups = await withAbort(game && game !== 'pokemon' ? loadGameGroups(game) : loadGroups(market), signal);
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
  const misc = kind === 'sealed' ? groups.filter((group) => MISC_GROUP_NAME.test(group.name)) : [];

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

export type SetSealedTarget = {
  game: Game;
  name: string;
  code: string | null;
};

export async function getSetSealed(target: SetSealedTarget, signal?: AbortSignal): Promise<SealedProduct[]> {
  const groups = await withAbort(target.game === 'pokemon' ? loadGroups('en') : loadGameGroups(target.game), signal);
  const matched = matchSetGroups(groups, target);
  if (matched.length === 0) return [];
  const settled = await withAbort(settleInBatches(matched, (group) => loadGroupCatalog(group)), signal);

  const products: SealedProduct[] = [];
  let firstError: unknown = null;
  for (const result of settled) {
    if (result.status === 'fulfilled') products.push(...result.value.sealed);
    else firstError ??= result.reason;
  }
  if (products.length === 0 && firstError) throw toApiError(firstError);

  return products.sort(
    (first, second) =>
      sealedTypeRank(classifySealed(first.name)) - sealedTypeRank(classifySealed(second.name)) ||
      first.name.localeCompare(second.name),
  );
}

function matchSetGroups(groups: TcgcsvGroup[], target: SetSealedTarget): TcgcsvGroup[] {
  const wanted = normalizeText(target.name);
  const code = (target.code ?? '').trim().toLowerCase();
  const candidates = groups.filter((group) => !MISC_GROUP_NAME.test(group.name));
  const shown = (group: TcgcsvGroup) => normalizeText(target.game === 'pokemon' ? displaySetName(group) : group.name);

  const exact = candidates.filter((group) => shown(group) === wanted);
  if (exact.length > 0) return exact.sort(newestFirst).slice(0, MAX_MATCHED_SETS);

  const byCode = code
    ? candidates.filter((group) => (group.abbreviation ?? '').trim().toLowerCase() === code && !group.isSupplemental)
    : [];
  if (byCode.length > 0) return byCode.sort(newestFirst).slice(0, 1);

  if (wanted.length < 5) return [];
  return candidates
    .filter((group) => {
      const name = shown(group);
      return name.includes(wanted) || wanted.includes(name);
    })
    .filter((group) => shown(group).length >= 5)
    .sort(newestFirst)
    .slice(0, 2);
}
