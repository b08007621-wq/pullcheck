import { type AppTheme, buildCustomTheme, type ThemeChoice } from '@/theme';

import type { SavedTheme } from './settingsContext';

export function savedTheme(saved: SavedTheme): AppTheme {
  return { ...buildCustomTheme(saved.custom), id: `saved:${saved.id}` as ThemeChoice, name: saved.name, tagline: 'Your theme' };
}
