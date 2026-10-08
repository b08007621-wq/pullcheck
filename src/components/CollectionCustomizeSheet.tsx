import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { ChartCards, CollectionItem, CollectionLayout } from '@/types/collection';
import { CHANGE_BASIS_OPTIONS } from '@/utils/collectionChange';
import { RANGES } from '@/utils/movers';
import { collectionCsv } from '@/utils/collectionQuery';
import { SECTION_LABEL } from '@/utils/collectionSections';

import { FilterChip } from './FilterChip';
import { SegmentedControl } from './SegmentedControl';
import { SheetModal } from './SheetModal';

type Props = {
  layout: CollectionLayout;
  items: CollectionItem[];
  hidden: string[];
  onToggleSection: (section: string) => void;
  onArrange: () => void;
  onChange: (layout: CollectionLayout) => void;
  onBackup: () => void;
  onClose: () => void;
};

const CHART_CARD_OPTIONS: { value: ChartCards; label: string }[] = [
  { value: 'both', label: 'Both' },
  { value: 'gainers', label: 'Risers' },
  { value: 'losers', label: 'Fallers' },
  { value: 'off', label: 'Hidden' },
];

const GRID_OPTIONS = [
  { value: '2', label: '2 across' },
  { value: '3', label: '3 across' },
  { value: '4', label: '4 across' },
] as const;

export function CollectionCustomizeSheet({
  layout,
  items,
  hidden,
  onToggleSection,
  onArrange,
  onChange,
  onBackup,
  onClose,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();

  const exportCsv = () => {
    haptics.tap();
    Share.share({ title: 'PullCheck collection', message: collectionCsv(items) }).catch(() => {});
  };

  return (
    <SheetModal onClose={onClose}>
      <Text style={styles.heading}>Customize</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>Price changes show</Text>
        <View style={styles.chips}>
          {CHANGE_BASIS_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              selected={layout.changeBasis === option.value}
              onPress={() => onChange({ ...layout, changeBasis: option.value })}
            />
          ))}
        </View>
        <Text style={styles.note}>Auto uses what you paid when you’ve entered it, otherwise the price when you added it.</Text>

        <Text style={styles.label}>Sections</Text>
        <Pressable
          onPress={onArrange}
          accessibilityRole="button"
          style={({ pressed }) => [styles.export, styles.exportTight, pressed && styles.pressed]}
        >
          <Ionicons name="move-outline" size={18} color={styles.exportText.color} />
          <Text style={styles.exportText}>Arrange this page</Text>
        </Pressable>
        <Text style={styles.note}>Or hold any section on the page. Drag it anywhere, and drag its corner handle to resize it.</Text>
        {layout.order.map((section) => (
          <View key={section} style={styles.sectionRow}>
            <View style={styles.sectionText}>
              <Text style={styles.sectionTitle}>{SECTION_LABEL[section].title}</Text>
              <Text style={styles.sectionDetail}>{SECTION_LABEL[section].detail}</Text>
            </View>
            <Switch
              value={!hidden.includes(section)}
              onValueChange={() => {
                haptics.selection();
                onToggleSection(section);
              }}
              accessibilityLabel={`Show ${SECTION_LABEL[section].title}`}
            />
          </View>
        ))}

        <Text style={styles.label}>Value chart</Text>
        <Text style={styles.sectionDetail}>Cards shown under the chart</Text>
        <SegmentedControl
          options={CHART_CARD_OPTIONS}
          value={layout.chartCards}
          onChange={(value) => onChange({ ...layout, chartCards: value })}
        />
        <Text style={styles.sectionDetail}>Starts on</Text>
        <SegmentedControl
          options={RANGES.map((option) => ({ value: option.value, label: option.label }))}
          value={layout.chartRange}
          onChange={(value) => onChange({ ...layout, chartRange: value })}
        />
        <View style={styles.sectionRow}>
          <View style={styles.sectionText}>
            <Text style={styles.sectionTitle}>Range buttons</Text>
            <Text style={styles.sectionDetail}>Switch between 7 days, 30 days, a year and all time</Text>
          </View>
          <Switch
            value={layout.chartRanges}
            onValueChange={(value) => {
              haptics.selection();
              onChange({ ...layout, chartRanges: value });
            }}
            accessibilityLabel="Show chart range buttons"
          />
        </View>

        <Text style={styles.label}>Grid</Text>
        <SegmentedControl
          options={GRID_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          value={String(layout.gridColumns) as '2' | '3' | '4'}
          onChange={(value) => onChange({ ...layout, gridColumns: Number(value) as 2 | 3 | 4 })}
        />
        <View style={styles.sectionRow}>
          <View style={styles.sectionText}>
            <Text style={styles.sectionTitle}>Names under cards</Text>
            <Text style={styles.sectionDetail}>Price and change always show</Text>
          </View>
          <Switch
            value={layout.gridDetails}
            onValueChange={(value) => {
              haptics.selection();
              onChange({ ...layout, gridDetails: value });
            }}
            accessibilityLabel="Show names under grid cards"
          />
        </View>

        <Pressable onPress={onBackup} accessibilityRole="button" style={({ pressed }) => [styles.export, pressed && styles.pressed]}>
          <Ionicons name="cloud-upload-outline" size={18} color={styles.exportText.color} />
          <Text style={styles.exportText}>Backup, restore & import</Text>
        </Pressable>
        <Pressable onPress={exportCsv} accessibilityRole="button" style={({ pressed }) => [styles.export, styles.exportTight, pressed && styles.pressed]}>
          <Ionicons name="share-outline" size={18} color={styles.exportText.color} />
          <Text style={styles.exportText}>Export collection as CSV</Text>
        </Pressable>
      </ScrollView>
      <Pressable onPress={onClose} accessibilityRole="button" style={styles.done}>
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </SheetModal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    heading: {
      ...typography.heading,
      color: theme.colors.text,
    },
    scroll: {
      flexGrow: 0,
    },
    body: {
      gap: spacing.sm,
      paddingBottom: spacing.sm,
    },
    label: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.textMuted,
      paddingTop: spacing.sm,
    },
    note: {
      ...typography.caption,
      color: theme.colors.textFaint,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 6,
    },
    sectionText: {
      flex: 1,
      gap: 1,
    },
    sectionTitle: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
    },
    sectionDetail: {
      ...typography.caption,
      fontSize: 12,
      color: theme.colors.textFaint,
    },
    export: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingVertical: 12,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.surfaceRaised,
    },
    exportTight: {
      marginTop: 0,
    },
    pressed: {
      opacity: 0.7,
    },
    exportText: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
    },
    done: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 48,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.accent,
    },
    doneText: {
      ...typography.label,
      color: theme.colors.onAccent,
    },
  });
}
