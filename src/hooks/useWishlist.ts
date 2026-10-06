import { useContext } from 'react';

import { WishlistContext } from '@/state/wishlistContext';

export function useWishlist() {
  return useContext(WishlistContext);
}
