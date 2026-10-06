import type { CameraView } from 'expo-camera';
import { deleteAsync } from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { Rect, Size } from '@/types/scan';
import { AUTO_CROP_MARGIN, frameToPhotoCrop } from '@/utils/scanFrame';

const MAX_LONG_EDGE = 1400;
const JPEG_QUALITY = 0.85;
const FRAME_WIDTH = 1280;
const FRAME_QUALITY = 0.9;

type SourceImage = Size & {
  uri: string;
};

export type PreparedImage = SourceImage & {
  base64: string | null;
};

export async function prepareScanImage(source: SourceImage, crop: Rect | null): Promise<PreparedImage> {
  const context = ImageManipulator.manipulate(source.uri);
  const base = crop ?? source;

  if (crop) {
    context.crop({ originX: crop.x, originY: crop.y, width: crop.width, height: crop.height });
  }
  if (Math.max(base.width, base.height) > MAX_LONG_EDGE) {
    context.resize(base.height >= base.width ? { height: MAX_LONG_EDGE } : { width: MAX_LONG_EDGE });
  }

  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY, base64: true });
  return { uri: saved.uri, width: saved.width, height: saved.height, base64: saved.base64 ?? null };
}

export async function pickLibraryImage(): Promise<SourceImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 });
  const asset = result.canceled ? null : result.assets[0];
  return asset ? { uri: asset.uri, width: asset.width, height: asset.height } : null;
}

export async function captureScanFrame(camera: CameraView, frame: Rect, view: Size): Promise<string | null> {
  const picture = await camera.takePictureAsync({ quality: 0.85, shutterSound: false });
  try {
    const crop = frameToPhotoCrop(frame, view, picture, AUTO_CROP_MARGIN);
    if (!crop) return null;
    const context = ImageManipulator.manipulate(picture.uri);
    context.crop({ originX: crop.x, originY: crop.y, width: crop.width, height: crop.height });
    if (crop.width > FRAME_WIDTH) context.resize({ width: FRAME_WIDTH });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: FRAME_QUALITY, base64: true });
    discard(saved.uri);
    return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : null;
  } finally {
    discard(picture.uri);
  }
}

function discard(uri: string) {
  if (Platform.OS === 'web' || !uri.startsWith('file:')) return;
  deleteAsync(uri, { idempotent: true }).catch(() => {});
}
