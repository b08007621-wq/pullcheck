import type { Market, SealedProduct } from '@/types/sealed';
import { getMsrp } from '@/utils/msrp';
import { getSealedMarketPrice } from '@/utils/sealed';

import type { ProductKind } from './sealedProducts';
import { loadGroupCatalog, loadGroups, settleInBatches, type TcgcsvGroup } from './tcgcsv';

export type HomeSection = {
  title: string;
  subtitle?: string;
  products: SealedProduct[];
};

export type MarketHome = {
  sets: TcgcsvGroup[];
  sections: HomeSection[];
};

const SET_NAME = /^[A-Za-z]{1,6}[\d.]*[A-Za-z]?\d*:\s/;
const SKIP = /promo|energ|starter|deck|trainer kit|unnumbered/i;
const NEWEST_SETS = 3;
const SHOW_SETS = 8;
const ROW = 12;

export async function loadMarketHome(market: Market, kind: ProductKind): Promise<MarketHome> {
  const now = Date.now();
  const sets = (await loadGroups(market))
    .filter((group) => !group.isSupplemental && SET_NAME.test(group.name) && !SKIP.test(group.name))
    .filter((group) => group.publishedOn && Date.parse(group.publishedOn) <= now)
    .sort((first, second) => (second.publishedOn ?? '').localeCompare(first.publishedOn ?? ''));
  const newest = sets.slice(0, NEWEST_SETS);
  const settled = await settleInBatches(newest, (group) => loadGroupCatalog(group));
  const catalogs = settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));

  if (kind === 'singles') {
    const singles = catalogs.flatMap((catalog) => catalog.singles).filter((single) => price(single) !== null);
    return {
      sets: sets.slice(0, SHOW_SETS),
      sections: [
        { title: 'Chase cards', subtitle: newest.map((group) => group.abbreviation).filter(Boolean).join(' · '), products: top(singles) },
      ],
    };
  }

  const sealed = catalogs.flatMap((catalog) => catalog.sealed).filter((product) => price(product) !== null);
  const sections: HomeSection[] = [{ title: 'Top sealed', subtitle: 'Newest sets', products: top(sealed) }];
  if (market === 'en') {
    const withMsrp = sealed.flatMap((product) => {
      const msrp = getMsrp(product);
      const value = price(product);
      return msrp && value ? [{ product, ratio: value / msrp.amount }] : [];
    });
    const under = withMsrp.filter((entry) => entry.ratio < 1).sort((first, second) => first.ratio - second.ratio);
    const over = withMsrp.filter((entry) => entry.ratio > 1.2).sort((first, second) => second.ratio - first.ratio);
    if (under.length > 0) sections.push({ title: 'Under MSRP', subtitle: 'Below retail right now', products: under.slice(0, ROW).map((entry) => entry.product) });
    if (over.length > 0) sections.push({ title: 'Big premiums', subtitle: 'Way over retail', products: over.slice(0, ROW).map((entry) => entry.product) });
  } else if (newest[0]) {
    const latest = sealed.filter((product) => product.groupId === newest[0]?.groupId);
    if (latest.length > 0) sections.push({ title: 'New drop', subtitle: newest[0].name.replace(SET_NAME, ''), products: top(latest) });
  }
  return { sets: sets.slice(0, SHOW_SETS), sections };
}

export function price(product: SealedProduct): number | null {
  const value = getSealedMarketPrice(product);
  return value && value.amount > 0 ? value.amount : null;
}

function top(products: SealedProduct[]): SealedProduct[] {
  return [...products].sort((first, second) => (price(second) ?? 0) - (price(first) ?? 0)).slice(0, ROW);
}
