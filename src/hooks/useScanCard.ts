import { useCallback } from 'react';

import { getCard, rememberCards } from '@/services/pokemonTcg';
import type { ScanCandidate } from '@/services/scanMatch';
import { dexToCard, getLocalizedCards, isDexCardId } from '@/services/tcgdex';
import type { Card } from '@/types/card';
import type { DexLanguage, LocalizedCard } from '@/types/tcgdex';

import { useResource } from './useResource';

const LANGUAGES: DexLanguage[] = ['en', 'de', 'fr'];
const FALLBACK_TIMEOUT_MS = 6000;

export function useScanCard(candidate: ScanCandidate | null) {
  const key = candidate ? `${candidate.language}:${candidate.card.id}` : 'scan:none';
  const load = useCallback(
    async (signal: AbortSignal): Promise<Card | null> => {
      if (!candidate) return null;
      const card = await fillGaps(await dexToCard(candidate.card, candidate.language, signal), signal);
      rememberCards([card]);
      return card;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return useResource(key, load);
}

export function useLocalizedCards(candidate: ScanCandidate | null): LocalizedCard[] {
  const id = candidate?.language === 'en' ? candidate.card.id : null;
  const load = useCallback(
    (signal: AbortSignal) => (id ? getLocalizedCards(id, LANGUAGES, signal) : Promise.resolve([])),
    [id],
  );
  const { data } = useResource(id ? `localized:${id}` : 'localized:none', load);
  return data ?? [];
}

async function fillGaps(card: Card, signal: AbortSignal): Promise<Card> {
  const missingImage = !card.images.large;
  const missingPrice = !card.tcgplayer?.prices;
  if (isDexCardId(card.id) || (!missingImage && !missingPrice)) return card;
  const full = await Promise.race([
    getCard(card.id, signal).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), FALLBACK_TIMEOUT_MS)),
  ]);
  if (!full) return card;
  return {
    ...card,
    images: missingImage ? full.images : card.images,
    tcgplayer: missingPrice ? full.tcgplayer : card.tcgplayer,
    cardmarket: card.cardmarket ?? full.cardmarket,
    set: full.set,
  };
}
