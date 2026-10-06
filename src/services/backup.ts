import type { Settings } from '@/state/settingsContext';
import type { CollectionItem, CollectionMeta } from '@/types/collection';
import type { WishItem } from '@/types/wishlist';
import { summarizeCollection } from '@/utils/collectionValue';

import { readJson, writeJson } from './storage';

export type BackupSettings = Pick<
  Settings,
  'themeId' | 'custom' | 'savedThemes' | 'backdrop' | 'collectionView' | 'collectionLayout'
>;

export type BackupFile = {
  app: 'PullCheck';
  kind: 'backup';
  version: 1;
  exportedAt: string;
  collection: CollectionItem[];
  collectionMeta: CollectionMeta;
  wishlist: WishItem[];
  settings: Partial<BackupSettings>;
};

export type BackupSummary = {
  exportedAt: string;
  cards: number;
  sealed: number;
  wishlist: number;
  valueUsd: number;
};

const LAST_BACKUP_KEY = 'pullcheck.backup.last.v1';

export function makeBackup(
  collection: CollectionItem[],
  collectionMeta: CollectionMeta,
  wishlist: WishItem[],
  settings: Settings,
): BackupFile {
  return {
    app: 'PullCheck',
    kind: 'backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    collection,
    collectionMeta,
    wishlist,
    settings: {
      themeId: settings.themeId,
      custom: settings.custom,
      savedThemes: settings.savedThemes,
      backdrop: settings.backdrop,
      collectionView: settings.collectionView,
      collectionLayout: settings.collectionLayout,
    },
  };
}

export function backupFileName(date = new Date()): string {
  return `PullCheck-backup-${date.toISOString().slice(0, 10)}.json`;
}

export function readBackup(text: string): BackupFile | null {
  try {
    const parsed = JSON.parse(text) as Partial<BackupFile> | null;
    if (!parsed || parsed.app !== 'PullCheck' || parsed.kind !== 'backup' || !Array.isArray(parsed.collection)) return null;
    return {
      app: 'PullCheck',
      kind: 'backup',
      version: 1,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date(0).toISOString(),
      collection: parsed.collection.filter(isItem),
      collectionMeta: parsed.collectionMeta ?? { lastRefreshAt: null, pricesAsOf: null, valueHistory: [] },
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
      settings: parsed.settings ?? {},
    };
  } catch {
    return null;
  }
}

export function summarizeBackup(backup: BackupFile): BackupSummary {
  const summary = summarizeCollection(backup.collection);
  return {
    exportedAt: backup.exportedAt,
    cards: summary.cardCount,
    sealed: summary.sealedCount,
    wishlist: backup.wishlist.length,
    valueUsd: summary.totalUsd,
  };
}

export function lastBackupAt(): Promise<string | null> {
  return readJson<string>(LAST_BACKUP_KEY);
}

export function rememberBackup(at: string): Promise<boolean> {
  return writeJson(LAST_BACKUP_KEY, at);
}

function isItem(value: unknown): value is CollectionItem {
  const item = value as CollectionItem | null;
  return Boolean(
    item &&
      typeof item.key === 'string' &&
      typeof item.quantity === 'number' &&
      ((item.kind === 'card' && item.card && typeof item.card.id === 'string') ||
        (item.kind === 'sealed' && item.product && typeof item.product.productId === 'number')),
  );
}
