import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCardSearch } from '@/hooks/useCardSearch';
import { useCollection } from '@/hooks/useCollection';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, spacing, typography } from '@/theme';
import type { Card } from '@/types/card';
import type { CollectionItem } from '@/types/collection';
import { itemBinder } from '@/utils/binder';
import { lineFromCard, lineFromItem, type TradeLine, type TradeSide } from '@/utils/trade';

import { CardListItem } from './CardListItem';
import { CollectionListItem } from './CollectionListItem';
import { rowPosition } from './ListRow';
import { SearchBar } from './SearchBar';
import { SegmentedControl } from './SegmentedControl';

type Props = {
  side: TradeSide | null;
  onClose: () => void;
  onPick: (side: TradeSide, line: TradeLine) => void;
};

type Source = 'collection' | 'search';

const SOURCES: { value: Source; label: string }[] = [
  { value: 'collection', label: 'My collection' },
  { value: 'search', label: 'Search' },
];

export function TradePicker({ side, onClose, onPick }: Props) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { items } = useCollection();
  const [source, setSource] = useState<Source>('collection');
  const [text, setText] = useState('');
  const search = useCardSearch(side && (side === 'get' || source === 'search') ? text : '');
  const effective: Source = side === 'get' ? 'search' : source;

  const mine = useMemo(
    () =>
      [...items].sort((first, second) => {
        const firstTrade = itemBinder(first) === 'trade' ? 0 : 1;
        const secondTrade = itemBinder(second) === 'trade' ? 0 : 1;
        return firstTrade - secondTrade;
      }),
    [items],
  );

  const pickItem = (item: CollectionItem) => {
    if (side) onPick(side, lineFromItem(item));
  };
  const pickCard = (card: Card) => {
    if (side) onPick(side, lineFromCard(card));
  };

  return (
    <Modal visible={side !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{side === 'give' ? 'Add what you give' : 'Add what you get'}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        {side === 'give' ? (
          <View style={styles.pad}>
            <SegmentedControl options={SOURCES} value={source} onChange={setSource} />
          </View>
        ) : null}
        {effective === 'search' ? (
          <>
            <View style={styles.pad}>
              <SearchBar value={text} onChangeText={setText} placeholder="Card name, e.g. Charizard" />
            </View>
            <FlatList
              data={search.cards}
              keyExtractor={(card) => card.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
              onEndReached={search.loadMore}
              renderItem={({ item, index }) => (
                <CardListItem
                  card={item}
                  ownedQuantity={0}
                  position={rowPosition(index, search.cards.length)}
                  onPress={pickCard}
                />
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>{text ? 'Searching…' : 'Search for a card to add it to the trade.'}</Text>
              }
            />
          </>
        ) : (
          <FlatList
            data={mine}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <CollectionListItem item={item} position={rowPosition(index, mine.length)} onPress={pickItem} />
            )}
            ListEmptyComponent={<Text style={styles.empty}>Your collection is empty. Use Search instead.</Text>}
          />
        )}
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingTop: spacing.lg,
      gap: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
    },
    title: {
      ...typography.heading,
      color: theme.colors.text,
    },
    done: {
      ...typography.label,
      color: theme.colors.accent,
    },
    pad: {
      paddingHorizontal: spacing.lg,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    empty: {
      ...typography.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.xl,
    },
  });
}
