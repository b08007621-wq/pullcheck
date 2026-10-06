import type { SealedProduct } from '@/types/sealed';

import { parseDate } from './date';
import { classifySealed, type SealedType } from './sealedType';

type Era = 'scarletViolet' | 'megaEvolution';

export type Msrp = {
  amount: number;
  eraLabel: string;
};

export const MSRP_SOURCE_NOTE =
  'Estimated US MSRP for this product type and era, based on Pokémon Center, Best Buy and GameStop listings (Jul 2026).';

const SCARLET_VIOLET_START = new Date(2023, 2, 31);
const MEGA_EVOLUTION_START = new Date(2025, 8, 26);

const ERA_LABEL: Record<Era, string> = {
  scarletViolet: 'Scarlet & Violet era',
  megaEvolution: 'Mega Evolution era',
};

const MSRP_TABLE: Partial<Record<SealedType, Record<Era, number>>> = {
  boosterPack: { scarletViolet: 3.99, megaEvolution: 4.49 },
  boosterBundle: { scarletViolet: 23.94, megaEvolution: 26.94 },
  boosterBox: { scarletViolet: 143.64, megaEvolution: 161.64 },
  etb: { scarletViolet: 49.99, megaEvolution: 49.99 },
  pcEtb: { scarletViolet: 59.99, megaEvolution: 59.99 },
  buildBattle: { scarletViolet: 29.99, megaEvolution: 29.99 },
  threePack: { scarletViolet: 14.99, megaEvolution: 13.99 },
  twoPack: { scarletViolet: 9.99, megaEvolution: 9.99 },
  miniTin: { scarletViolet: 9.99, megaEvolution: 9.99 },
};

export function currentMsrp(type: SealedType): number | null {
  return MSRP_TABLE[type]?.megaEvolution ?? null;
}

export function getMsrp(product: SealedProduct): Msrp | null {
  if (product.market === 'jp' || product.cardNumber) return null;
  const era = eraFor(parseDate(product.releasedOn));
  const prices = MSRP_TABLE[classifySealed(product.name)];
  if (!era || !prices) return null;
  return { amount: prices[era], eraLabel: ERA_LABEL[era] };
}

function eraFor(releasedOn: Date | null): Era | null {
  if (!releasedOn) return null;
  if (releasedOn >= MEGA_EVOLUTION_START) return 'megaEvolution';
  if (releasedOn >= SCARLET_VIOLET_START) return 'scarletViolet';
  return null;
}
