import { Asset } from 'expo-asset';
import { cacheDirectory, deleteAsync, downloadAsync, getInfoAsync, moveAsync } from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import {
  DataTexture,
  LinearFilter,
  RGBAFormat,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from 'three';

export type TextureSource = number | string;

const GL_READY_EXTENSION = /\.(png|jpe?g)(\?|#|$)/i;
const SOURCE_EXTENSION = /\.(avif|webp|heic|gif|png|jpe?g)(\?|#|$)/i;

const EDGE_ROWS = [
  [226, 222, 214],
  [232, 229, 222],
  [214, 210, 202],
  [38, 38, 42],
  [30, 30, 34],
  [214, 210, 202],
  [232, 229, 222],
  [226, 222, 214],
];

export async function loadTexture(source: TextureSource, attempts = 3): Promise<Texture> {
  for (let attempt = 1; ; attempt++) {
    try {
      const uri = await resolveUri(source);
      const texture = await new TextureLoader().loadAsync(uri);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
      return texture;
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
    }
  }
}

export function textureAspect(texture: Texture): number | null {
  const image = texture.image as { width?: number; height?: number } | null | undefined;
  if (!image?.width || !image.height) return null;
  return image.height / image.width;
}

export function createEdgeTexture(): DataTexture {
  const data = new Uint8Array(EDGE_ROWS.length * 4);
  EDGE_ROWS.forEach(([red = 0, green = 0, blue = 0], row) => {
    data.set([red, green, blue, 255], row * 4);
  });
  const texture = new DataTexture(data, 1, EDGE_ROWS.length, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

async function resolveUri(source: TextureSource): Promise<string> {
  if (typeof source !== 'string') {
    const asset = await Asset.fromModule(source).downloadAsync();
    return asset.localUri ?? asset.uri;
  }
  if (Platform.OS === 'web' || !/^https?:/i.test(source) || GL_READY_EXTENSION.test(source)) return source;
  return downloadAsPng(source);
}

async function downloadAsPng(url: string): Promise<string> {
  const key = hashOf(url);
  const target = `${cacheDirectory}pullcheck-texture-v2-${key}.png`;
  if ((await getInfoAsync(target)).exists) return target;
  const extension = SOURCE_EXTENSION.exec(url)?.[1]?.toLowerCase() ?? 'img';
  const raw = `${cacheDirectory}pullcheck-texture-raw-${key}.${extension}`;
  try {
    const result = await downloadAsync(url, raw);
    if (result.status !== 200) throw new Error(`Texture download failed (${result.status})`);
    const image = await ImageManipulator.manipulate(result.uri).renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.PNG });
    await moveAsync({ from: saved.uri, to: target });
    return target;
  } finally {
    await deleteAsync(raw, { idempotent: true }).catch(() => {});
  }
}

function hashOf(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
