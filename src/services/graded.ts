import { apiUrl } from './apiBase';
import { type CachePolicy, cachedFetch } from './cache';
import { getJson } from './http';

type GradeStats = {
  count?: number;
  medianPrice?: number | null;
  marketPrice7Day?: number | null;
  marketTrend?: string | null;
  lastSaleDate?: string | null;
  smartMarketPrice?: { price?: number | null; confidence?: string | null } | null;
};

type Response = {
  data?: { ebay?: { salesByGrade?: Record<string, GradeStats> } } | unknown[];
  limited?: { resetsAt?: string | null };
};

export type GradedResult = {
  prices: GradedPrice[];
  limitedUntil: string | null;
};

const GRADED_CACHE: CachePolicy = { bucket: 'graded', ttlMs: 3 * 24 * 60 * 60 * 1000, maxEntries: 400 };

export type GradedPrice = {
  key: string;
  company: string;
  grade: string;
  label: string;
  price: number;
  sales: number;
  trend: 'up' | 'down' | 'stable' | null;
};

const COMPANY_ORDER = ['psa', 'bgs', 'cgc', 'tag', 'sgc', 'ace'];

class GradedLimitError extends Error {
  readonly resetsAt: string | null;

  constructor(resetsAt: string | null) {
    super('Graded price limit reached');
    this.resetsAt = resetsAt;
  }
}

export async function fetchGradedPrices(productId: number, signal?: AbortSignal): Promise<GradedResult> {
  try {
    const { value } = await cachedFetch(String(productId), GRADED_CACHE, async () => {
      const response = await getJson<Response>(apiUrl(`/api/pokeprice?id=${productId}`), {
        signal,
        timeoutMs: 20_000,
        maxAttempts: 1,
      });
      if (response.limited) throw new GradedLimitError(response.limited.resetsAt ?? null);
      return parseGraded(response);
    });
    return { prices: value, limitedUntil: null };
  } catch (error) {
    if (error instanceof GradedLimitError) return { prices: [], limitedUntil: error.resetsAt ?? 'later' };
    throw error;
  }
}

function parseGraded(response: Response): GradedPrice[] {
  const data = response.data;
  if (!data || Array.isArray(data)) return [];
  const byGrade = data.ebay?.salesByGrade ?? {};
  const prices: GradedPrice[] = [];
  for (const [key, stats] of Object.entries(byGrade)) {
    const match = /^([a-z]+)(\d+(?:_5)?)$/.exec(key);
    const price = stats.smartMarketPrice?.price ?? stats.marketPrice7Day ?? stats.medianPrice ?? null;
    if (!match || !price || price <= 0) continue;
    const company = match[1]!.toUpperCase();
    const grade = match[2]!.replace('_5', '.5');
    const trend = stats.marketTrend === 'up' || stats.marketTrend === 'down' || stats.marketTrend === 'stable' ? stats.marketTrend : null;
    prices.push({ key, company, grade, label: `${company} ${grade}`, price, sales: stats.count ?? 0, trend });
  }
  return prices.sort((first, second) => {
    const companyOrder = COMPANY_ORDER.indexOf(first.company.toLowerCase()) - COMPANY_ORDER.indexOf(second.company.toLowerCase());
    return companyOrder || Number(second.grade) - Number(first.grade);
  });
}

export function gradedPriceFor(prices: GradedPrice[], company: string, grade: string): number | null {
  return prices.find((entry) => entry.company === company.toUpperCase() && entry.grade === grade)?.price ?? null;
}
