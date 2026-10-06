import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuroraBackground } from '@/components/AuroraBackground';
import { CustomThemeEditor } from '@/components/CustomThemeEditor';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { SettingToggleRow } from '@/components/SettingToggleRow';
import { ThemePreview } from '@/components/ThemePreview';
import { ThemeTile } from '@/components/ThemeTile';
import { useHaptics } from '@/hooks/useHaptics';
import { useSettings } from '@/hooks/useSettings';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { ActionButton } from '@/components/ActionButton';
import { savedTheme } from '@/state/savedTheme';
import {
  type AppTheme,
  buildCustomTheme,
  type CustomThemeSettings,
  DEFAULT_CUSTOM_THEME,
  spacing,
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

  const active = settings.savedThemes.find((entry) => `saved:${entry.id}` === settings.themeId) ?? null;
  const editing = useMemo(() => ({ ...(active?.custom ?? DEFAULT_CUSTOM_THEME), ...draft }), [active, draft]);
  const customTheme = useMemo(() => buildCustomTheme(editing), [editing]);
  const previewTheme = draft && active ? customTheme : theme;
  const tileWidth = (Math.min(width, 640) - spacing.lg * 2 - GRID_GAP) / 2;
  const options: AppTheme[] = [THEMES.graphite, ...settings.savedThemes.map(savedTheme)];

  const commitCustom = (changes: Partial<CustomThemeSettings>) => {
    if (!active) return;
    setDraft(null);
    updateSettings({
      savedThemes: settings.savedThemes.map((entry) =>
        entry.id === active.id ? { ...entry, custom: { ...entry.custom, ...changes } } : entry,
      ),
    });
  };

  const createTheme = () => {
    haptics.selection();
    const id = Date.now().toString(36);
    const name = `Theme ${settings.savedThemes.length + 1}`;
    setDraft(null);
    updateSettings({
      savedThemes: [...settings.savedThemes, { id, name, custom: { ...(active?.custom ?? DEFAULT_CUSTOM_THEME) } }],
      themeId: `saved:${id}`,
    });
  };

  const deleteTheme = () => {
    if (!active) return;
    Alert.alert(`Delete ${active.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          haptics.remove();
          setDraft(null);
          updateSettings({
            savedThemes: settings.savedThemes.filter((entry) => entry.id !== active.id),
            themeId: 'graphite',
          });
        },
      },
    ]);
  };

  const renameTheme = () => {
    if (!active) return;
    Alert.prompt?.(
      'Rename theme',
      undefined,
      (name) => {
        const trimmed = name.trim().slice(0, 24);
        if (!trimmed) return;
        updateSettings({
          savedThemes: settings.savedThemes.map((entry) => (entry.id === active.id ? { ...entry, name: trimmed } : entry)),
        });
      },
      'plain-text',
      active.name,
    );
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
          <PressableScale
            onPress={createTheme}
            accessibilityRole="button"
            accessibilityLabel="New theme"
            style={[styles.newTile, { width: tileWidth }]}
          >
            <Ionicons name="add" size={26} color={theme.colors.accent} />
            <Text style={styles.newText}>New theme</Text>
          </PressableScale>
        </View>
        {theme.glass && !supportsLiquidGlass() ? (
          <Text style={styles.note}>
            Your iPhone shows a frosted blur for glass. True Liquid Glass needs iOS 26 or later.
          </Text>
        ) : null}

        {active ? (
          <>
            <Text style={styles.section}>{active.name}</Text>
            <CustomThemeEditor
              value={editing}
              onDraft={(changes) => setDraft((current) => ({ ...current, ...changes }))}
              onCommit={commitCustom}
            />
            <View style={styles.themeActions}>
              <ActionButton label="Rename" icon="pencil" variant="secondary" onPress={renameTheme} />
              <ActionButton label="Delete" icon="trash-outline" variant="secondary" onPress={deleteTheme} />
            </View>
          </>
        ) : null}

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
    newTile: {
      minHeight: 120,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
    },
    newText: {
      ...typography.label,
      color: theme.colors.text,
    },
    themeActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
  });
}
