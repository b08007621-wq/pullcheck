import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { CollectionItem, CollectionLayout, CollectionSection } from '@/types/collection';
import { CHANGE_BASIS_OPTIONS } from '@/utils/collectionChange';
import { collectionCsv } from '@/utils/collectionQuery';

import { FilterChip } from './FilterChip';
import { PressableScale } from './PressableScale';
import { SegmentedControl } from './SegmentedControl';
import { SheetModal } from './SheetModal';

type Props = {
  layout: CollectionLayout;
  items: CollectionItem[];
  onChange: (layout: CollectionLayout) => void;
  onBackup: () => void;
  onClose: () => void;
};

const SECTION_LABEL: Record<CollectionSection, { title: string; detail: string }> = {
  pulled: { title: 'Just pulled', detail: 'Cards from your last pack, right after you open it' },
  summary: { title: 'Total value', detail: 'What it’s all worth and how it’s moved' },
  chart: { title: 'Value chart & movers', detail: 'History chart plus your biggest risers and fallers' },
  recent: { title: 'Recently added', detail: 'Your newest cards and products' },
  stats: { title: 'Quick stats', detail: 'Unique cards, extra copies, this week, top card' },
  shortcuts: { title: 'Shortcuts', detail: 'Sets, upcoming releases, trades and wishlist' },
};

const GRID_OPTIONS = [
  { value: '2', label: '2 across' },
  { value: '3', label: '3 across' },
  { value: '4', label: '4 across' },
] as const;

export function CollectionCustomizeSheet({ layout, items, onChange, onBackup, onClose }: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();

  const toggle = (section: CollectionSection, visible: boolean) => {
    haptics.selection();
    const hidden = visible ? layout.hidden.filter((entry) => entry !== section) : [...layout.hidden, section];
    onChange({ ...layout, hidden });
  };

  const move = (section: CollectionSection, delta: number) => {
    const index = layout.order.indexOf(section);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= layout.order.length) return;
    haptics.selection();
    const order = [...layout.order];
    order.splice(index, 1);
    order.splice(target, 0, section);
    onChange({ ...layout, order });
  };

  const exportCsv = () => {
    haptics.tap();
    Share.share({ title: 'PullCheck collection', message: collectionCsv(items) }).catch(() => {});
  };

  return (
    <SheetModal onClose={onClose}>
      <Text style={styles.heading}>Customize</Text>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
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
        <View style={styles.sections}>
          {layout.order.map((section, index) => {
            const visible = !layout.hidden.includes(section);
            return (
              <View key={section} style={styles.sectionRow}>
                <View style={styles.arrows}>
                  <ArrowButton icon="chevron-up" disabled={index === 0} onPress={() => move(section, -1)} />
                  <ArrowButton
                    icon="chevron-down"
                    disabled={index === layout.order.length - 1}
                    onPress={() => move(section, 1)}
                  />
                </View>
                <View style={styles.sectionText}>
                  <Text style={[styles.sectionTitle, !visible && styles.muted]}>{SECTION_LABEL[section].title}</Text>
                  <Text style={styles.sectionDetail} numberOfLines={2}>
                    {SECTION_LABEL[section].detail}
                  </Text>
                </View>
                <Switch
                  value={visible}
                  onValueChange={(value) => toggle(section, value)}
                  accessibilityLabel={`Show ${SECTION_LABEL[section].title}`}
                />
              </View>
            );
          })}
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

function ArrowButton({ icon, disabled, onPress }: { icon: 'chevron-up' | 'chevron-down'; disabled: boolean; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={icon === 'chevron-up' ? 'Move up' : 'Move down'}
      scaleTo={0.85}
      hitSlop={4}
    >
      <Ionicons name={icon} size={18} color={disabled ? styles.arrowOff.color : styles.arrowOn.color} />
    </PressableScale>
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
    sections: {
      gap: spacing.xs,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 6,
    },
    arrows: {
      gap: 2,
    },
    arrowOn: {
      color: theme.colors.text,
    },
    arrowOff: {
      color: theme.colors.textFaint,
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
    muted: {
      color: theme.colors.textMuted,
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
