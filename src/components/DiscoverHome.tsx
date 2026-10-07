import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useBoard } from '@/hooks/useBoard';
import { useDiscover, useRisingExtra } from '@/hooks/useDiscover';
import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { DiscoverPick } from '@/services/discover';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { SetInfo } from '@/types/set';
import { formatShortDate, parseDate } from '@/utils/date';

import { BoardControls } from './BoardEditBar';
import { DiscoverCardTile, TILE_WIDTH } from './DiscoverCardTile';
import { DiscoverSection } from './DiscoverSection';
import { ArrangeBoard, type BoardWidget } from './ArrangeBoard';
import { SetLogoTile } from './SetLogoTile';
import { ShortcutTile } from './ShortcutTile';
import { SuggestionChips } from './SuggestionChips';

const AUTO_RETRIES = 2;
const AUTO_RETRY_MS = 2500;
const EDIT_BAR_SPACE = 150;

type Props = {
  bottomInset: number;
  recent: string[];
  suggestions: string[];
  onSuggestion: (text: string) => void;
  onClearRecent: () => void;
};

export function DiscoverHome({ bottomInset, recent, suggestions, onSuggestion, onClearRecent }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { discover, error, retry } = useDiscover(true);
  const risingExtra = useRisingExtra(true);
  const rising = useMemo(() => mergeRising(discover?.rising ?? [], risingExtra ?? []), [discover, risingExtra]);
  const [autoRetries, setAutoRetries] = useState(0);
  const board = useBoard('discover');
  const scroller = useAutoScroll();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!error || autoRetries >= AUTO_RETRIES) return;
    const timer = setTimeout(() => {
      setAutoRetries((count) => count + 1);
      retry();
    }, AUTO_RETRY_MS);
    return () => clearTimeout(timer);
  }, [error, autoRetries, retry]);

  const openCard = useCallback(
    (pick: DiscoverPick) => {
      haptics.tap();
      router.push({ pathname: '/card/[id]', params: { id: pick.card.id } });
    },
    [haptics, router],
  );

  const openSet = useCallback(
    (set: SetInfo) => {
      haptics.tap();
      router.push({ pathname: '/set/[id]', params: { id: set.id } });
    },
    [haptics, router],
  );

  const chips = (
    <View style={styles.chips}>
      <SuggestionChips
        title="Recent"
        icon="time-outline"
        suggestions={recent}
        onSelect={onSuggestion}
        onClear={onClearRecent}
        align="start"
      />
      <SuggestionChips title="Try" icon="sparkles-outline" suggestions={suggestions} onSelect={onSuggestion} align="start" />
    </View>
  );

  const since = discover?.risingSince ? parseDate(discover.risingSince) : null;
  const setNames = discover?.pricedSetNames.join(', ') ?? '';

  const widgets: BoardWidget[] = discover
    ? [
        {
          key: 'chase',
          label: 'Chase cards',
          node:
            discover.chase.length > 0 ? (
              <DiscoverSection delay={60} title="Chase cards" subtitle={setNames}>
                {discover.chase.map((pick) => (
                  <DiscoverCardTile key={pick.card.id} pick={pick} badge="none" onPress={openCard} />
                ))}
              </DiscoverSection>
            ) : null,
        },
        {
          key: 'rising',
          label: 'Heating up',
          node: (
            <DiscoverSection
              delay={140}
              title="Heating up"
              subtitle={since ? `Since ${formatShortDate(since)}` : 'This week'}
              scroll={rising.length > 0}
            >
              {rising.length > 0 ? (
                rising.map((pick) => <DiscoverCardTile key={pick.card.id} pick={pick} badge="change" onPress={openCard} />)
              ) : (
                <Text style={styles.note}>{risingExtra === null ? 'Checking…' : 'Quiet week.'}</Text>
              )}
            </DiscoverSection>
          ),
        },
        {
          key: 'sleepers',
          label: 'Sleepers',
          node:
            discover.sleepers.length > 0 ? (
              <DiscoverSection delay={220} title="Sleepers" subtitle="Cheap for their rarity">
                {discover.sleepers.map((pick) => (
                  <DiscoverCardTile key={pick.card.id} pick={pick} badge="under" onPress={openCard} />
                ))}
              </DiscoverSection>
            ) : null,
        },
        {
          key: 'sets',
          label: 'New sets',
          node: (
            <DiscoverSection delay={300} title="New sets">
              {discover.sets.map((set) => (
                <SetLogoTile key={set.id} set={set} onPress={openSet} />
              ))}
            </DiscoverSection>
          ),
        },
        {
          key: 'upcoming',
          label: 'Upcoming sets',
          node: (
            <ShortcutTile
              icon="calendar-outline"
              title="Upcoming sets"
              detail="Pre-orders"
              position="only"
              onPress={() => {
                haptics.tap();
                router.push('/upcoming');
              }}
            />
          ),
        },
        {
          key: 'chips',
          label: 'Recent and suggested searches',
          node: chips,
        },
      ]
    : [];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomInset + spacing.xl + (board.editing ? EDIT_BAR_SPACE : 0) },
        ]}
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
            {error && autoRetries >= AUTO_RETRIES ? (
              <Pressable onPress={retry} accessibilityRole="button" style={styles.retry}>
                <Text style={styles.note}>Couldn’t load what’s hot right now. Tap to try again.</Text>
              </Pressable>
            ) : (
              <View style={styles.placeholderRow} accessibilityLabel="Loading">
                {[0, 1, 2].map((index) => (
                  <View key={index} style={styles.placeholder} />
                ))}
              </View>
            )}
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

function mergeRising(first: DiscoverPick[], second: DiscoverPick[]): DiscoverPick[] {
  const seen = new Set<string>();
  return [...first, ...second]
    .filter((pick) => (seen.has(pick.card.id) ? false : (seen.add(pick.card.id), true)))
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))
    .slice(0, 12);
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
      backgroundColor: theme.colors.surface,
    },
  });
}
