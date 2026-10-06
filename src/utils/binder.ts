import type { Binder, BinderFilter, CollectionItem } from '@/types/collection';

export const BINDERS: { value: Binder; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'trade', label: 'Trade' },
  { value: 'sale', label: 'For sale' },
];

export const BINDER_FILTERS: { value: BinderFilter; label: string }[] = [{ value: 'all', label: 'All' }, ...BINDERS];

export function itemBinder(item: CollectionItem): Binder {
  return item.binder ?? 'personal';
}

export function binderLabel(binder: Binder): string {
  return BINDERS.find((entry) => entry.value === binder)?.label ?? 'Personal';
}
