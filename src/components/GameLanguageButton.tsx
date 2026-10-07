import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import { languageLabel } from '@/utils/game';

import { FilterChip } from './FilterChip';
import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';
import { SheetModal } from './SheetModal';

type Props = {
  languages: readonly string[];
  value: string;
  note?: string;
  onChange: (language: string) => void;
};

export function GameLanguageButton({ languages, value, note, onChange }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const [open, setOpen] = useState(false);
  const current = languageLabel(value);

  return (
    <>
      <PressableScale
        onPress={() => {
          haptics.tap();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Showing ${current.full} cards. Change language`}
        scaleTo={0.92}
        hitSlop={6}
      >
        <GlassSurface interactive style={styles.pill}>
          <Ionicons name="language-outline" size={16} color={theme.colors.accent} />
          <Text style={[styles.label, { color: theme.colors.text }]}>{current.short}</Text>
        </GlassSurface>
      </PressableScale>
      {open ? (
        <SheetModal onClose={() => setOpen(false)}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Card language</Text>
          {note ? <Text style={[styles.note, { color: theme.colors.textMuted }]}>{note}</Text> : null}
          <ScrollView contentContainerStyle={styles.grid}>
            {languages.map((code) => (
              <View key={code}>
                <FilterChip
                  label={languageLabel(code).full}
                  selected={code === value}
                  onPress={() => {
                    onChange(code);
                    setOpen(false);
                  }}
                />
              </View>
            ))}
          </ScrollView>
        </SheetModal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.pill,
  },
  label: {
    ...typography.label,
    fontSize: 14,
  },
  title: {
    ...typography.heading,
  },
  note: {
    ...typography.caption,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
