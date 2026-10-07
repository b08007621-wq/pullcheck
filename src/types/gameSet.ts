import type { Game } from './card';

export type GameSet = {
  id: string;
  game: Exclude<Game, 'pokemon'>;
  code: string;
  name: string;
  releaseDate: string;
  total: number;
  type: string | null;
  icon: string | number | null;
  iconIsSymbol: boolean;
};
