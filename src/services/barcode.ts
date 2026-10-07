import type { Market, SealedProduct } from '@/types/sealed';

import { isMiscGroup, loadGroupCatalog, loadGroups, newestFirst, settleInBatches, type TcgcsvGroup } from './tcgcsv';

const MAX_GROUPS = 45;
const BATCH = 6;

export function normalizeBarcode(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+/, '');
}

export async function findProductByBarcode(code: string, market: Market = 'en', signal?: AbortSignal): Promise<SealedProduct | null> {
  const target = normalizeBarcode(code);
  if (target.length < 8) return null;

  const groups = await loadGroups(market);
  const misc = groups.filter(isMiscGroup);
  const recent = groups
    .filter((group) => !group.isSupplemental && !isMiscGroup(group))
    .sort(newestFirst)
    .slice(0, MAX_GROUPS);
  const ordered: TcgcsvGroup[] = [...misc, ...recent];

  for (let start = 0; start < ordered.length; start += BATCH) {
    if (signal?.aborted) return null;
    const settled = await settleInBatches(ordered.slice(start, start + BATCH), (group) => loadGroupCatalog(group));
    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      const match = result.value.sealed.find((product) => product.upc && normalizeBarcode(product.upc) === target);
      if (match) return match;
    }
  }
  return null;
}
