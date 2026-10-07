import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, type SectionListData, StyleSheet, Text, View } from 'react-native';

import { DetailLayout } from '@/components/DetailLayout';
import { EmptyState } from '@/components/EmptyState';
import { JapaneseSetList } from '@/components/JapaneseSetList';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ErrorState } from '@/components/ErrorState';
import { rowPosition } from '@/components/ListRow';
import { LoadingState } from '@/components/LoadingState';
import { SearchBar } from '@/components/SearchBar';
import { SetArrangeRow, SetCell, SetDragProvider } from '@/components/SetArrangeRow';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useSetArrange } from '@/hooks/useSetArrange';
import { useSets } from '@/hooks/useSets';
import { useSettings } from '@/hooks/useSettings';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { normalizeText } from '@/services/sealedQuery';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { PokemonMarket } from '@/types/sealed';
import type { SetInfo } from '@/types/set';
import { listProgress, type SetListProgress } from '@/utils/setProgress';

type Section = {
  key: string;
  title: string;
  data: SetInfo[];
};

export default function SetsScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { items } = useCollection();
  const { sets, error, retry } = useSets();
  const { settings, updateSettings } = useSettings();
  const [query, setQuery] = useState('');
  const [market, setMarket] = useState<PokemonMarket>('en');
  const savedOrder = settings.setOrder;

  const progress = useMemo(() => (sets ? listProgress(items, sets) : new Map<string, SetListProgress>()), [items, sets]);
  const sections = useMemo(
    () => (sets ? buildSections(sets, progress, query, savedOrder) : []),
    [sets, progress, query, savedOrder],
  );
  const searching = normalizeText(query).length > 0;

  const saveMove = useCallback(
    (key: string, from: number, to: number) => {
      const section = sections.find((entry) => entry.key === key);
      if (!section) return;
      const ids = section.data.map((set) => set.id);
      const [moved] = ids.splice(from, 1);
      if (!moved) return;
      ids.splice(to, 0, moved);
      updateSettings({ setOrder: { ...savedOrder, [key]: ids } });
    },
    [sections, savedOrder, updateSettings],
  );

  const arrange = useSetArrange(saveMove);
  const hasCustomOrder = Object.keys(savedOrder).length > 0;
  const started = progress.size;
  const completed = [...progress.values()].filter((entry) => entry.owned >= entry.total).length;

  const openSet = useCallback(
    (set: SetInfo) => {
      haptics.tap();
      router.push({ pathname: '/set/[id]', params: { id: set.id } });
    },
    [haptics, router],
  );

  const renderItem = useCallback(
    ({ item, index, section }: { item: SetInfo; index: number; section: SectionListData<SetInfo, Section> }) => (
      <SetArrangeRow
        set={item}
        progress={progress.get(item.id) ?? null}
        position={rowPosition(index, section.data.length)}
        section={section.key}
        index={index}
        count={section.data.length}
        locked={searching}
        arrange={arrange}
        onPress={openSet}
      />
    ),
    [progress, openSet, searching, arrange],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<SetInfo, Section> }) => (
      <Text style={styles.sectionTitle}>{section.title}</Text>
    ),
    [styles.sectionTitle],
  );

  if (market === 'jp') return <JapaneseSetList onMarket={setMarket} />;

  if (!sets) {
    return (
      <DetailLayout centered>
        {error ? (
          <ErrorState title="Couldn’t load the sets" message={error.message} onRetry={retry} />
        ) : (
          <LoadingState message="Loading sets…" />
        )}
      </DetailLayout>
    );
  }

  return (
    <DetailLayout
      renderList={(insets) => (
        <SetDragProvider drag={arrange.drag}>
          <SectionList
            sections={sections}
            CellRendererComponent={SetCell}
            scrollEnabled={arrange.drag === null}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            windowSize={11}
            ListHeaderComponent={
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} accessibilityRole="header">
                    Sets
                  </Text>
                  {arrange.arranging ? (
                    <Pressable onPress={arrange.finish} accessibilityRole="button" hitSlop={8} style={styles.done}>
                      <Text style={styles.doneText}>Done</Text>
                    </Pressable>
                  ) : (
                    <LanguageToggle value={market} onChange={setMarket} />
                  )}
                </View>
                {arrange.arranging ? (
                  <View style={styles.arrangeBar}>
                    <Text style={styles.arrangeHint}>Drag a set to its new spot. It saves when you let go.</Text>
                    {hasCustomOrder ? (
                      <Pressable
                        onPress={() => {
                          haptics.selection();
                          updateSettings({ setOrder: {} });
                        }}
                        accessibilityRole="button"
                        hitSlop={8}
                      >
                        <Text style={styles.reset}>Reset order</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                <Text style={styles.subtitle}>
                  {started === 0
                    ? `${sets.length} sets · add cards to start tracking`
                    : `${started} started${completed > 0 ? ` · ${completed} complete` : ''} · ${sets.length} sets`}
                </Text>
                <SearchBar value={query} onChangeText={setQuery} placeholder="Find a set" />
              </View>
            }
            ListEmptyComponent={
              <EmptyState icon="search" title="No sets found" message={`Nothing matches “${query}”.`} />
            }
          />
        </SetDragProvider>
      )}
    />
  );
}

function buildSections(
  sets: SetInfo[],
  progress: Map<string, SetListProgress>,
  query: string,
  saved: Record<string, string[]>,
): Section[] {
  const newestFirst = [...sets].sort((first, second) => second.releaseDate.localeCompare(first.releaseDate));
  const needle = normalizeText(query);
  if (needle) {
    const matches = newestFirst.filter((set) =>
      [set.name, set.series, set.ptcgoCode ?? ''].some((text) => normalizeText(text).includes(needle)),
    );
    return matches.length > 0 ? [{ key: 'results', title: 'Results', data: matches }] : [];
  }

  const sections: Section[] = [];
  const inProgress = newestFirst
    .filter((set) => progress.has(set.id))
    .sort((first, second) => (progress.get(second.id)?.percent ?? 0) - (progress.get(first.id)?.percent ?? 0));
  if (inProgress.length > 0) sections.push({ key: 'yours', title: 'Your sets', data: applyOrder(inProgress, saved.yours) });

  const bySeries = new Map<string, SetInfo[]>();
  for (const set of newestFirst) {
    const list = bySeries.get(set.series) ?? [];
    list.push(set);
    bySeries.set(set.series, list);
  }
  for (const [series, list] of bySeries) {
    const key = `series:${series}`;
    sections.push({ key, title: series, data: applyOrder(list, saved[key]) });
  }
  return sections;
}

function applyOrder(list: SetInfo[], saved: string[] | undefined): SetInfo[] {
  if (!saved || saved.length === 0) return list;
  const rank = new Map(saved.map((id, index) => [id, index]));
  return [...list].sort(
    (first, second) => (rank.get(first.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(second.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

function keyExtractor(set: SetInfo, index: number): string {
  return `${set.id}-${index}`;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
    },
    header: {
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.title,
      color: theme.colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: theme.colors.textMuted,
      marginTop: -spacing.xs,
      marginBottom: spacing.xs,
    },
    done: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.accent,
    },
    doneText: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.onAccent,
    },
    arrangeBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    arrangeHint: {
      ...typography.caption,
      flex: 1,
      color: theme.colors.textMuted,
    },
    reset: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    sectionTitle: {
      ...typography.heading,
      fontSize: 18,
      color: theme.colors.text,
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
  });
}
