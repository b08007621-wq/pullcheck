import type { Game } from '@/types/card';

import { LORCANA_SET_LOGOS } from './lorcanaSetLogos';
import { YUGIOH_SET_LOGOS } from './yugiohSetLogos';

const SET_LOGOS: Partial<Record<Game, Record<string, number>>> = {
  lorcana: LORCANA_SET_LOGOS,
  yugioh: YUGIOH_SET_LOGOS,
};

export function bundledSetLogo(game: Game, code: string | undefined): number | null {
  const logos = SET_LOGOS[game];
  return logos && code && Object.prototype.hasOwnProperty.call(logos, code) ? (logos[code] ?? null) : null;
}
