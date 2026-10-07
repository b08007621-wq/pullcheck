import { useMemo } from 'react';

import type { DiscoverPick } from '@/services/discover';
import type { CollectedCard, CollectionItem } from '@/types/collection';
import { itemPrice } from '@/utils/collectionValue';

import { DiscoverCardTile } from './DiscoverCardTile';
import { DiscoverSection } from './DiscoverSection';

type Props = {
  items: CollectionItem[];
  onOpen: (item: CollectionItem) => void;
};

const LIMIT = 12;

export function CollectionTopCards({ items, onOpen }: Props) {
  const ranked = useMemo(() => {
    const picks: { item: CollectedCard; pick: DiscoverPick }[] = [];
    for (const item of items) {
      if (item.kind !== 'card') continue;
      const price = itemPrice(item);
      if (price?.currency !== 'USD' || price.amount <= 0) continue;
      picks.push({ item, pick: { card: { ...item.card, id: item.key }, price: price.amount, change: null } });
    }
    return picks.sort((first, second) => second.pick.price - first.pick.price).slice(0, LIMIT);
  }, [items]);
  if (ranked.length === 0) return null;
  const byKey = new Map(ranked.map((entry) => [entry.item.key, entry.item]));

  return (
    <DiscoverSection title="Most valuable" subtitle={`Your top ${ranked.length}`}>
      {ranked.map(({ item, pick }) => (
        <DiscoverCardTile
          key={item.key}
          pick={pick}
          badge="none"
          onPress={(chosen) => {
            const found = byKey.get(chosen.card.id);
            if (found) onOpen(found);
          }}
        />
      ))}
    </DiscoverSection>
  );
}
