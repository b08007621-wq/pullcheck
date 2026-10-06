import { loadUpcoming } from '@/services/upcoming';

import { useResource } from './useResource';

export function useUpcoming() {
  return useResource('upcoming', loadUpcoming);
}
