import type { Rect, Size } from '@/types/scan';

import { ScanFrameCorners } from './ScanFrameCorners';
import { ScanMask } from './ScanMask';

type Props = {
  frame: Rect;
  view: Size;
  locked: boolean;
};

const CORNER_RADIUS = 18;

export function ScannerOverlay({ frame, view, locked }: Props) {
  return (
    <>
      <ScanMask frame={frame} view={view} cornerRadius={CORNER_RADIUS} />
      <ScanFrameCorners frame={frame} locked={locked} cornerRadius={CORNER_RADIUS} />
    </>
  );
}
