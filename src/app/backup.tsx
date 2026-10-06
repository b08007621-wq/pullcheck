import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { DetailLayout } from '@/components/DetailLayout';
import { SectionPanel } from '@/components/SectionPanel';
import { useCelebrate } from '@/hooks/useCelebrate';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useSettings } from '@/hooks/useSettings';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useWishlist } from '@/hooks/useWishlist';
import {
  type BackupFile,
  backupFileName,
  lastBackupAt,
  makeBackup,
  readBackup,
  rememberBackup,
  summarizeBackup,
} from '@/services/backup';
import { type ImportResult, matchImportRows } from '@/services/importMatch';
import { pickTextFile, shareTextFile } from '@/services/textFile';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { collectionCsv } from '@/utils/collectionQuery';
import { readImportRows } from '@/utils/csvImport';
import { formatDate, formatRelativeTime } from '@/utils/date';
import { formatMoney } from '@/utils/price';

const JSON_TYPES = ['application/json', 'text/plain', '*/*'];
const CSV_TYPES = ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain', '*/*'];

type Importing = {
  fileName: string;
  done: number;
  total: number;
  result: ImportResult | null;
};

export default function BackupScreen() {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const { items, meta, replaceAll, mergeItems, importCards } = useCollection();
  const wishlist = useWishlist();
  const { settings, updateSettings } = useSettings();
  const { celebrate } = useCelebrate();
  const [last, setLast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [importing, setImporting] = useState<Importing | null>(null);
  const [showMissed, setShowMissed] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    lastBackupAt().then(setLast);
    return () => abort.current?.abort();
  }, []);

  const fail = useCallback(
    (text: string) => {
      haptics.remove();
      setNotice({ text, tone: 'bad' });
    },
    [haptics],
  );

  const saveBackup = async () => {
    if (busy) return;
    setBusy('save');
    setNotice(null);
    try {
      const backup = makeBackup(items, meta, wishlist.items, settings);
      await shareTextFile(backupFileName(), JSON.stringify(backup));
      const at = new Date().toISOString();
      await rememberBackup(at);
      setLast(at);
      haptics.collect();
    } catch {
      fail('Couldn’t save the backup. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const chooseBackup = async () => {
    if (busy) return;
    setBusy('restore');
    setNotice(null);
    try {
      const picked = await pickTextFile(JSON_TYPES);
      if (!picked) return;
      const backup = readBackup(picked.text);
      if (!backup) {
        fail(
          picked.name.toLowerCase().endsWith('.csv')
            ? 'That’s a spreadsheet. Use “Choose a CSV file” below to import it.'
            : 'That file isn’t a PullCheck backup.',
        );
        return;
      }
      haptics.tap();
      setPending(backup);
    } catch {
      fail('Couldn’t open that file.');
    } finally {
      setBusy(null);
    }
  };

  const applyBackup = (mode: 'merge' | 'replace') => {
    if (!pending) return;
    const run = () => {
      const summary = summarizeBackup(pending);
      if (mode === 'replace') {
        replaceAll(pending.collection, pending.collectionMeta);
        wishlist.restore(pending.wishlist, true);
        updateSettings(pending.settings);
      } else {
        mergeItems(pending.collection);
        wishlist.restore(pending.wishlist, false);
      }
      haptics.collect();
      celebrate({ count: summary.cards + summary.sealed, fly: false });
      setNotice({
        text: mode === 'replace' ? `Restored ${summary.cards + summary.sealed} items.` : `Added ${summary.cards + summary.sealed} items.`,
        tone: 'good',
      });
      setPending(null);
    };
    if (mode === 'merge') {
      run();
      return;
    }
    Alert.alert('Replace your collection?', 'Everything on this phone is swapped for what’s in the backup.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', style: 'destructive', onPress: run },
    ]);
  };

  const chooseCsv = async () => {
    if (busy) return;
    setBusy('import');
    setNotice(null);
    setShowMissed(false);
    try {
      const picked = await pickTextFile(CSV_TYPES);
      if (!picked) return;
      const { rows, recognized } = readImportRows(picked.text);
      if (!recognized || rows.length === 0) {
        fail('Couldn’t find card names in that file. Export it as CSV with a Name column.');
        return;
      }
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setImporting({ fileName: picked.name, done: 0, total: rows.length, result: null });
      const result = await matchImportRows(
        rows,
        (done, total) => setImporting((current) => (current ? { ...current, done, total } : current)),
        controller.signal,
      );
      if (controller.signal.aborted) return;
      haptics.tap();
      setImporting((current) => (current ? { ...current, result } : current));
    } catch {
      setImporting(null);
      fail('Couldn’t read that file.');
    } finally {
      setBusy(null);
    }
  };

  const applyImport = () => {
    const result = importing?.result;
    if (!result || result.entries.length === 0) return;
    importCards(result.entries);
    const copies = result.entries.reduce((sum, entry) => sum + entry.quantity, 0);
    haptics.collect();
    celebrate({ count: copies, fly: false });
    setNotice({ text: `Imported ${copies} ${copies === 1 ? 'card' : 'cards'}.`, tone: 'good' });
    setImporting(null);
  };

  const exportCsv = async () => {
    haptics.tap();
    await shareTextFile(`PullCheck-collection-${new Date().toISOString().slice(0, 10)}.csv`, collectionCsv(items)).catch(
      () => fail('Couldn’t export the CSV.'),
    );
  };

  const pendingSummary = pending ? summarizeBackup(pending) : null;
  const result = importing?.result ?? null;

  return (
    <DetailLayout>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Backup & import
        </Text>
        <Text style={styles.subtitle}>
          Your collection lives on this phone. Keep a backup so you never lose it.
        </Text>
      </View>

      {notice ? (
        <View style={[styles.notice, notice.tone === 'good' ? styles.noticeGood : styles.noticeBad]}>
          <Ionicons
            name={notice.tone === 'good' ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={notice.tone === 'good' ? styles.good.color : styles.bad.color}
          />
          <Text style={styles.noticeText}>{notice.text}</Text>
        </View>
      ) : null}

      <SectionPanel title="Backup">
        <View style={styles.statusRow}>
          <Ionicons
            name={last ? 'cloud-done-outline' : 'warning-outline'}
            size={18}
            color={last ? styles.good.color : styles.warn.color}
          />
          <Text style={styles.status}>
            {last ? `Last backup ${formatRelativeTime(last)}` : 'Never backed up'}
          </Text>
        </View>
        <Text style={styles.body}>
          One file with your cards, sealed products, wishlist and look. Save it to iCloud Drive or Files, or send it to
          yourself.
        </Text>
        <View style={styles.buttons}>
          <ActionButton label={busy === 'save' ? 'Saving…' : 'Save a backup'} icon="cloud-upload-outline" onPress={saveBackup} />
          <ActionButton label="Restore from a backup" icon="cloud-download-outline" variant="secondary" onPress={chooseBackup} />
        </View>
        {pending && pendingSummary ? (
          <View style={styles.pending}>
            <Text style={styles.pendingTitle}>{`Backup from ${formatDate(new Date(pendingSummary.exportedAt))}`}</Text>
            <Text style={styles.body}>
              {[
                `${pendingSummary.cards} cards`,
                pendingSummary.sealed > 0 ? `${pendingSummary.sealed} sealed` : null,
                pendingSummary.wishlist > 0 ? `${pendingSummary.wishlist} on the wishlist` : null,
                pendingSummary.valueUsd > 0 ? formatMoney(pendingSummary.valueUsd) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <View style={styles.buttons}>
              <ActionButton label="Add to my collection" icon="add" onPress={() => applyBackup('merge')} />
              <ActionButton label="Replace everything" icon="swap-horizontal" variant="secondary" onPress={() => applyBackup('replace')} />
            </View>
            <Pressable onPress={() => setPending(null)} accessibilityRole="button" hitSlop={8} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : null}
      </SectionPanel>

      <SectionPanel title="Import from another app">
        <Text style={styles.body}>
          Export your collection as a CSV from Collectr, TCGplayer or PullCheck, then choose the file here. Nothing is
          added until you check the matches.
        </Text>
        {!importing ? (
          <ActionButton label="Choose a CSV file" icon="document-text-outline" variant="secondary" onPress={chooseCsv} />
        ) : !result ? (
          <View style={styles.progressBlock}>
            <Text style={styles.status}>{`Matching ${importing.done} of ${importing.total}…`}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(importing.done / Math.max(1, importing.total)) * 100}%` }]} />
            </View>
            <Pressable
              onPress={() => {
                abort.current?.abort();
                setImporting(null);
              }}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>Stop</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.pending}>
            <Text style={styles.pendingTitle}>{`Found ${result.entries.length} of ${importing.total}`}</Text>
            <Text style={styles.body}>{importing.fileName}</Text>
            {result.missed.length > 0 ? (
              <Pressable onPress={() => setShowMissed((open) => !open)} accessibilityRole="button" hitSlop={6}>
                <Text style={styles.link}>
                  {showMissed ? 'Hide' : 'Show'} {result.missed.length} not found
                </Text>
              </Pressable>
            ) : null}
            {showMissed
              ? result.missed.map((miss) => (
                  <Text key={miss.row.line} style={styles.missed} numberOfLines={2}>
                    {`${miss.row.name}${miss.row.number ? ` #${miss.row.number}` : ''}${miss.row.set ? ` · ${miss.row.set}` : ''} — ${miss.reason}`}
                  </Text>
                ))
              : null}
            <View style={styles.buttons}>
              {result.entries.length > 0 ? (
                <ActionButton
                  label={`Add ${result.entries.reduce((sum, entry) => sum + entry.quantity, 0)} cards`}
                  icon="add"
                  onPress={applyImport}
                />
              ) : null}
              <ActionButton label="Cancel" icon="close" variant="secondary" onPress={() => setImporting(null)} />
            </View>
          </View>
        )}
      </SectionPanel>

      <SectionPanel title="Export">
        <Text style={styles.body}>A spreadsheet of everything you own. Opens in Numbers, Excel or Google Sheets.</Text>
        <ActionButton label="Export as CSV" icon="share-outline" variant="secondary" onPress={exportCsv} />
      </SectionPanel>
    </DetailLayout>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    header: {
      gap: spacing.xs,
    },
    title: {
      ...typography.title,
      color: theme.colors.text,
    },
    subtitle: {
      ...typography.body,
      color: theme.colors.textMuted,
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
    },
    noticeGood: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    noticeBad: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    noticeText: {
      ...typography.body,
      flex: 1,
      color: theme.colors.text,
    },
    good: {
      color: theme.colors.gain,
    },
    bad: {
      color: theme.colors.danger,
    },
    warn: {
      color: theme.colors.accent,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    status: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
    },
    body: {
      ...typography.body,
      fontSize: 15,
      color: theme.colors.textMuted,
    },
    buttons: {
      gap: spacing.sm,
    },
    pending: {
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    pendingTitle: {
      ...typography.label,
      color: theme.colors.text,
    },
    cancel: {
      alignSelf: 'center',
      paddingVertical: spacing.xs,
    },
    cancelText: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.textMuted,
    },
    link: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.accent,
    },
    missed: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    progressBlock: {
      gap: spacing.sm,
    },
    track: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceRaised,
    },
    fill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: theme.colors.accent,
    },
  });
}
