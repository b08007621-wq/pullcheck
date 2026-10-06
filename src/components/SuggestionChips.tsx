import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import type { IconName } from '@/types/icon';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

type Props = {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  title?: string;
  icon?: IconName;
  onClear?: () => void;
  align?: 'center' | 'start';
};

export function SuggestionChips({ suggestions, onSelect, title, icon, onClear, align = 'center' }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  if (suggestions.length === 0) return null;
  const start = align === 'start';

  return (
    <View style={[styles.section, start && styles.sectionStart]}>
      {title ? (
        <View style={[styles.header, start && styles.headerStart]}>
          {icon ? <Ionicons name={icon} size={13} color={theme.colors.textMuted} /> : null}
          <Text style={[styles.title, { color: theme.colors.textMuted }]}>{title}</Text>
          {onClear ? (
            <Pressable
              onPress={() => {
                haptics.tap();
                onClear();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Clear ${title.toLowerCase()}`}
            >
              <Text style={[styles.clear, { color: theme.colors.accent }]}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.wrap, start && styles.wrapStart]}>
        {suggestions.map((suggestion) => (
          <PressableScale
            key={suggestion}
            accessibilityRole="button"
            accessibilityLabel={`Search ${suggestion}`}
            onPress={() => {
              haptics.selection();
              onSelect(suggestion);
            }}
          >
            <GlassSurface interactive style={styles.chip}>
              <Text style={[styles.text, { color: theme.colors.text }]}>{suggestion}</Text>
            </GlassSurface>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  sectionStart: {
    marginTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  headerStart: {
    justifyContent: 'flex-start',
  },
  wrapStart: {
    justifyContent: 'flex-start',
  },
  title: {
    ...typography.caption,
  },
  clear: {
    ...typography.caption,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  text: {
    ...typography.caption,
    fontSize: 14,
  },
});
