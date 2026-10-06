import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDiscover } from '@/hooks/useDiscover';
import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { DiscoverPick } from '@/services/discover';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { SetInfo } from '@/types/set';
import { formatShortDate, parseDate } from '@/utils/date';

import { DiscoverCardTile, TILE_WIDTH } from './DiscoverCardTile';
import { DiscoverSection } from './DiscoverSection';
import { SetLogoTile } from './SetLogoTile';
import { SuggestionChips } from './SuggestionChips';

const AUTO_RETRIES = 2;
const AUTO_RETRY_MS = 2500;

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
  const [autoRetries, setAutoRetries] = useState(0);

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

  const since = discover?.risingSince ? parseDate(discover.risingSince) : null;
  const setNames = discover?.pricedSetNames.join(', ') ?? '';

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + spacing.xl }]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
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

      {discover ? (
        <>
          {discover.chase.length > 0 ? (
            <DiscoverSection title="Chase cards" subtitle={`The most valuable pulls in ${setNames}`}>
              {discover.chase.map((pick) => (
                <DiscoverCardTile key={pick.card.id} pick={pick} badge="none" onPress={openCard} />
              ))}
            </DiscoverSection>
          ) : null}

          <DiscoverSection
            title="Rising"
            subtitle={since ? `Climbing the most since ${formatShortDate(since)}` : 'Climbing the most this week'}
            scroll={discover.rising.length > 0}
          >
            {discover.rising.length > 0 ? (
              discover.rising.map((pick) => (
                <DiscoverCardTile key={pick.card.id} pick={pick} badge="change" onPress={openCard} />
              ))
            ) : (
              <Text style={styles.note}>
                Nothing has climbed more than 8% this week. Quiet market.
              </Text>
            )}
          </DiscoverSection>

          {discover.sleepers.length > 0 ? (
            <DiscoverSection title="Sleepers" subtitle="Chase cards priced well under their set’s average">
              {discover.sleepers.map((pick) => (
                <DiscoverCardTile key={pick.card.id} pick={pick} badge="under" onPress={openCard} />
              ))}
            </DiscoverSection>
          ) : null}

          <DiscoverSection title="New sets">
            {discover.sets.map((set) => (
              <SetLogoTile key={set.id} set={set} onPress={openSet} />
            ))}
          </DiscoverSection>
        </>
      ) : error && autoRetries >= AUTO_RETRIES ? (
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
    </ScrollView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
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
