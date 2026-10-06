import { useContext } from 'react';

import { CollectionContext } from '@/state/collectionContext';

export function useCollection() {
  return useContext(CollectionContext);
}
