import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCollection } from '@/hooks/useCollection';
import { useSets } from '@/hooks/useSets';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { RipSource } from '@/types/rip';
import { parseMoney } from '@/utils/price';
import { ownedOptions, presetOptions, type RipOption } from '@/utils/rip';

import { ActionButton } from './ActionButton';
import { RipOptionRow } from './RipOptionRow';
import { SheetModal } from './SheetModal';

type Props = {
  onStart: (source: RipSource) => void;
  onClose: () => void;
};

const DEFAULT_OPTION = 'preset:boosterPack';

export function RipSetupSheet({ onStart, onClose }: Props) {
  const styles = useThemedStyles(createStyles);
  const { items } = useCollection();
  const owned = useMemo(() => ownedOptions(items), [items]);
  const presets = useMemo(() => presetOptions(), []);
  const [selectedId, setSelectedId] = useState(DEFAULT_OPTION);
  const [costText, setCostText] = useState<string | null>(null);
  const [pickedSet, setPickedSet] = useState<string | null>(null);
  const { sets } = useSets();
  const recentSets = useMemo(
    () =>
      (sets ?? [])
        .filter((set) => !/promo|energ|trainer kit|mcdonald/i.test(set.name) && set.total >= 60)
        .sort((first, second) => second.releaseDate.localeCompare(first.releaseDate))
        .slice(0, 12),
    [sets],
  );
  const selected = [...owned, ...presets].find((option) => option.id === selectedId) ?? presets[0] ?? null;
  const cost = costText === null ? (selected?.cost ?? null) : parseMoney(costText);
  const invalid = costText !== null && cost === null;

  const select = (option: RipOption) => {
    setSelectedId(option.id);
    setCostText(null);
  };

  const start = () => {
    if (!selected || cost === null) return;
    onStart({
      title: selected.title,
      cost,
      packs: selected.packs,
      sourceKey: selected.sourceKey,
      imageUrl: selected.imageUrl,
      setName: selected.setName ?? pickedSet,
    });
    onClose();
  };

  const renderGroup = (title: string, options: RipOption[]) =>
    options.length > 0 ? (
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{title}</Text>
        {options.map((option) => (
          <RipOptionRow
            key={option.id}
            option={option}
            selected={option.id === selected?.id}
            onPress={() => select(option)}
          />
        ))}
      </View>
    ) : null;

  return (
    <SheetModal onClose={onClose}>
      <Text style={styles.heading}>Pull</Text>
      <Text style={styles.subheading}>Scan every hit. See if it paid off.</Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {renderGroup('From your collection', owned)}
        {renderGroup('Products', presets)}
      </ScrollView>
      {selected && !selected.setName && recentSets.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Which set?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {recentSets.map((set) => {
              const active = pickedSet === set.name;
              return (
                <Pressable
                  key={set.id}
                  onPress={() => setPickedSet(active ? null : set.name)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{set.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      <View style={[styles.field, invalid && styles.fieldInvalid]}>
        <Text style={styles.fieldLabel}>Cost</Text>
        <Text style={styles.currency}>$</Text>
        <TextInput
          value={costText ?? (selected ? selected.cost.toFixed(2) : '')}
          onChangeText={setCostText}
          placeholder="0.00"
          placeholderTextColor={styles.placeholder.color}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
          style={styles.input}
          accessibilityLabel="What it cost in US dollars"
        />
      </View>
      <View style={styles.actions}>
        <ActionButton label="Cancel" variant="secondary" onPress={onClose} />
        <ActionButton label="Start" icon="flash" onPress={start} />
      </View>
    </SheetModal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    heading: {
      ...typography.heading,
      color: theme.colors.text,
    },
    subheading: {
      ...typography.caption,
      color: theme.colors.textMuted,
      marginTop: -spacing.sm,
    },
    list: {
      flexGrow: 0,
    },
    listContent: {
      gap: spacing.md,
    },
    group: {
      gap: spacing.xs,
    },
    chips: {
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.surfaceRaised,
    },
    chipActive: {
      backgroundColor: theme.colors.accent,
    },
    chipText: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.text,
    },
    chipTextActive: {
      color: theme.colors.onAccent,
    },
    groupTitle: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    fieldInvalid: {
      borderColor: theme.colors.danger,
    },
    fieldLabel: {
      ...typography.label,
      color: theme.colors.textMuted,
      marginRight: 'auto',
    },
    currency: {
      ...typography.heading,
      color: theme.colors.textMuted,
    },
    input: {
      ...typography.heading,
      minWidth: 90,
      textAlign: 'right',
      color: theme.colors.text,
      paddingVertical: spacing.md,
    },
    placeholder: {
      color: theme.colors.textFaint,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'center',
    },
  });
}
