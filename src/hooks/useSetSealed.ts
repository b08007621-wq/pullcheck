import { useCallback } from 'react';

import { getSetSealed, type SetSealedTarget } from '@/services/sealedProducts';

import { useResource } from './useResource';

export function useSetSealed(target: SetSealedTarget | null) {
  const game = target?.game ?? null;
  const name = target?.name ?? '';
  const code = target?.code ?? null;
  const load = useCallback(
    (signal: AbortSignal) => (game && name ? getSetSealed({ game, name, code }, signal) : Promise.resolve([])),
    [game, name, code],
  );
  const { data, error, retry } = useResource(`set-sealed:${game ?? 'none'}:${name}:${code ?? ''}`, load);
  return { products: data, error, retry };
}
