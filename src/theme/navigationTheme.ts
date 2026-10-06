import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import type { AppTheme } from './themes';

export function toNavigationTheme(theme: AppTheme): Theme {
  const base = theme.mode === 'light' ? DefaultTheme : DarkTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.accent,
      background: theme.colors.background,
      card: theme.colors.tabBar,
      text: theme.colors.text,
      border: theme.colors.border,
    },
  };
}
