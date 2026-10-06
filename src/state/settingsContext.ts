import { createContext } from 'react';

import { type Backdrop, DEFAULT_BACKDROP } from '@/theme/backdrop';
import type { CollectionView } from '@/types/collection';

import {
  type AppTheme,
  type CustomThemeSettings,
  DEFAULT_CUSTOM_THEME,
  DEFAULT_THEME_ID,
  type ThemeChoice,
  THEMES,
} from '@/theme';

export type SavedTheme = {
  id: string;
  name: string;
  custom: CustomThemeSettings;
};

export type Settings = {
  themeId: ThemeChoice;
  custom: CustomThemeSettings;
  savedThemes: SavedTheme[];
  collectionView: CollectionView;
  backdrop: Backdrop;
  motion: boolean;
  haptics: boolean;
  sounds: boolean;
  autoScan: boolean;
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
  savedThemes: [],
  collectionView: 'list',
  backdrop: DEFAULT_BACKDROP,
  motion: true,
  haptics: true,
  sounds: true,
  autoScan: true,
  design: DESIGN_VERSION,
};

export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  theme: THEMES[DEFAULT_THEME_ID],
  updateSettings: () => {},
});
