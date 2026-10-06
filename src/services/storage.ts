import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  settings: 'pullcheck.settings.v1',
  collection: 'pullcheck.collection.v1',
  collectionMeta: 'pullcheck.collection.meta.v1',
  rip: 'pullcheck.rip.v1',
  wishlist: 'pullcheck.wishlist.v1',
  wishlistMeta: 'pullcheck.wishlist.meta.v1',
  snapshots: 'pullcheck.snapshots.v1',
  recentSearches: 'pullcheck.recent.v1',
  cacheIndex: 'pullcheck.cache.index.v1',
} as const;

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: unknown): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export async function removeKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await AsyncStorage.multiRemove(keys);
  } catch {}
}
