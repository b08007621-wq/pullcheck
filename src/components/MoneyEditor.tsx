import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { PaidPrice } from '@/types/collection';
import { parseMoney } from '@/utils/price';

import { ActionButton } from './ActionButton';
import { SheetModal } from './SheetModal';

type Props = {
  initial: PaidPrice | null;
  heading: string;
  message: string;
  onSave: (value: PaidPrice | null) => void;
  onClose: () => void;
  clearable?: boolean;
};

export function MoneyEditor({ initial, heading, message, onSave, onClose, clearable = true }: Props) {
  const styles = useThemedStyles(createStyles);
  const [text, setText] = useState(initial ? initial.amount.toFixed(2) : '');
  const amount = parseMoney(text);
  const invalid = text.trim().length > 0 && amount === null;

  const save = () => {
    if (invalid) return;
    onSave(amount === null ? null : { amount, currency: 'USD' });
    onClose();
  };

  return (
    <SheetModal onClose={onClose}>
      <Text style={styles.heading}>{heading}</Text>
      <Text style={styles.subheading} numberOfLines={3}>
        {message}
      </Text>
      <View style={[styles.field, invalid && styles.fieldInvalid]}>
        <Text style={styles.currency}>$</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="0.00"
          placeholderTextColor={styles.placeholder.color}
          keyboardType="decimal-pad"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={save}
          style={styles.input}
          accessibilityLabel={`${heading} In US dollars`}
        />
      </View>
      {invalid ? <Text style={styles.error}>Enter a price like 29.99</Text> : null}
      <View style={styles.actions}>
        <ActionButton label="Save" icon="checkmark" onPress={save} />
        {initial && clearable ? (
          <ActionButton
            label="Clear"
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
      ...typography.heading,
      color: theme.colors.text,
      paddingVertical: spacing.md,
    },
    placeholder: {
      color: theme.colors.textFaint,
    },
    error: {
      ...typography.caption,
      color: theme.colors.danger,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'center',
    },
  });
}
