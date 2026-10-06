import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography, withAlpha } from '@/theme';
import type { Binder } from '@/types/collection';

import { BinderChoice } from './BinderChoice';
import { PressableScale } from './PressableScale';

type Props = {
  ready: boolean;
  added: string | null;
  primaryLabel: string;
  onAdd: (binder: Binder | null) => void;
  onOpen: () => void;
  showBinder: boolean;
};

export function ScanResultActions({ ready, added, primaryLabel, onAdd, onOpen, showBinder }: Props) {
  const theme = useTheme();
  const [choosing, setChoosing] = useState(false);
  const done = added !== null;
  const fill = { backgroundColor: withAlpha(theme.colors.text, 0.09) };

  if (choosing && !done) {
    return (
      <View style={styles.stack}>
        <BinderChoice
          onPick={(binder) => {
            setChoosing(false);
            onAdd(binder);
          }}
        />
        <PressableScale onPress={() => setChoosing(false)} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={[styles.link, { color: theme.colors.textMuted }]}>Back</Text>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <PressableScale
        onPress={() => onAdd(null)}
        disabled={!ready || done}
        accessibilityRole="button"
        accessibilityLabel={done ? added : primaryLabel}
        accessibilityState={{ disabled: !ready || done }}
        scaleTo={0.97}
      >
        <View
          style={[
            styles.primary,
            { backgroundColor: done ? theme.colors.gain : theme.colors.accent },
            !ready && styles.waiting,
          ]}
        >
          <Ionicons name={done ? 'checkmark' : 'add'} size={20} color={theme.colors.onAccent} />
          <Text style={[styles.primaryLabel, { color: theme.colors.onAccent }]}>{done ? added : primaryLabel}</Text>
        </View>
      </PressableScale>
      <View style={styles.row}>
        {showBinder ? (
          <View style={styles.cell}>
            <PressableScale
              onPress={() => setChoosing(true)}
              disabled={!ready || done}
              accessibilityRole="button"
              accessibilityLabel="Add to binder"
              scaleTo={0.97}
            >
              <View style={[styles.secondary, fill, !ready && styles.waiting]}>
                <Ionicons name="albums-outline" size={18} color={theme.colors.text} />
                <Text style={[styles.secondaryLabel, { color: theme.colors.text }]}>Add to binder</Text>
              </View>
            </PressableScale>
          </View>
        ) : null}
        <View style={styles.cell}>
          <PressableScale
            onPress={onOpen}
            disabled={!ready}
            accessibilityRole="button"
            accessibilityLabel="Open card page"
            scaleTo={0.97}
          >
            <View style={[styles.secondary, fill, !ready && styles.waiting]}>
              <Ionicons name="open-outline" size={18} color={theme.colors.text} />
              <Text style={[styles.secondaryLabel, { color: theme.colors.text }]}>Details</Text>
            </View>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
  },
  primaryLabel: {
    ...typography.label,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  secondaryLabel: {
    ...typography.label,
    fontSize: 15,
  },
  waiting: {
    opacity: 0.5,
  },
  link: {
    ...typography.caption,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
});
