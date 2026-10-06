export type SetInfo = {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  total: number;
  printedTotal: number;
  ptcgoCode: string | null;
  logo: string;
  symbol: string;
};

export type SetMode = 'set' | 'master';

export type SetFilter = 'all' | 'owned' | 'missing';
