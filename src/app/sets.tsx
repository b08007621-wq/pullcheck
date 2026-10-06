import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { SectionList, type SectionListData, StyleSheet, Text, View } from 'react-native';

import { DetailLayout } from '@/components/DetailLayout';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { rowPosition } from '@/components/ListRow';
import { LoadingState } from '@/components/LoadingState';
import { SearchBar } from '@/components/SearchBar';
import { SetRow } from '@/components/SetRow';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useSets } from '@/hooks/useSets';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { normalizeText } from '@/services/sealedQuery';
import { type AppTheme, spacing, typography } from '@/theme';
import type { SetInfo } from '@/types/set';
import { listProgress, type SetListProgress } from '@/utils/setProgress';

type Section = {
  title: string;
  data: SetInfo[];
};

export default function SetsScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { items } = useCollection();
  const { sets, error, retry } = useSets();
  const [query, setQuery] = useState('');

  const progress = useMemo(() => (sets ? listProgress(items, sets) : new Map<string, SetListProgress>()), [items, sets]);
  const sections = useMemo(() => (sets ? buildSections(sets, progress, query) : []), [sets, progress, query]);
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
      <SetRow
        set={item}
        progress={progress.get(item.id) ?? null}
        position={rowPosition(index, section.data.length)}
        onPress={openSet}
      />
    ),
    [progress, openSet],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<SetInfo, Section> }) => (
      <Text style={styles.sectionTitle}>{section.title}</Text>
    ),
    [styles.sectionTitle],
  );

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
        <SectionList
          sections={sections}
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
              <Text style={styles.title} accessibilityRole="header">
                Sets
              </Text>
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
      )}
    />
  );
}

function buildSections(sets: SetInfo[], progress: Map<string, SetListProgress>, query: string): Section[] {
  const newestFirst = [...sets].sort((first, second) => second.releaseDate.localeCompare(first.releaseDate));
  const needle = normalizeText(query);
  if (needle) {
    const matches = newestFirst.filter((set) =>
      [set.name, set.series, set.ptcgoCode ?? ''].some((text) => normalizeText(text).includes(needle)),
    );
    return matches.length > 0 ? [{ title: 'Results', data: matches }] : [];
  }

  const sections: Section[] = [];
  const inProgress = newestFirst
    .filter((set) => progress.has(set.id))
    .sort((first, second) => (progress.get(second.id)?.percent ?? 0) - (progress.get(first.id)?.percent ?? 0));
  if (inProgress.length > 0) sections.push({ title: 'Your sets', data: inProgress });

  const bySeries = new Map<string, SetInfo[]>();
  for (const set of newestFirst) {
    const list = bySeries.get(set.series) ?? [];
    list.push(set);
    bySeries.set(set.series, list);
  }
  for (const [series, list] of bySeries) sections.push({ title: series, data: list });
  return sections;
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
