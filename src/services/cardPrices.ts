import type { Card } from '@/types/card';

import { isExtraCardId } from './extraCards';
import { rememberCards } from './pokemonTcg';
import { normalizeText } from './sealedQuery';
import {
  type CardListing,
  displaySetName,
  loadGroupCatalog,
  loadGroups,
  settleInBatches,
  type TcgcsvGroup,
} from './tcgcsv';

export async function enrichCardPrices(cards: Card[]): Promise<Card[]> {
  const missing = cards.filter((card) => needsPrices(card) && !isExtraCardId(card.id));
  if (missing.length === 0) return cards;

  try {
    const groups = await loadGroups();
    const groupBySet = new Map<string, TcgcsvGroup>();
    for (const card of missing) {
      const group = findGroup(groups, card);
      if (group) groupBySet.set(card.set.id, group);
    }

    const uniqueGroups = [...new Map([...groupBySet.values()].map((group) => [group.groupId, group])).values()];
    const settled = await settleInBatches(uniqueGroups, loadGroupCatalog);
    const listingsByGroup = new Map<number, CardListing[]>();
    settled.forEach((result, index) => {
      const group = uniqueGroups[index];
      if (group && result.status === 'fulfilled') listingsByGroup.set(group.groupId, result.value.cards);
    });

    const updatedAt = todayStamp();
    const enriched = cards.map((card) => {
      if (!needsPrices(card) || isExtraCardId(card.id)) return card;
      const group = groupBySet.get(card.set.id);
      const listing = group ? findListing(listingsByGroup.get(group.groupId) ?? [], card) : null;
      if (!listing || Object.keys(listing.prices).length === 0) return card;
      return {
        ...card,
        tcgplayer: {
          url: card.tcgplayer?.url ?? listing.url,
          updatedAt,
          prices: listing.prices,
        },
      };
    });
    rememberCards(enriched.filter((card, index) => card !== cards[index]));
    return enriched;
  } catch {
    return cards;
  }
}

export function needsPrices(card: Card): boolean {
  const prices = card.tcgplayer?.prices;
  return !prices || Object.keys(prices).length === 0;
}

function findGroup(groups: TcgcsvGroup[], card: Card): TcgcsvGroup | null {
  const setName = normalizeText(card.set.name);
  const exact = groups.find((group) => normalizeText(displaySetName(group)) === setName);
  if (exact) return exact;

  const code = card.set.ptcgoCode?.toUpperCase();
  const byCode = code ? groups.filter((group) => group.abbreviation?.toUpperCase() === code) : [];
  const suffix = groups.filter((group) => normalizeText(displaySetName(group)).endsWith(` ${setName}`));
  const both = suffix.find((group) => byCode.includes(group));
  return both ?? (suffix.length === 1 ? suffix[0] : null) ?? (byCode.length === 1 ? byCode[0] : null) ?? null;
}

function findListing(listings: CardListing[], card: Card): CardListing | null {
  const target = normalizeNumber(card.number);
  const matches = listings.filter((listing) => normalizeNumber(listing.number) === target);
  if (matches.length <= 1) return matches[0] ?? null;

  const name = normalizeText(card.name);
  return matches.find((listing) => normalizeText(listing.name).startsWith(name)) ?? matches[0] ?? null;
}

function normalizeNumber(value: string): string {
  const printed = value.split('/')[0]?.trim().toUpperCase() ?? '';
  return /^\d+$/.test(printed) ? String(Number.parseInt(printed, 10)) : printed.replace(/^([A-Z]+)0+(\d)/, '$1$2');
}

function todayStamp(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}/${month}/${day}`;
}

export async function locateTcgProduct(card: Card): Promise<{ groupId: number; productId: number } | null> {
  const groups = await loadGroups();
  const group = findGroup(groups, card);
  if (!group) return null;
  const [result] = await settleInBatches([group], loadGroupCatalog);
  if (!result || result.status !== 'fulfilled') return null;
  const listing = findListing(result.value.cards, card);
  return listing ? { groupId: group.groupId, productId: listing.productId } : null;
}
