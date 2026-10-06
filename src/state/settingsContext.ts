import { createContext } from 'react';

import {
  type AppTheme,
  type CustomThemeSettings,
  DEFAULT_CUSTOM_THEME,
  DEFAULT_THEME_ID,
  type ThemeChoice,
  THEMES,
} from '@/theme';

export type Settings = {
  themeId: ThemeChoice;
  custom: CustomThemeSettings;
  motion: boolean;
  haptics: boolean;
  sounds: boolean;
  design: number;
};

export const DESIGN_VERSION = 2;

export type SettingsContextValue = {
  settings: Settings;
  theme: AppTheme;
  updateSettings: (changes: Partial<Settings>) => void;
};

export const DEFAULT_SETTINGS: Settings = {
  themeId: DEFAULT_THEME_ID,
  custom: DEFAULT_CUSTOM_THEME,
  motion: true,
  haptics: true,
  sounds: true,
  design: DESIGN_VERSION,
};

export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  theme: THEMES[DEFAULT_THEME_ID],
  updateSettings: () => {},
});
