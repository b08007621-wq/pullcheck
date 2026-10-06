import { StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import type { DexLanguage } from '@/types/tcgdex';

import { PressableScale } from './PressableScale';

type Props = {
  languages: DexLanguage[];
  value: DexLanguage;
  onChange: (language: DexLanguage) => void;
};

const LABELS: Record<DexLanguage, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  ja: '日本語',
};

export function LanguagePills({ languages, value, onChange }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  if (languages.length < 2) return null;

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {languages.map((language) => {
        const selected = language === value;
        return (
          <PressableScale
            key={language}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(language);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={LABELS[language]}
            scaleTo={0.94}
            hitSlop={4}
          >
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: selected ? theme.colors.text : 'transparent',
                  borderColor: selected ? theme.colors.text : theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.label, { color: selected ? theme.colors.background : theme.colors.textMuted }]}>
                {language.toUpperCase()}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  pill: {
    minWidth: 40,
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
