import { useCallback, useState } from 'react';

import { type BoardLayout, EMPTY_BOARD } from '@/state/settingsContext';

import { useSettings } from './useSettings';

export type Board = {
  layout: BoardLayout;
  editing: boolean;
  locked: boolean;
  setEditing: (editing: boolean) => void;
  setLocked: (locked: boolean) => void;
  save: (layout: BoardLayout) => void;
  show: (key: string) => void;
  toggle: (key: string) => void;
  tidy: () => void;
  reset: () => void;
  done: () => void;
};

export function useBoard(id: string, fallback: BoardLayout = EMPTY_BOARD): Board {
  const { settings, updateSettings } = useSettings();
  const layout = settings.boards[id] ?? fallback;
  const [editing, setEditing] = useState(false);
  const [locked, setLocked] = useState(false);
  const boards = settings.boards;

  const save = useCallback(
    (next: BoardLayout) => updateSettings({ boards: { ...boards, [id]: next } }),
    [boards, id, updateSettings],
  );

  const show = useCallback(
    (key: string) => save({ ...layout, hidden: layout.hidden.filter((entry) => entry !== key) }),
    [layout, save],
  );

  const toggle = useCallback(
    (key: string) =>
      save({
        ...layout,
        hidden: layout.hidden.includes(key) ? layout.hidden.filter((entry) => entry !== key) : [...layout.hidden, key],
      }),
    [layout, save],
  );

  const tidy = useCallback(
    () =>
      save({
        ...layout,
        items: Object.fromEntries(Object.entries(layout.items).map(([key, item]) => [key, { ...item, x: 0, w: 1 }])),
      }),
    [layout, save],
  );

  const reset = useCallback(() => save({ items: {}, hidden: [] }), [save]);

  const done = useCallback(() => {
    setEditing(false);
    setLocked(false);
  }, []);

  return { layout, editing, locked, setEditing, setLocked, save, show, toggle, tidy, reset, done };
}
