import type { Game } from '@/types/card';

export type GameLogo = {
  source: number;
  aspect: number;
};

export const GAME_LOGOS: Partial<Record<Game, GameLogo>> = {
  pokemon: { source: require('../../assets/games/pokemon.png'), aspect: 696 / 256 },
  mtg: { source: require('../../assets/games/mtg.png'), aspect: 893 / 256 },
  yugioh: { source: require('../../assets/games/yugioh.png'), aspect: 731 / 256 },
};
