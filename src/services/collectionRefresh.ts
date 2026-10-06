import type { Card } from '@/types/card';
import type { CollectionItem } from '@/types/collection';
import type { Market, SealedProduct } from '@/types/sealed';

import { enrichCardPrices } from './cardPrices';
import { isExtraCardId, refreshExtraCards } from './extraCards';
import { queryCards } from './pokemonTcg';
import { fetchPricesUpdatedAt } from './priceClock';
import { loadGroupCatalogChecked, loadGroups, settleInBatches } from './tcgcsv';

const IDS_PER_REQUEST = 20;

export type PriceRefresh = {
  cards: Card[];
  products: SealedProduct[];
  failedBatches: number;
  pricesAsOf: string | null;
};

type Wanted = Map<Market, Map<number, Set<number>>>;

export async function fetchCollectionPrices(items: CollectionItem[]): Promise<PriceRefresh> {
  const cardIds = [...new Set(items.flatMap((item) => (item.kind === 'card' ? [item.card.id] : [])))];
  const wanted: Wanted = new Map();
  for (const item of items) {
    if (item.kind !== 'sealed') continue;
    const market = item.product.market ?? 'en';
    const byGroup = wanted.get(market) ?? new Map<number, Set<number>>();
    const ids = byGroup.get(item.product.groupId) ?? new Set<number>();
    ids.add(item.product.productId);
    byGroup.set(item.product.groupId, ids);
    wanted.set(market, byGroup);
  }

  const [cardResult, sealedResult, pricesAsOf] = await Promise.all([
    fetchCardsByIds(cardIds),
    refreshSealed(wanted),
    fetchPricesUpdatedAt({ force: true }),
  ]);

  return {
    cards: cardResult.cards,
    products: sealedResult.products,
    failedBatches: cardResult.failed + sealedResult.failed,
    pricesAsOf,
  };
}

export async function fetchCardsByIds(allIds: string[]): Promise<{ cards: Card[]; failed: number }> {
  const cards: Card[] = [];
  let failed = 0;
  const extraIds = allIds.filter(isExtraCardId);
  const ids = allIds.filter((id) => !isExtraCardId(id));

  if (extraIds.length > 0) {
    try {
      cards.push(...(await refreshExtraCards(extraIds)));
    } catch {
      failed += 1;
    }
  }

  for (let index = 0; index < ids.length; index += IDS_PER_REQUEST) {
    const chunk = ids.slice(index, index + IDS_PER_REQUEST);
    try {
      const page = await queryCards(
        chunk.map((id) => `id:${id}`).join(' OR '),
        1,
        chunk.length,
        undefined,
        { force: true },
      );
      if (page.stale) failed += 1;
      else cards.push(...page.cards);
    } catch {
      failed += 1;
    }
  }

  return { cards: cards.length > 0 ? await enrichCardPrices(cards) : cards, failed };
}

async function refreshSealed(wanted: Wanted): Promise<{ products: SealedProduct[]; failed: number }> {
  const products: SealedProduct[] = [];
  let failed = 0;

  for (const [market, byGroup] of wanted) {
    try {
      const groups = await loadGroups(market);
      const targets = groups.filter((group) => byGroup.has(group.groupId));
      failed += byGroup.size - targets.length;
      const settled = await settleInBatches(targets, (group) => loadGroupCatalogChecked(group, { force: true }));
      settled.forEach((result, index) => {
        const group = targets[index];
        if (!group || result.status !== 'fulfilled' || result.value.stale) {
          failed += 1;
          return;
        }
        const ids = byGroup.get(group.groupId);
        const catalog = result.value.value;
        products.push(...[...catalog.sealed, ...catalog.singles].filter((product) => ids?.has(product.productId)));
      });
    } catch {
      failed += byGroup.size;
    }
  }
  return { products, failed };
}
