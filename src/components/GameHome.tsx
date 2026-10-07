import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useBoard } from '@/hooks/useBoard';
import { useGameDiscover } from '@/hooks/useGameDiscover';
import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { setBrowseList } from '@/services/cardBrowse';
import type { DiscoverPick } from '@/services/discover';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { GameSet } from '@/types/gameSet';
import { gameInfo, type OtherGame } from '@/utils/game';

import { ArrangeBoard, type BoardWidget } from './ArrangeBoard';
import { BoardControls } from './BoardEditBar';
import { DiscoverCardTile, TILE_WIDTH } from './DiscoverCardTile';
import { DiscoverSection } from './DiscoverSection';
import { GameSetTile } from './GameSetTile';
import { ShortcutTile } from './ShortcutTile';
import { SuggestionChips } from './SuggestionChips';

const EDIT_BAR_SPACE = 150;

type Props = {
  game: OtherGame;
  bottomInset: number;
  recent: string[];
  onSuggestion: (text: string) => void;
  onClearRecent: () => void;
};

export function GameHome({ game, bottomInset, recent, onSuggestion, onClearRecent }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { discover, error, retry } = useGameDiscover(game);
  const board = useBoard(`discover-${game}`);
  const scroller = useAutoScroll();
  const insets = useSafeAreaInsets();
  const info = gameInfo(game);

  const openPick = useCallback(
    (list: DiscoverPick[]) => (pick: DiscoverPick) => {
      haptics.tap();
      setBrowseList(list.map((stop) => ({ id: stop.card.id, card: stop.card })));
      router.push({ pathname: '/card/[id]', params: { id: pick.card.id } });
    },
    [haptics, router],
  );

  const openSet = useCallback(
    (set: GameSet) => {
      haptics.tap();
      router.push({ pathname: '/tcgset/[id]', params: { id: set.id, name: set.name } });
    },
    [haptics, router],
  );

  const openAllSets = useCallback(() => {
    haptics.tap();
    router.push({ pathname: '/tcg/[game]', params: { game } });
  }, [haptics, router, game]);

  const chips = (
    <View style={styles.chips}>
      <SuggestionChips title="Recent" icon="time-outline" suggestions={recent} onSelect={onSuggestion} onClear={onClearRecent} align="start" />
      <SuggestionChips title="Try" icon="sparkles-outline" suggestions={info.suggestions} onSelect={onSuggestion} align="start" />
    </View>
  );

  const allSets = (
    <ShortcutTile icon="albums-outline" title={`All ${info.short} sets`} detail="Browse, track and complete" position="only" onPress={openAllSets} />
  );

  const widgets: BoardWidget[] = discover
    ? [
        {
          key: 'chase',
          label: 'Chase cards',
          node:
            discover.chase.length > 0 ? (
              <DiscoverSection delay={60} title="Chase cards" subtitle={discover.sourceSets.join(', ')}>
                {discover.chase.map((pick) => (
                  <DiscoverCardTile key={pick.card.id} pick={pick} badge="none" onPress={openPick(discover.chase)} />
                ))}
              </DiscoverSection>
            ) : null,
        },
        {
          key: 'sleepers',
          label: 'Hidden gems',
          node:
            discover.sleepers.length > 0 ? (
              <DiscoverSection delay={140} title="Hidden gems" subtitle="Top rarities at the lowest prices">
                {discover.sleepers.map((pick) => (
                  <DiscoverCardTile key={pick.card.id} pick={pick} badge="none" onPress={openPick(discover.sleepers)} />
                ))}
              </DiscoverSection>
            ) : null,
        },
        {
          key: 'sets',
          label: 'New sets',
          node: (
            <DiscoverSection delay={220} title="New sets">
              {discover.newSets.map((set) => (
                <GameSetTile key={set.id} set={set} onPress={openSet} />
              ))}
            </DiscoverSection>
          ),
        },
        { key: 'allsets', label: 'All sets', node: allSets },
        { key: 'chips', label: 'Recent and suggested searches', node: chips },
      ]
    : [];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + spacing.xl + (board.editing ? EDIT_BAR_SPACE : 0) }]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!board.locked}
        ref={(node) => scroller.attach(node)}
        onScroll={scroller.onScroll}
        onLayout={scroller.onLayout}
        onContentSizeChange={scroller.onContentSizeChange}
        scrollEventThrottle={16}
      >
        {discover ? (
          <ArrangeBoard
            widgets={widgets}
            board={board}
            autoScroll={scroller.scrollBy}
            edges={{ top: insets.top + 160, bottom: bottomInset + EDIT_BAR_SPACE }}
          />
        ) : (
          <>
            {error ? (
              <Pressable onPress={retry} accessibilityRole="button" style={styles.retry}>
                <Text style={styles.note}>Couldn’t load {info.short} highlights. Tap to try again.</Text>
              </Pressable>
            ) : (
              <View style={styles.placeholderRow} accessibilityLabel="Loading">
                {[0, 1, 2].map((index) => (
                  <View key={index} style={styles.placeholder} />
                ))}
              </View>
            )}
            {allSets}
            {chips}
          </>
        )}
      </ScrollView>
      {board.editing ? (
        <View style={[styles.editBar, { bottom: bottomInset + spacing.sm }]}>
          <BoardControls board={board} widgets={widgets} />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    editBar: {
      position: 'absolute',
      zIndex: 50,
      elevation: 50,
      left: spacing.lg,
      right: spacing.lg,
    },
    content: {
      paddingHorizontal: spacing.lg,
      gap: spacing.xl,
    },
    chips: {
      gap: spacing.md,
    },
    note: {
      ...typography.body,
      fontSize: 15,
      color: theme.colors.textMuted,
    },
    retry: {
      paddingVertical: spacing.md,
    },
    placeholderRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    placeholder: {
      width: TILE_WIDTH,
      height: TILE_WIDTH / (63 / 88),
      borderRadius: radius.sm + 2,
      backgroundColor: theme.colors.surfaceRaised,
    },
  });
}
