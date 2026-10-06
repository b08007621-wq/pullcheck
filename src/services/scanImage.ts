import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { Rect, Size } from '@/types/scan';

const MAX_LONG_EDGE = 1400;
const JPEG_QUALITY = 0.85;

type SourceImage = Size & {
  uri: string;
};

type PreparedImage = SourceImage & {
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
