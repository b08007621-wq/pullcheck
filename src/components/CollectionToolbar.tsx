import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import type { CollectionFilter, CollectionView } from '@/types/collection';
import { BINDER_FILTERS } from '@/utils/binder';
import { type CollectionQuery, QUICK_FILTERS, SORT_OPTIONS } from '@/utils/collectionQuery';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';
import { SegmentedControl } from './SegmentedControl';
import { ViewToggle } from './ViewToggle';

type Props = {
  query: CollectionQuery;
  view: CollectionView;
  usesBinders: boolean;
  shown: number;
  onChange: (changes: Partial<CollectionQuery>) => void;
  onView: (view: CollectionView) => void;
  onFilters: () => void;
};

const TYPES: { value: CollectionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'card', label: 'Cards' },
  { value: 'sealed', label: 'Sealed' },
];

export function CollectionToolbar({ query, view, usesBinders, shown, onChange, onView, onFilters }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const activeCount = (query.quick ? 1 : 0) + (query.set ? 1 : 0) + (query.sort !== 'value' ? 1 : 0);
  const chips = [
    query.sort !== 'value'
      ? { key: 'sort', label: SORT_OPTIONS.find((option) => option.value === query.sort)?.label ?? '', clear: { sort: 'value' as const } }
      : null,
    query.quick
      ? { key: 'quick', label: QUICK_FILTERS.find((filter) => filter.value === query.quick)?.label ?? '', clear: { quick: null } }
      : null,
    query.set ? { key: 'set', label: query.set, clear: { set: null } } : null,
  ].filter((chip): chip is NonNullable<typeof chip> => chip !== null);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <GlassSurface style={styles.search}>
          <Ionicons name="search" size={17} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            value={query.text}
            onChangeText={(text) => onChange({ text })}
            placeholder="Search your collection"
            placeholderTextColor={theme.colors.textFaint}
            selectionColor={theme.colors.accent}
            keyboardAppearance={theme.mode}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search your collection"
          />
          {query.text ? (
            <Pressable onPress={() => onChange({ text: '' })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={17} color={theme.colors.textFaint} />
            </Pressable>
          ) : null}
        </GlassSurface>
        <PressableScale
          onPress={() => {
            haptics.tap();
            onFilters();
          }}
          accessibilityRole="button"
          accessibilityLabel={activeCount > 0 ? `Sort and filter, ${activeCount} active` : 'Sort and filter'}
          scaleTo={0.92}
          hitSlop={4}
        >
          <GlassSurface interactive style={styles.square}>
            <Ionicons name="options-outline" size={19} color={activeCount > 0 ? theme.colors.accent : theme.colors.text} />
            {activeCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
                <Text style={[styles.badgeText, { color: theme.colors.onAccent }]}>{activeCount}</Text>
              </View>
            ) : null}
          </GlassSurface>
        </PressableScale>
        <ViewToggle value={view} onChange={onView} />
      </View>
      <SegmentedControl options={TYPES} value={query.type} onChange={(type) => onChange({ type })} />
      {usesBinders ? (
        <SegmentedControl options={BINDER_FILTERS} value={query.binder} onChange={(binder) => onChange({ binder })} />
      ) : null}
      {chips.length > 0 || query.text ? (
        <View style={styles.chips}>
          <Text style={[styles.shown, { color: theme.colors.textMuted }]}>{shown === 1 ? '1 result' : `${shown} results`}</Text>
          {chips.map((chip) => (
            <PressableScale
              key={chip.key}
              onPress={() => {
                haptics.selection();
                onChange(chip.clear);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${chip.label}`}
              scaleTo={0.95}
            >
              <View style={[styles.chip, { backgroundColor: theme.colors.surfaceRaised }]}>
                <Text style={[styles.chipText, { color: theme.colors.text }]} numberOfLines={1}>
                  {chip.label}
                </Text>
                <Ionicons name="close" size={13} color={theme.colors.textMuted} />
              </View>
            </PressableScale>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingVertical: 0,
  },
  square: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shown: {
    ...typography.caption,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
    maxWidth: 220,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
