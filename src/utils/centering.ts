import type { BorderWidths } from '@/services/ocrBridge';
import { type GradedPrice, gradedPriceFor } from '@/services/graded';

import { formatMoney } from './price';

export type Centering = {
  leftRight: number;
  topBottom: number;
  worst: number;
  cap: number;
  sure: number;
  close: boolean;
};

export type GradeOutcome = {
  grade: string;
  price: number;
  net: number;
  possible: boolean;
  borderline: boolean;
};

export type GradeVerdict = {
  tone: 'gain' | 'loss' | 'neutral';
  title: string;
  detail: string;
};

const PSA_LIMITS = [
  { grade: 10, safe: 55, max: 60 },
  { grade: 9, safe: 60, max: 65 },
  { grade: 8, safe: 65, max: 70 },
  { grade: 7, safe: 70, max: 75 },
  { grade: 6, safe: 80, max: 80 },
  { grade: 5, safe: 85, max: 85 },
];
const FLOOR_GRADE = 4;
const MEASURE_SLACK = 1;
const PRICED_GRADES = ['10', '9', '8'];

export const GRADING_COST_STEP = 5;
export const GRADING_COST_RANGE = [5, 300] as const;

export function readCentering(widths: BorderWidths): Centering {
  const leftRight = Math.round(share(widths.left, widths.right));
  const topBottom = Math.round(share(widths.top, widths.bottom));
  const worst = Math.max(leftRight, 100 - leftRight, topBottom, 100 - topBottom);
  const cap = PSA_LIMITS.find((entry) => worst <= entry.max)?.grade ?? FLOOR_GRADE;
  const sure = PSA_LIMITS.find((entry) => worst <= entry.safe)?.grade ?? FLOOR_GRADE;
  const close = PSA_LIMITS.some((entry) => Math.abs(worst - entry.max) <= MEASURE_SLACK);
  return { leftRight, topBottom, worst, cap, sure, close };
}

export function formatSplit(first: number): string {
  return `${first}/${100 - first}`;
}

export function capSummary(centering: Centering): { title: string; detail: string } {
  const split = formatSplit(centering.worst);
  const recheck = centering.close ? ' It’s right at a cutoff, so measure again to be sure.' : '';
  if (centering.sure === 10) {
    return {
      title: 'Centering fits a PSA 10',
      detail: `The worst side is ${split}. PSA 10 wants about 55/45 or better on the front.${recheck}`,
    };
  }
  if (centering.cap === 10) {
    return {
      title: 'PSA 10 is a coin flip on centering',
      detail: `The worst side is ${split}. PSA 10 allows roughly 55/45 to 60/40, so this is in the gray zone. A 9 is safe.${recheck}`,
    };
  }
  if (centering.cap === FLOOR_GRADE) {
    return {
      title: 'Centering is way off',
      detail: `The worst side is ${split}. Even a PSA 5 needs about 85/15 or better.`,
    };
  }
  const above = PSA_LIMITS.find((entry) => entry.grade === centering.cap + 1);
  const shaky = centering.sure < centering.cap ? ` It’s borderline for a ${centering.cap} too.` : '';
  return {
    title: `Centering tops out around PSA ${centering.cap}`,
    detail: `The worst side is ${split}.${above ? ` A PSA ${above.grade} needs about ${formatSplit(above.max)} or better.` : ''}${shaky}${recheck}`,
  };
}

export function gradeOutcomes(
  prices: GradedPrice[],
  raw: number | null,
  cost: number,
  centering: Centering | null,
): GradeOutcome[] {
  const cap = centering?.cap ?? 10;
  const sure = centering?.sure ?? 10;
  return PRICED_GRADES.flatMap((grade) => {
    const price = gradedPriceFor(prices, 'PSA', grade);
    if (!price) return [];
    const value = Number(grade);
    return [
      { grade, price, net: price - cost - (raw ?? 0), possible: value <= cap, borderline: value <= cap && value > sure },
    ];
  });
}

export function gradeVerdict(outcomes: GradeOutcome[], centering: Centering | null): GradeVerdict | null {
  if (outcomes.length === 0) return null;
  const possible = outcomes.filter((outcome) => outcome.possible);
  const best = possible[0];
  if (!best) {
    return {
      tone: 'loss',
      title: 'Keep it raw',
      detail: `Centering points to PSA ${centering?.cap ?? 10} at best, and there are no sales at that grade to compare.`,
    };
  }
  if (best.net <= 0) {
    return {
      tone: 'loss',
      title: 'Keep it raw',
      detail: `Even a PSA ${best.grade} leaves you ${formatMoney(-best.net)} behind after grading costs.`,
    };
  }
  const next = possible[1];
  if (next && next.net > 0) {
    return {
      tone: 'gain',
      title: 'Worth grading',
      detail: `You come out ahead even at a PSA ${next.grade}, about ${formatMoney(next.net)} more than selling it raw.`,
    };
  }
  const odds = best.borderline ? ' Centering puts that grade in the gray zone, so it’s a gamble.' : '';
  return {
    tone: 'neutral',
    title: `Only worth it for a PSA ${best.grade}`,
    detail: next
      ? `A ${best.grade} makes about ${formatMoney(best.net)} more than raw, but a ${next.grade} loses ${formatMoney(-next.net)}.${odds}`
      : `A ${best.grade} makes about ${formatMoney(best.net)} more than raw. There’s no sales data for lower grades.${odds}`,
  };
}

function share(first: number, second: number): number {
  const total = first + second;
  return total > 0 ? (100 * first) / total : 50;
}
