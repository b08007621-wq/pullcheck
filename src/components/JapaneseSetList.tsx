import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useGroupArt } from '@/hooks/useGroupArt';
import { useHaptics } from '@/hooks/useHaptics';
import { useJapaneseSets } from '@/hooks/useJapaneseSets';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { normalizeText } from '@/services/sealedQuery';
import { displaySetName, type TcgcsvGroup } from '@/services/tcgcsv';
import { japaneseLogo } from '@/services/japaneseLogos';
import { type AppTheme, spacing, typography } from '@/theme';
import type { Market } from '@/types/sealed';
import { formatDate, parseDate } from '@/utils/date';

import { DetailLayout } from './DetailLayout';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LanguageToggle } from './LanguageToggle';
import { ListRow, rowPosition } from './ListRow';
import { LoadingState } from './LoadingState';
import { SearchBar } from './SearchBar';

type Props = {
  onMarket: (market: Market) => void;
};

export function JapaneseSetList({ onMarket }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { data, error, retry } = useJapaneseSets();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = normalizeText(query);
    if (!data) return [];
    return needle ? data.filter((group) => normalizeText(group.name).includes(needle)) : data;
  }, [data, query]);

  const openSet = useCallback(
    (group: TcgcsvGroup) => {
      haptics.tap();
      router.push({ pathname: '/jpset/[id]', params: { id: String(group.groupId) } });
    },
    [haptics, router],
  );

  if (!data) {
    return (
      <DetailLayout centered>
        {error ? (
          <ErrorState title="Couldn’t load Japanese sets" message={error.message} onRetry={retry} />
        ) : (
          <LoadingState message="Loading Japanese sets…" />
        )}
      </DetailLayout>
    );
  }

  return (
    <DetailLayout
      renderList={(insets) => (
        <FlatList
          data={visible}
          keyExtractor={(group) => String(group.groupId)}
          contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <JapaneseSetRow
              group={item}
              logo={japaneseLogo(item)}
              position={rowPosition(index, visible.length)}
              onPress={openSet}
            />
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Text style={styles.title} accessibilityRole="header">
                  Sets
                </Text>
                <LanguageToggle value="jp" onChange={onMarket} />
              </View>
              <Text style={styles.subtitle}>{`${data.length} Japanese sets`}</Text>
              <SearchBar value={query} onChangeText={setQuery} placeholder="Find a Japanese set" />
            </View>
          }
          ListEmptyComponent={<EmptyState icon="search" title="No sets found" message={`Nothing matches “${query}”.`} />}
        />
      )}
    />
  );
}

function JapaneseSetRow({
  group,
  logo,
  position,
  onPress,
}: {
  group: TcgcsvGroup;
  logo: string | null;
  position: ReturnType<typeof rowPosition>;
  onPress: (group: TcgcsvGroup) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const box = useGroupArt(logo ? null : group.groupId, 'jp');
  const art = logo ?? box;
  const released = parseDate(group.publishedOn);
  return (
    <ListRow position={position} inset={88}>
      <Pressable
        onPress={() => onPress(group)}
        accessibilityRole="button"
        accessibilityLabel={group.name}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.thumb}>
          {art ? <Image source={art} style={styles.thumbImage} contentFit="contain" recyclingKey={String(group.groupId)} /> : (
            <Text style={styles.code} numberOfLines={1}>
              {group.abbreviation ?? 'JP'}
            </Text>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {displaySetName(group)}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[group.abbreviation, released ? formatDate(released) : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Pressable>
    </ListRow>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
    },
    header: {
      gap: spacing.sm,
      marginBottom: spacing.md,
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
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    thumb: {
      width: 60,
      height: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbImage: {
      width: '100%',
      height: '100%',
    },
    code: {
      ...typography.caption,
      fontWeight: '700',
      color: theme.colors.textMuted,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      ...typography.label,
      fontSize: 16,
      color: theme.colors.text,
    },
    meta: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
  });
}
