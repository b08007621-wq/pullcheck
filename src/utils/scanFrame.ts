import type { Rect, Size } from '@/types/scan';

export const CARD_RATIO = 63 / 88;

const FRAME_WIDTH_RATIO = 0.78;
const MAX_FRAME_WIDTH = 380;
const FRAME_HEIGHT_FILL = 0.92;
const CROP_MARGIN = 0.04;
export const AUTO_CROP_MARGIN = 0.1;
const MIN_CROP_SIDE = 32;

export function computeScanFrame(view: Size, topReserve: number, bottomReserve: number): Rect {
  const available = Math.max(0, view.height - topReserve - bottomReserve);
  let width = Math.min(view.width * FRAME_WIDTH_RATIO, MAX_FRAME_WIDTH);
  let height = width / CARD_RATIO;
  const maxHeight = available * FRAME_HEIGHT_FILL;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * CARD_RATIO;
  }

  return {
    x: (view.width - width) / 2,
    y: topReserve + (available - height) / 2,
    width,
    height,
  };
}

export function frameToPhotoCrop(frame: Rect, view: Size, photo: Size, margin = CROP_MARGIN): Rect | null {
  if (photo.width <= 0 || photo.height <= 0 || view.width <= 0 || view.height <= 0) return null;

  const scale = Math.max(view.width / photo.width, view.height / photo.height);
  const offsetX = (photo.width * scale - view.width) / 2;
  const offsetY = (photo.height * scale - view.height) / 2;
  const marginX = frame.width * margin;
  const marginY = frame.height * margin;

  const x = clamp(Math.round((frame.x - marginX + offsetX) / scale), 0, photo.width - 1);
  const y = clamp(Math.round((frame.y - marginY + offsetY) / scale), 0, photo.height - 1);
  const width = Math.min(Math.round((frame.width + marginX * 2) / scale), photo.width - x);
  const height = Math.min(Math.round((frame.height + marginY * 2) / scale), photo.height - y);

  return width >= MIN_CROP_SIDE && height >= MIN_CROP_SIDE ? { x, y, width, height } : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
