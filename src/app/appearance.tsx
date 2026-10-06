import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuroraBackground } from '@/components/AuroraBackground';
import { CustomThemeEditor } from '@/components/CustomThemeEditor';
import { IconButton } from '@/components/IconButton';
import { SettingToggleRow } from '@/components/SettingToggleRow';
import { ThemePreview } from '@/components/ThemePreview';
import { ThemeTile } from '@/components/ThemeTile';
import { useHaptics } from '@/hooks/useHaptics';
import { useSettings } from '@/hooks/useSettings';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
  type AppTheme,
  buildCustomTheme,
  type CustomThemeSettings,
  spacing,
  THEME_ORDER,
  THEMES,
  typography,
} from '@/theme';
import { supportsLiquidGlass } from '@/utils/glass';
import { createHaptics } from '@/utils/haptics';

const GRID_GAP = 12;

export default function AppearanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const { settings, theme, updateSettings } = useSettings();
  const [draft, setDraft] = useState<Partial<CustomThemeSettings> | null>(null);

  const editing = useMemo(() => ({ ...settings.custom, ...draft }), [settings.custom, draft]);
  const customTheme = useMemo(() => buildCustomTheme(editing), [editing]);
  const previewTheme = draft ? customTheme : theme;
  const tileWidth = (Math.min(width, 640) - spacing.lg * 2 - GRID_GAP) / 2;
  const options: AppTheme[] = [...THEME_ORDER.map((id) => THEMES[id]), customTheme];

  const commitCustom = (changes: Partial<CustomThemeSettings>) => {
    setDraft(null);
    updateSettings({ themeId: 'custom', custom: { ...settings.custom, ...changes } });
  };

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Appearance
          </Text>
          <IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />
        </View>

        <ThemePreview theme={previewTheme} />

        <Text style={styles.section}>Themes</Text>
        <View style={styles.grid}>
          {options.map((option) => (
            <ThemeTile
              key={option.id}
              option={option}
              width={tileWidth}
              selected={settings.themeId === option.id}
              onPress={() => {
                haptics.selection();
                setDraft(null);
                updateSettings({ themeId: option.id });
              }}
            />
          ))}
        </View>
        {theme.glass && !supportsLiquidGlass() ? (
          <Text style={styles.note}>
            Your iPhone shows a frosted blur for glass. True Liquid Glass needs iOS 26 or later.
          </Text>
        ) : null}

        <Text style={styles.section}>Custom colors</Text>
        <Text style={styles.note}>Changing anything here switches you to your Custom theme.</Text>
        <CustomThemeEditor
          value={editing}
          onDraft={(changes) => setDraft((current) => ({ ...current, ...changes }))}
          onCommit={commitCustom}
        />

        <Text style={styles.section}>Feel</Text>
        <SettingToggleRow
          icon="color-wand"
          title="Motion"
          description="Count-up numbers and small transitions."
          value={settings.motion}
          onChange={(motion) => {
            haptics.selection();
            updateSettings({ motion });
          }}
        />
        <SettingToggleRow
          icon="pulse"
          title="Haptics"
          description="Taps, ticks and the buzz when you collect or scan."
          value={settings.haptics}
          onChange={(enabled) => {
            updateSettings({ haptics: enabled });
            if (enabled) createHaptics(true).collect();
          }}
        />
        <SettingToggleRow
          icon="volume-medium"
          title="Sounds"
          description="Soft clicks and chimes. Muted when your phone is on silent."
          value={settings.sounds}
          onChange={(enabled) => {
            updateSettings({ sounds: enabled });
            if (enabled) createHaptics(false, true).collect();
          }}
        />
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.title,
      color: theme.colors.text,
    },
    section: {
      ...typography.caption,
      color: theme.colors.textMuted,
      marginTop: spacing.md,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GRID_GAP,
    },
    note: {
      ...typography.caption,
      color: theme.colors.textFaint,
    },
  });
}
