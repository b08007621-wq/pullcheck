import type { IconName } from '@/types/icon';
import type { CollectionSection } from '@/types/collection';

export const SECTION_LABEL: Record<CollectionSection, { title: string; detail: string; icon: IconName }> = {
  pulled: { title: 'Just pulled', detail: 'Cards from your last pack, right after you open it', icon: 'sparkles-outline' },
  summary: { title: 'Total value', detail: 'What it’s all worth and how it’s moved', icon: 'wallet-outline' },
  chart: { title: 'Value chart & movers', detail: 'History chart plus your biggest risers and fallers', icon: 'analytics-outline' },
  games: { title: 'Your games', detail: 'Value and card count for each card game, tap one to filter', icon: 'game-controller-outline' },
  sets: { title: 'Value by set', detail: 'Which sets hold most of your collection’s value, tap one to filter', icon: 'layers-outline' },
  top: { title: 'Most valuable', detail: 'Your priciest cards in one swipeable row', icon: 'diamond-outline' },
  recent: { title: 'Recently added', detail: 'Your newest cards and products', icon: 'time-outline' },
  stats: { title: 'Quick stats', detail: 'Unique cards, extra copies, this week, top card', icon: 'stats-chart-outline' },
  shortcuts: { title: 'Shortcuts', detail: 'Sets, upcoming releases, trades and wishlist', icon: 'apps-outline' },
};
