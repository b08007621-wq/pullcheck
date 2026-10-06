import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useWishlist } from '@/hooks/useWishlist';

import { ShortcutTile } from './ShortcutTile';

export function CollectionShortcuts() {
  const router = useRouter();
  const haptics = useHaptics();
  const { items } = useCollection();
  const wishlist = useWishlist();
  const started = useMemo(
    () => new Set(items.flatMap((item) => (item.kind === 'card' ? [item.card.set.id] : []))).size,
    [items],
  );

  const wishDetail =
    wishlist.hits > 0
      ? `${wishlist.hits} under target`
      : wishlist.items.length > 0
        ? `${wishlist.items.length} ${wishlist.items.length === 1 ? 'card' : 'cards'}`
        : 'Watch prices';

  return (
    <View>
      <ShortcutTile
        icon="grid-outline"
        title="Sets"
        detail={started > 0 ? `${started} started` : 'Every set'}
        position="first"
        onPress={() => {
          haptics.tap();
          router.push('/sets');
        }}
      />
      <ShortcutTile
        icon="heart-outline"
        title="Wishlist"
        detail={wishDetail}
        position="last"
        highlight={wishlist.hits > 0}
        onPress={() => {
          haptics.tap();
          router.push('/wishlist');
        }}
      />
    </View>
  );
}
