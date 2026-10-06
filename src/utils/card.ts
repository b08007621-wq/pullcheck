import type { Card } from '@/types/card';

export function formatCollectorNumber(card: Card): string {
  const total = card.set.printedTotal ?? card.set.total;
  return total ? `${card.number}/${total}` : card.number;
}

export function isSecretRare(card: Card): boolean {
  const printedTotal = card.set.printedTotal;
  const number = Number.parseInt(card.number, 10);
  return printedTotal !== undefined && Number.isFinite(number) && number > printedTotal;
}

export function cardStage(card: Card): string | null {
  const parts = [card.supertype, ...(card.subtypes ?? [])].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}
