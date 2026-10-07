import { useContext } from 'react';

import { BinderContext, type BinderContextValue } from '@/state/binderContext';

export function useBinders(): BinderContextValue {
  return useContext(BinderContext);
}
