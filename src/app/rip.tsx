import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { DetailLayout } from '@/components/DetailLayout';
import { EmptyState } from '@/components/EmptyState';
import { MoneyEditor } from '@/components/MoneyEditor';
import { PossiblePulls } from '@/components/PossiblePulls';
import { PullRow } from '@/components/PullRow';
import { RipSummaryPanel } from '@/components/RipSummaryPanel';
import { SectionPanel } from '@/components/SectionPanel';
import { SettingToggleRow } from '@/components/SettingToggleRow';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useRip } from '@/hooks/useRip';
import { useSets } from '@/hooks/useSets';
import { findSet } from '@/services/sets';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useWishlist } from '@/hooks/useWishlist';
import { type AppTheme, spacing, typography } from '@/theme';
import type { Pull } from '@/types/rip';
import { nextVariant, rankPulls, summarizeRip } from '@/utils/rip';

export default function RipScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { rip, removePull, setPullVariant, setCost, end } = useRip();
  const { items, addCards, setQuantity } = useCollection();
  const { fulfill } = useWishlist();
  const [editingCost, setEditingCost] = useState(false);
  const { sets } = useSets();
  const ripSet = useMemo(() => (rip?.setName && sets ? findSet(sets, rip.setName) : null), [rip, sets]);
  const pulledIds = useMemo(() => new Set((rip?.pulls ?? []).map((pull) => pull.card.id)), [rip]);
  const [removeSource, setRemoveSource] = useState(true);
  const [closing, setClosing] = useState(false);
  const endOnLeave = useRef(false);

  useEffect(
    () => () => {
      if (endOnLeave.current) end();
    },
    [end],
  );

  const pulls = useMemo(() => (rip ? rankPulls(rip.pulls) : []), [rip]);

  const cycleVariant = useCallback(
    (pull: Pull) => {
      haptics.selection();
      setPullVariant(pull.id, nextVariant(pull));
    },
    [haptics, setPullVariant],
  );

  const removeOne = useCallback(
    (pull: Pull) => {
      haptics.remove();
      removePull(pull.id);
    },
    [haptics, removePull],
  );

  if (!rip) {
    return (
      <DetailLayout centered>
        <EmptyState
          icon="gift-outline"
          title="No pulls going"
          message="Start one from the Scan tab and every card you scan gets tallied here."
          action={{ label: 'Go to Scan', icon: 'scan', onPress: () => router.dismissTo('/') }}
        />
      </DetailLayout>
    );
  }

  const summary = summarizeRip(rip);
  const bestId = summary.totalUsd > 0 ? (pulls[0]?.id ?? null) : null;
  const source = rip.sourceKey ? (items.find((item) => item.key === rip.sourceKey) ?? null) : null;

  const leave = (path: '/' | '/collection') => {
    endOnLeave.current = true;
    setClosing(true);
    router.dismissTo(path);
  };

  const save = () => {
    if (closing) return;
    addCards(rip.pulls.map((pull) => ({ card: pull.card, version: { variant: pull.variant, condition: 'NM' } })));
    fulfill(rip.pulls.map((pull) => pull.card.id));
    if (source && removeSource) setQuantity(source.key, source.quantity - 1);
    haptics.collect();
    leave('/collection');
  };

  const discard = () => {
    Alert.alert('End without saving?', 'The cards you scanned for this opening will be cleared.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: () => {
          haptics.remove();
          leave('/');
        },
      },
    ]);
  };

  const saveLabel = summary.count === 1 ? 'Save 1 card' : `Save ${summary.count} cards`;

  return (
    <DetailLayout
      footer={
        <View style={styles.footer}>
          <ActionButton label="Scan more" icon="scan" variant="secondary" onPress={() => router.back()} />
          {summary.count > 0 ? <ActionButton label={saveLabel} icon="albums" onPress={save} /> : null}
        </View>
      }
    >
      <RipSummaryPanel rip={rip} summary={summary} onEditCost={() => setEditingCost(true)} />
      {source && summary.count > 0 ? (
        <SettingToggleRow
          icon="cube-outline"
          title="Mark it as opened"
          description={`Takes 1 ${source.kind === 'sealed' ? source.product.name : rip.title} out of your collection when you save.`}
          value={removeSource}
          onChange={(value) => {
            haptics.selection();
            setRemoveSource(value);
          }}
        />
      ) : null}
      <SectionPanel title="Pulls" icon="sparkles">
        {pulls.length === 0 ? (
          <Text style={styles.empty}>Nothing yet. Scan your first pull.</Text>
        ) : (
          <View style={styles.list}>
            {pulls.map((pull) => (
              <PullRow
                key={pull.id}
                pull={pull}
                best={pull.id === bestId}
                onCycleVariant={cycleVariant}
                onRemove={removeOne}
              />
            ))}
          </View>
        )}
      </SectionPanel>
      {ripSet ? <PossiblePulls set={ripSet} pulledIds={pulledIds} /> : null}
      <Pressable onPress={discard} accessibilityRole="button" hitSlop={8} style={styles.discard}>
        <Text style={styles.discardText}>End without saving</Text>
      </Pressable>
      {editingCost ? (
        <MoneyEditor
          initial={{ amount: rip.cost, currency: 'USD' }}
          heading="What did it cost?"
          message={`Total you paid for this ${rip.title}.`}
          clearable={false}
          onSave={(paid) => {
            if (!paid) return;
            haptics.tap();
            setCost(paid.amount);
          }}
          onClose={() => setEditingCost(false)}
        />
      ) : null}
    </DetailLayout>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    footer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.md,
    },
    list: {
      gap: spacing.sm,
    },
    empty: {
      ...typography.body,
      color: theme.colors.textMuted,
    },
    discard: {
      alignSelf: 'center',
      paddingVertical: spacing.sm,
    },
    discardText: {
      ...typography.label,
      color: theme.colors.danger,
    },
  });
}
