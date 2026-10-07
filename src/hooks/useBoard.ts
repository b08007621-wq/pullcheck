import { useCallback, useState } from 'react';

import { type BoardLayout, EMPTY_BOARD } from '@/state/settingsContext';

import { useSettings } from './useSettings';

export type Board = {
  layout: BoardLayout;
  editing: boolean;
  locked: boolean;
  canUndo: boolean;
  setEditing: (editing: boolean) => void;
  setLocked: (locked: boolean) => void;
  save: (layout: BoardLayout) => void;
  show: (key: string) => void;
  toggle: (key: string) => void;
  tidy: () => void;
  reset: () => void;
  undo: () => void;
  done: () => void;
};

const HISTORY_LIMIT = 30;

export function useBoard(id: string, fallback: BoardLayout = EMPTY_BOARD): Board {
  const { settings, updateSettings } = useSettings();
  const layout = settings.boards[id] ?? fallback;
  const [editing, setEditing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [history, setHistory] = useState<BoardLayout[]>([]);
  const boards = settings.boards;

  const write = useCallback(
    (next: BoardLayout) => updateSettings({ boards: { ...boards, [id]: next } }),
    [boards, id, updateSettings],
  );

  const save = useCallback(
    (next: BoardLayout) => {
      setHistory((current) => [...current.slice(-(HISTORY_LIMIT - 1)), layout]);
      write(next);
    },
    [layout, write],
  );

  const undo = useCallback(() => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory(history.slice(0, -1));
    write(previous);
  }, [history, write]);

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
        items: Object.fromEntries(
          Object.entries(layout.items).map(([key, item]) => [key, { x: 0, w: 1, y: item.y }]),
        ),
      }),
    [layout, save],
  );

  const reset = useCallback(() => save({ items: {}, hidden: [] }), [save]);

  const done = useCallback(() => {
    setEditing(false);
    setLocked(false);
  }, []);

  return {
    layout,
    editing,
    locked,
    canUndo: history.length > 0,
    setEditing,
    setLocked,
    save,
    show,
    toggle,
    tidy,
    reset,
    undo,
    done,
  };
}
