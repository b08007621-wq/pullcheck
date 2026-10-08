import { createContext } from 'react';

import { type Backdrop, DEFAULT_BACKDROP } from '@/theme/backdrop';
import type { Game } from '@/types/card';
import type { CollectionLayout, CollectionSection, CollectionView } from '@/types/collection';

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

export type BoardItem = {
  x: number;
  y: number;
  w: number;
  hs?: number;
};

export type BoardLayout = {
  items: Record<string, BoardItem>;
  hidden: string[];
};

export const EMPTY_BOARD: BoardLayout = { items: {}, hidden: [] };

export type Settings = {
  themeId: ThemeChoice;
  custom: CustomThemeSettings;
  savedThemes: SavedTheme[];
  collectionView: CollectionView;
  collectionLayout: CollectionLayout;
  backdrop: Backdrop;
  motion: boolean;
  haptics: boolean;
  sounds: boolean;
  autoScan: boolean;
  gradingCost: number;
  setOrder: Record<string, string[]>;
  boards: Record<string, BoardLayout>;
  tourDone: boolean;
  searchGame: Game;
  gameLanguages: Record<string, string>;
  design: number;
};

export const DESIGN_VERSION = 3;

export const COLLECTION_SECTIONS: CollectionSection[] = ['pulled', 'summary', 'chart', 'games', 'top', 'recent', 'stats', 'shortcuts'];

export const DEFAULT_COLLECTION_LAYOUT: CollectionLayout = {
  order: COLLECTION_SECTIONS,
  hidden: [],
  gridColumns: 3,
  gridDetails: true,
  changeBasis: 'auto',
  chartCards: 'both',
  chartRanges: true,
  chartRange: '30d',
};

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
  collectionLayout: DEFAULT_COLLECTION_LAYOUT,
  backdrop: DEFAULT_BACKDROP,
  motion: true,
  haptics: true,
  sounds: true,
  autoScan: true,
  gradingCost: 30,
  setOrder: {},
  boards: {},
  tourDone: false,
  searchGame: 'pokemon',
  gameLanguages: {},
  design: DESIGN_VERSION,
};

export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  theme: THEMES[DEFAULT_THEME_ID],
  updateSettings: () => {},
});
