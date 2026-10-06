import type { Rect, Size } from '@/types/scan';

import { ScanFrameCorners } from './ScanFrameCorners';
import { ScanLine } from './ScanLine';
import { ScanMask } from './ScanMask';

type Props = {
  frame: Rect;
  view: Size;
  locked: boolean;
  scanning: boolean;
};

const CORNER_RADIUS = 18;

export function ScannerOverlay({ frame, view, locked, scanning }: Props) {
  return (
    <>
      <ScanMask frame={frame} view={view} cornerRadius={CORNER_RADIUS} />
      <ScanLine frame={frame} visible={scanning && !locked} />
      <ScanFrameCorners frame={frame} locked={locked} cornerRadius={CORNER_RADIUS} />
    </>
  );
}
