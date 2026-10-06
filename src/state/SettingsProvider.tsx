import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { readJson, STORAGE_KEYS, writeJson } from '@/services/storage';
import {
  buildCustomTheme,
  DEFAULT_THEME_ID,
  isThemeChoice,
  sanitizeCustomTheme,
  type ThemeChoice,
  THEMES,
} from '@/theme';

import { DEFAULT_SETTINGS, DESIGN_VERSION, type Settings, SettingsContext } from './settingsContext';

type Props = {
  children: ReactNode;
};

const RETIRED_THEMES: Record<string, ThemeChoice> = {
  classic: 'cardBack',
  ember: 'amethyst',
};

export function SettingsProvider({ children }: Props) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    readJson<Partial<Settings>>(STORAGE_KEYS.settings).then((stored) => {
      if (stored) setSettings(sanitize(stored));
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) writeJson(STORAGE_KEYS.settings, settings);
  }, [isLoaded, settings]);

  const updateSettings = useCallback((changes: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...changes }));
  }, []);

  const theme = useMemo(
    () => (settings.themeId === 'custom' ? buildCustomTheme(settings.custom) : THEMES[settings.themeId]),
    [settings.themeId, settings.custom],
  );

  const value = useMemo(() => ({ settings, theme, updateSettings }), [settings, theme, updateSettings]);

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: THEMES[DEFAULT_THEME_ID].colors.background }} />;
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

function sanitize(stored: Partial<Settings>): Settings {
  const retired = typeof stored.themeId === 'string' ? RETIRED_THEMES[stored.themeId] : undefined;
  const redesigned = typeof stored.design !== 'number' || stored.design < DESIGN_VERSION;
  return {
    design: DESIGN_VERSION,
    themeId: redesigned
      ? DEFAULT_THEME_ID
      : (retired ?? (isThemeChoice(stored.themeId) ? stored.themeId : DEFAULT_SETTINGS.themeId)),
    custom: sanitizeCustomTheme(stored.custom),
    motion: typeof stored.motion === 'boolean' ? stored.motion : DEFAULT_SETTINGS.motion,
    haptics: typeof stored.haptics === 'boolean' ? stored.haptics : DEFAULT_SETTINGS.haptics,
    sounds: typeof stored.sounds === 'boolean' ? stored.sounds : DEFAULT_SETTINGS.sounds,
  };
}
