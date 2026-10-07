import type { Binder, BinderColor } from '@/types/binder';

export const POCKETS = 9;

export const BINDER_COLORS: BinderColor[] = ['navy', 'crimson', 'aqua', 'onyx', 'violet'];

export const BINDER_COLOR_LABEL: Record<BinderColor, string> = {
  navy: 'Navy',
  crimson: 'Crimson',
  aqua: 'Aqua',
  onyx: 'Onyx',
  violet: 'Violet',
};

export function slotKeys(binder: Binder): Set<string> {
  return new Set(Object.values(binder.slots));
}

export function pageCount(binder: Binder): number {
  const used = Object.keys(binder.slots).map(Number).filter(Number.isFinite);
  const last = used.length > 0 ? Math.max(...used) : -1;
  return Math.max(1, Math.ceil((last + 1) / POCKETS)) + 1;
}

export function placeCard(binder: Binder, slot: number, key: string, from: number | null): Binder {
  const slots = { ...binder.slots };
  const occupant = slots[String(slot)];
  for (const [index, value] of Object.entries(slots)) {
    if (value === key) delete slots[index];
  }
  if (from !== null && occupant && occupant !== key) slots[String(from)] = occupant;
  slots[String(slot)] = key;
  return { ...binder, slots };
}

export function clearSlot(binder: Binder, slot: number): Binder {
  const slots = { ...binder.slots };
  delete slots[String(slot)];
  return { ...binder, slots };
}

export function fillEmpty(binder: Binder, keys: string[]): Binder {
  const slots = { ...binder.slots };
  let slot = 0;
  for (const key of keys) {
    while (slots[String(slot)]) slot += 1;
    slots[String(slot)] = key;
    slot += 1;
  }
  return { ...binder, slots };
}

export function isBinder(value: unknown): value is Binder {
  if (!value || typeof value !== 'object') return false;
  const binder = value as Partial<Binder>;
  return (
    typeof binder.id === 'string' &&
    typeof binder.name === 'string' &&
    BINDER_COLORS.includes(binder.color as BinderColor) &&
    typeof binder.slots === 'object' &&
    binder.slots !== null
  );
}
