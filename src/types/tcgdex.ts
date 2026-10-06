export type DexLanguage = 'en' | 'de' | 'fr' | 'es' | 'it' | 'pt' | 'ja';

export type DexCardCount = {
  official: number;
  total: number;
};

export type DexSetBrief = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount: DexCardCount;
};

export type DexSet = DexSetBrief & {
  releaseDate?: string;
  serie?: { id: string; name: string };
  abbreviation?: { official?: string };
  legal?: { standard?: boolean; expanded?: boolean };
};

export type DexTcgVariantPrice = {
  productId?: number;
  lowPrice?: number | null;
  midPrice?: number | null;
  highPrice?: number | null;
  marketPrice?: number | null;
  directLowPrice?: number | null;
};

export type DexPricing = {
  tcgplayer?: { unit?: string; updated?: string } & Record<string, DexTcgVariantPrice | string | undefined>;
  cardmarket?: {
    updated?: string;
    unit?: string;
    idProduct?: number;
    avg?: number | null;
    low?: number | null;
    trend?: number | null;
    avg1?: number | null;
    avg7?: number | null;
    avg30?: number | null;
  };
};

export type DexAttack = {
  name: string;
  cost?: string[];
  effect?: string;
  damage?: string | number;
};

export type DexCard = {
  id: string;
  localId: string;
  name: string;
  image?: string;
  category?: string;
  illustrator?: string;
  rarity?: string;
  hp?: number;
  types?: string[];
  evolveFrom?: string;
  stage?: string;
  suffix?: string;
  description?: string;
  effect?: string;
  attacks?: DexAttack[];
  abilities?: { type: string; name: string; effect: string }[];
  weaknesses?: { type: string; value?: string }[];
  resistances?: { type: string; value?: string }[];
  retreat?: number;
  regulationMark?: string;
  dexId?: number[];
  legal?: { standard?: boolean; expanded?: boolean };
  variants?: { normal?: boolean; reverse?: boolean; holo?: boolean; firstEdition?: boolean };
  set: DexSetBrief;
  thirdParty?: { tcgplayer?: number; cardmarket?: number };
  pricing?: DexPricing;
};

export type LocalizedCard = {
  language: DexLanguage;
  name: string;
  setName: string;
  image: string | null;
};
