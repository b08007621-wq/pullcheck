import { useMemo } from 'react';

import { createHaptics, type HapticsApi } from '@/utils/haptics';

import { useSettings } from './useSettings';

export function useHaptics(): HapticsApi {
  const { haptics, sounds } = useSettings().settings;
  return useMemo(() => createHaptics(haptics, sounds), [haptics, sounds]);
}
