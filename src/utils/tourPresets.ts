import type { Game } from '@/types/card';
import type { CollectionLayout, CollectionSection, CollectionView } from '@/types/collection';
import type { IconName } from '@/types/icon';

export type TourFocus = 'scan' | 'value' | 'sets' | 'trade';

export type LayoutPreset = 'compact' | 'balanced' | 'showcase';

export type TourAnswers = {
  games: Game[];
  focus: TourFocus[];
  layout: LayoutPreset | null;
};

export const FOCUS_OPTIONS: { value: TourFocus; label: string; detail: string; icon: IconName }[] = [
  { value: 'scan', label: 'Scanning packs', detail: 'Log pulls as I open them', icon: 'scan-outline' },
  { value: 'value', label: 'Tracking value', detail: 'Watch what it’s all worth', icon: 'trending-up-outline' },
  { value: 'sets', label: 'Completing sets', detail: 'Chase every card in a set', icon: 'grid-outline' },
  { value: 'trade', label: 'Trading and selling', detail: 'Binders, trades and wishlists', icon: 'swap-horizontal-outline' },
];

export const LAYOUT_OPTIONS: { value: LayoutPreset; label: string; detail: string; icon: IconName }[] = [
  { value: 'compact', label: 'Compact', detail: 'Dense grid, only the essentials. Fits big collections.', icon: 'apps-outline' },
  { value: 'balanced', label: 'Balanced', detail: 'A list with every section in its usual place.', icon: 'list-outline' },
  { value: 'showcase', label: 'Showcase', detail: 'A big 3D shelf with large cards and full details.', icon: 'albums-outline' },
];

const FOCUS_SECTIONS: Record<TourFocus, CollectionSection[]> = {
  scan: ['pulled', 'recent'],
  value: ['summary', 'chart', 'top'],
  sets: ['shortcuts', 'stats'],
  trade: ['shortcuts', 'recent'],
};

const ALL_SECTIONS: CollectionSection[] = ['pulled', 'summary', 'chart', 'games', 'top', 'recent', 'stats', 'shortcuts'];

const LAYOUT_SETTINGS: Record<LayoutPreset, { view: CollectionView; gridColumns: 2 | 3 | 4; gridDetails: boolean }> = {
  compact: { view: 'grid', gridColumns: 4, gridDetails: false },
  balanced: { view: 'list', gridColumns: 3, gridDetails: true },
  showcase: { view: 'cover', gridColumns: 2, gridDetails: true },
};

const COMPACT_HIDDEN: CollectionSection[] = ['pulled', 'chart', 'stats', 'top'];

export function recommendedLayout(answers: Pick<TourAnswers, 'games' | 'focus'>): LayoutPreset {
  if (answers.games.length >= 2) return 'compact';
  if (answers.games.length === 1 && answers.focus.includes('sets')) return 'showcase';
  return 'balanced';
}

export function layoutFor(
  answers: TourAnswers,
  base: CollectionLayout,
  baseView: CollectionView,
): { view: CollectionView; layout: CollectionLayout } {
  const priority = answers.focus.flatMap((focus) => FOCUS_SECTIONS[focus]);
  const front = priority.filter((section, index) => priority.indexOf(section) === index);
  const order = front.length > 0 ? [...front, ...ALL_SECTIONS.filter((section) => !front.includes(section))] : base.order;
  const hidden = new Set<CollectionSection>(base.hidden);
  if (answers.games.length === 1) hidden.add('games');
  if (answers.games.length > 1) hidden.delete('games');
  if (answers.layout === 'compact') {
    COMPACT_HIDDEN.filter((section) => !front.includes(section)).forEach((section) => hidden.add(section));
  }
  const preset = answers.layout ? LAYOUT_SETTINGS[answers.layout] : null;
  return {
    view: preset?.view ?? baseView,
    layout: {
      ...base,
      order,
      hidden: ALL_SECTIONS.filter((section) => hidden.has(section)),
      gridColumns: preset?.gridColumns ?? base.gridColumns,
      gridDetails: preset?.gridDetails ?? base.gridDetails,
    },
  };
}
