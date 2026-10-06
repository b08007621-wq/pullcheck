import { useContext } from 'react';

import { CelebrateContext } from '@/state/celebrateContext';

export function useCelebrate() {
  return useContext(CelebrateContext);
}
