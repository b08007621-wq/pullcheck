import { Asset } from 'expo-asset';
import { cacheDirectory, downloadAsync, getInfoAsync } from 'expo-file-system/legacy';
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

const IMAGE_EXTENSION = /\.(png|jpe?g|webp)(\?|#|$)/i;

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
  if (Platform.OS === 'web' || !/^https?:/i.test(source) || IMAGE_EXTENSION.test(source)) return source;
  return downloadWithExtension(source);
}

async function downloadWithExtension(url: string): Promise<string> {
  const target = `${cacheDirectory}pullcheck-texture-${hashOf(url)}.png`;
  const existing = await getInfoAsync(target);
  if (existing.exists) return target;
  const result = await downloadAsync(url, target);
  if (result.status !== 200) throw new Error(`Texture download failed (${result.status})`);
  return result.uri;
}

function hashOf(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
