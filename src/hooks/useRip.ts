import { useContext } from 'react';

import { RipContext } from '@/state/ripContext';

export function useRip() {
  return useContext(RipContext);
}
