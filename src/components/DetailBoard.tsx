import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useBoard } from '@/hooks/useBoard';

import { BoardControls } from './BoardEditBar';
import { DetailLayout } from './DetailLayout';
import { ArrangeBoard, type BoardWidget } from './ArrangeBoard';

type Props = {
  id: string;
  widgets: BoardWidget[];
  footer?: ReactNode;
  topRight?: ReactNode;
};

const TOP_BAR = 60;
const FOOTER_SPACE = 170;

export function DetailBoard({ id, widgets, footer, topRight }: Props) {
  const board = useBoard(id);
  const scroller = useAutoScroll();
  const insets = useSafeAreaInsets();

  return (
    <DetailLayout
      topRight={topRight}
      scrollEnabled={!board.locked}
      scroller={scroller}
      footer={board.editing ? <BoardControls board={board} widgets={widgets} /> : footer}
    >
      <ArrangeBoard
        widgets={widgets}
        board={board}
        autoScroll={scroller.scrollBy}
        edges={{ top: insets.top + TOP_BAR, bottom: FOOTER_SPACE }}
      />
    </DetailLayout>
  );
}
