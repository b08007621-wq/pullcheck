export type Game = 'pokemon' | 'mtg' | 'yugioh' | 'lorcana';

export type TcgPlayerPrice = {
  low?: number | null;
  mid?: number | null;
  high?: number | null;
  market?: number | null;
  directLow?: number | null;
};

export type TcgPlayer = {
  url: string;
  updatedAt?: string;
  prices?: Record<string, TcgPlayerPrice>;
};

export type CardmarketPrices = {
  averageSellPrice?: number | null;
  lowPrice?: number | null;
  trendPrice?: number | null;
  avg1?: number | null;
  avg7?: number | null;
  avg30?: number | null;
};

export type Cardmarket = {
  url: string;
  updatedAt?: string;
  prices?: CardmarketPrices;
};

export type Legalities = {
  standard?: string;
  expanded?: string;
  unlimited?: string;
};

export type CardSet = {
  id: string;
  name: string;
  series: string;
  printedTotal?: number;
  total: number;
  releaseDate: string;
  ptcgoCode?: string;
  legalities?: Legalities;
  images: {
    symbol: string;
    logo: string;
  };
};

export type CardAbility = {
  name: string;
  text: string;
  type: string;
};

export type CardAttack = {
  name: string;
  cost?: string[];
  convertedEnergyCost?: number;
  damage?: string;
  text?: string;
};

export type TypeModifier = {
  type: string;
  value: string;
};

export type Card = {
  id: string;
  game?: Game;
  name: string;
  number: string;
  rarity?: string;
  set: CardSet;
  images: {
    small: string;
    large: string;
    back?: string;
  };
  lang?: string;
  finishTags?: string[];
  tcgplayer?: TcgPlayer;
  cardmarket?: Cardmarket;
  supertype?: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  evolvesTo?: string[];
  rules?: string[];
  abilities?: CardAbility[];
  attacks?: CardAttack[];
  weaknesses?: TypeModifier[];
  resistances?: TypeModifier[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  artist?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities?: Legalities;
  regulationMark?: string;
  printing?: string | null;
};

export type CardPage = {
  cards: Card[];
  page: number;
  pageSize: number;
  totalCount: number;
  stale?: boolean;
};
