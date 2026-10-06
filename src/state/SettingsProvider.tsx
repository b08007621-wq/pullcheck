import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { readJson, STORAGE_KEYS, writeJson } from '@/services/storage';
import {
  DEFAULT_THEME_ID,
  sanitizeCustomTheme,
  type ThemeChoice,
  THEMES,
} from '@/theme';

import { sanitizeBackdrop } from '@/theme/backdrop';
import { withAlpha } from '@/theme/color';

import type { ChangeBasis, CollectionLayout, CollectionSection } from '@/types/collection';
import { GRADING_COST_RANGE } from '@/utils/centering';

import { savedTheme } from './savedTheme';
import {
  COLLECTION_SECTIONS,
  DEFAULT_COLLECTION_LAYOUT,
  DEFAULT_SETTINGS,
  DESIGN_VERSION,
  type SavedTheme,
  type Settings,
  SettingsContext,
} from './settingsContext';

type Props = {
  children: ReactNode;
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

  const theme = useMemo(() => {
    const saved = settings.savedThemes.find((entry) => `saved:${entry.id}` === settings.themeId);
    const base = saved ? savedTheme(saved) : THEMES[DEFAULT_THEME_ID];
    if (!settings.backdrop.glass) return base;
    const soften = (color: string, alpha: number) => (color.startsWith('#') ? withAlpha(color, alpha) : color);
    return {
      ...base,
      glass: true,
      colors: {
        ...base.colors,
        surface: soften(base.colors.surface, 0.55),
        surfaceRaised: soften(base.colors.surfaceRaised, 0.65),
        tabBar: soften(base.colors.tabBar, 0.6),
      },
    };
  }, [settings.themeId, settings.savedThemes, settings.backdrop.glass]);

  const value = useMemo(() => ({ settings, theme, updateSettings }), [settings, theme, updateSettings]);

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: THEMES[DEFAULT_THEME_ID].colors.background }} />;
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

function sanitize(stored: Partial<Settings>): Settings {
  const redesigned = typeof stored.design !== 'number' || stored.design < DESIGN_VERSION;
  const savedThemes: SavedTheme[] = Array.isArray(stored.savedThemes)
    ? stored.savedThemes
        .filter((entry) => entry && typeof entry.id === 'string' && typeof entry.name === 'string')
        .map((entry) => ({ id: entry.id, name: entry.name.slice(0, 24), custom: sanitizeCustomTheme(entry.custom) }))
    : [];
  let themeId: ThemeChoice = DEFAULT_THEME_ID;
  if (!redesigned && stored.themeId === 'custom') {
    if (savedThemes.length === 0) {
      savedThemes.push({ id: 'mine', name: 'My theme', custom: sanitizeCustomTheme(stored.custom) });
    }
    themeId = `saved:${savedThemes[0]?.id ?? 'mine'}`;
  } else if (
    !redesigned &&
    typeof stored.themeId === 'string' &&
    savedThemes.some((entry) => `saved:${entry.id}` === stored.themeId)
  ) {
    themeId = stored.themeId as ThemeChoice;
  }
  const view = stored.collectionView;
  return {
    design: DESIGN_VERSION,
    themeId,
    custom: sanitizeCustomTheme(stored.custom),
    savedThemes,
    collectionView: view === 'grid' || view === 'cover' ? view : 'list',
    collectionLayout: sanitizeLayout(stored.collectionLayout),
    backdrop: sanitizeBackdrop(stored.backdrop),
    motion: typeof stored.motion === 'boolean' ? stored.motion : DEFAULT_SETTINGS.motion,
    haptics: typeof stored.haptics === 'boolean' ? stored.haptics : DEFAULT_SETTINGS.haptics,
    sounds: typeof stored.sounds === 'boolean' ? stored.sounds : DEFAULT_SETTINGS.sounds,
    autoScan: typeof stored.autoScan === 'boolean' ? stored.autoScan : DEFAULT_SETTINGS.autoScan,
    gradingCost:
      typeof stored.gradingCost === 'number' && Number.isFinite(stored.gradingCost)
        ? Math.min(GRADING_COST_RANGE[1], Math.max(GRADING_COST_RANGE[0], stored.gradingCost))
        : DEFAULT_SETTINGS.gradingCost,
  };
}

const BASES: ChangeBasis[] = ['auto', 'added', 'paid', 'day', 'week', 'month'];

function sanitizeLayout(stored: Partial<CollectionLayout> | undefined): CollectionLayout {
  if (!stored || typeof stored !== 'object') return DEFAULT_COLLECTION_LAYOUT;
  const known = (value: unknown): value is CollectionSection =>
    typeof value === 'string' && (COLLECTION_SECTIONS as string[]).includes(value);
  const order = Array.isArray(stored.order) ? stored.order.filter(known) : [];
  const missing = COLLECTION_SECTIONS.filter((section) => !order.includes(section));
  return {
    order: [...order, ...missing],
    hidden: Array.isArray(stored.hidden) ? stored.hidden.filter(known) : [],
    gridColumns: stored.gridColumns === 2 || stored.gridColumns === 4 ? stored.gridColumns : 3,
    gridDetails: typeof stored.gridDetails === 'boolean' ? stored.gridDetails : true,
    changeBasis: BASES.includes(stored.changeBasis as ChangeBasis) ? (stored.changeBasis as ChangeBasis) : 'auto',
  };
}
