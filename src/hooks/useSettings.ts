import { useContext } from 'react';

import { SettingsContext } from '@/state/settingsContext';

export function useSettings() {
  return useContext(SettingsContext);
}
