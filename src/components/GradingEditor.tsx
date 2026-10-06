import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { Grading, GradingCompany } from '@/types/collection';
import { parseMoney } from '@/utils/price';

import { ActionButton } from './ActionButton';
import { SegmentedControl } from './SegmentedControl';
import { SheetModal } from './SheetModal';

type Props = {
  initial: Grading | null;
  onSave: (grading: Grading | null) => void;
  onClose: () => void;
};

const COMPANIES: { value: GradingCompany; label: string }[] = [
  { value: 'PSA', label: 'PSA' },
  { value: 'BGS', label: 'BGS' },
  { value: 'CGC', label: 'CGC' },
  { value: 'TAG', label: 'TAG' },
];

const GRADES = ['10', '9.5', '9', '8.5', '8', '7', '6', '5', '4', '3', '2', '1'];

export function GradingEditor({ initial, onSave, onClose }: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const [company, setCompany] = useState<GradingCompany>(initial?.company ?? 'PSA');
  const [grade, setGrade] = useState(initial?.grade ?? '10');
  const [text, setText] = useState(initial?.value ? initial.value.toFixed(2) : '');
  const value = parseMoney(text);
  const invalid = text.trim().length > 0 && value === null;

  const save = () => {
    if (invalid) return;
    onSave({ company, grade, value });
    onClose();
  };

  return (
    <SheetModal onClose={onClose}>
      <Text style={styles.heading}>Graded copy</Text>
      <SegmentedControl options={COMPANIES} value={company} onChange={setCompany} />
      <View style={styles.grades}>
        {GRADES.map((entry) => {
          const selected = entry === grade;
          return (
            <Pressable
              key={entry}
              onPress={() => {
                haptics.selection();
                setGrade(entry);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Grade ${entry}`}
              style={[styles.grade, selected && styles.gradeSelected]}
            >
              <Text style={[styles.gradeText, selected && styles.gradeTextSelected]}>{entry}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.label}>Value of this slab (optional)</Text>
      <View style={[styles.field, invalid && styles.fieldInvalid]}>
        <Text style={styles.currency}>$</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Uses the raw price if empty"
          placeholderTextColor={styles.placeholder.color}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={save}
          style={styles.input}
          accessibilityLabel="Graded value in US dollars"
        />
      </View>
      <View style={styles.actions}>
        <ActionButton label="Save" icon="checkmark" onPress={save} />
        {initial ? (
          <ActionButton
            label="Not graded"
            icon="close"
            variant="secondary"
            onPress={() => {
              onSave(null);
              onClose();
            }}
          />
        ) : (
          <ActionButton label="Cancel" variant="secondary" onPress={onClose} />
        )}
      </View>
    </SheetModal>
  );
}

export function gradingLabel(grading: Grading): string {
  return `${grading.company} ${grading.grade}`;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    heading: {
      ...typography.heading,
      color: theme.colors.text,
    },
    grades: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    grade: {
      minWidth: 48,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: theme.colors.surfaceRaised,
    },
    gradeSelected: {
      backgroundColor: theme.colors.accent,
    },
    gradeText: {
      ...typography.label,
      color: theme.colors.text,
    },
    gradeTextSelected: {
      color: theme.colors.onAccent,
    },
    label: {
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
    currency: {
      ...typography.heading,
      color: theme.colors.textMuted,
    },
    input: {
      flex: 1,
      ...typography.body,
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
