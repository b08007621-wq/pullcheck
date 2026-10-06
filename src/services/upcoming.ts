import type { SealedProduct } from '@/types/sealed';
import { classifySealed, sealedTypeRank } from '@/utils/sealedType';

import {
  displaySetName,
  loadGroupCatalog,
  loadGroups,
  settleInBatches,
  type TcgcsvGroup,
} from './tcgcsv';

export type UpcomingSet = {
  groupId: number;
  name: string;
  releasedOn: string;
  products: SealedProduct[];
};

const MAX_SETS = 4;
const MAX_DAYS_AHEAD = 270;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function loadUpcoming(): Promise<UpcomingSet[]> {
  const groups = await loadGroups('en');
  const today = startOfToday();
  const upcoming = groups
    .filter((group) => !group.isSupplemental && isWithinWindow(group, today))
    .sort((first, second) => releaseTime(first) - releaseTime(second))
    .slice(0, MAX_SETS);

  const settled = await settleInBatches(upcoming, loadGroupCatalog);
  const sets: UpcomingSet[] = [];
  settled.forEach((result, index) => {
    const group = upcoming[index];
    if (!group || result.status !== 'fulfilled') return;
    const products = result.value.sealed
      .filter((product) => hasPrice(product))
      .sort(
        (first, second) =>
          sealedTypeRank(classifySealed(first.name)) - sealedTypeRank(classifySealed(second.name)) ||
          (price(second) ?? 0) - (price(first) ?? 0),
      );
    sets.push({
      groupId: group.groupId,
      name: displaySetName(group),
      releasedOn: group.publishedOn ?? '',
      products,
    });
  });
  return sets;
}

export function preorderPrice(product: SealedProduct): number | null {
  return price(product);
}

function price(product: SealedProduct): number | null {
  const prices = product.prices;
  return prices?.market ?? prices?.mid ?? prices?.low ?? prices?.directLow ?? null;
}

function hasPrice(product: SealedProduct): boolean {
  const amount = price(product);
  return amount !== null && amount > 0;
}

function isWithinWindow(group: TcgcsvGroup, today: number): boolean {
  const time = releaseTime(group);
  return Number.isFinite(time) && time >= today && time <= today + MAX_DAYS_AHEAD * DAY_MS;
}

function releaseTime(group: TcgcsvGroup): number {
  return group.publishedOn ? Date.parse(group.publishedOn) : Number.NaN;
}

function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}
