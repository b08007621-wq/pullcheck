import type { AppTheme } from '@/theme';

import { useSettings } from './useSettings';

export function useTheme(): AppTheme {
  return useSettings().theme;
}
