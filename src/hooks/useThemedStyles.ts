import { useMemo } from 'react';

import type { AppTheme } from '@/theme';

import { useTheme } from './useTheme';

export function useThemedStyles<T>(factory: (theme: AppTheme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
