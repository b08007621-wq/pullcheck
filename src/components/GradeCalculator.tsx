import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useCardDetail } from '@/hooks/useCardDetail';
import { useGradedPrices } from '@/hooks/useGradedPrices';
import { useHaptics } from '@/hooks/useHaptics';
import { useSettings } from '@/hooks/useSettings';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { withAlpha } from '@/theme/color';
import { formatCollectorNumber } from '@/utils/card';
import { cardVersionPrice, defaultVersion, resolveVersion, versionLabel } from '@/utils/cardVersion';
import { type Centering, GRADING_COST_RANGE, GRADING_COST_STEP, gradeOutcomes, gradeVerdict } from '@/utils/centering';
import { formatMoney } from '@/utils/price';

import { PressableScale } from './PressableScale';
import { SectionPanel } from './SectionPanel';

type Props = {
  cardId: string;
  variant: string | null;
  centering: Centering | null;
};

export function GradeCalculator({ cardId, variant, centering }: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const { settings, updateSettings } = useSettings();
  const { card } = useCardDetail(cardId);
  const graded = useGradedPrices(card ?? null);
  const cost = settings.gradingCost;

  if (!card) {
    return (
      <SectionPanel title="Should I grade it?">
        <ActivityIndicator color={styles.muted.color} />
      </SectionPanel>
    );
  }

  const version = resolveVersion(card, { ...defaultVersion(card), variant: variant ?? defaultVersion(card).variant });
  const price = cardVersionPrice(card, version);
  const raw = price?.currency === 'USD' ? price.amount : null;
  const outcomes = graded ? gradeOutcomes(graded.prices, raw, cost, centering) : [];
  const verdict = raw !== null ? gradeVerdict(outcomes, centering) : null;
  const label = versionLabel(card, version, 'short');

  const step = (delta: number) => {
    const next = Math.min(GRADING_COST_RANGE[1], Math.max(GRADING_COST_RANGE[0], cost + delta));
    if (next === cost) return;
    haptics.selection();
    updateSettings({ gradingCost: next });
  };

  return (
    <SectionPanel title="Should I grade it?">
      <Text style={styles.cardName} numberOfLines={1}>
        {`${card.name} · ${card.set.name} #${formatCollectorNumber(card)}`}
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>{label ? `Raw · ${label}` : 'Raw, near mint'}</Text>
        <Text style={styles.price}>{raw !== null ? formatMoney(raw) : 'No price'}</Text>
      </View>

      {!graded ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={styles.muted.color} />
          <Text style={styles.note}>Getting PSA sales…</Text>
        </View>
      ) : graded.limitedUntil && outcomes.length === 0 ? (
        <Text style={styles.note}>PSA prices hit today’s free limit. Check back tomorrow.</Text>
      ) : outcomes.length === 0 ? (
        <Text style={styles.note}>No PSA sales for this card yet, so there’s nothing to compare.</Text>
      ) : (
        outcomes.map((outcome) => (
          <View key={outcome.grade} style={[styles.row, !outcome.possible && styles.ruledOut]}>
            <Text style={styles.label}>
              {`PSA ${outcome.grade}`}
              {outcome.borderline ? <Text style={styles.borderline}>{'  gray zone'}</Text> : null}
            </Text>
            {outcome.possible ? (
              <View style={[styles.net, outcome.net > 0 ? styles.netGain : styles.netLoss]}>
                <Text style={[styles.netText, outcome.net > 0 ? styles.gain : styles.loss]}>
                  {`${outcome.net > 0 ? '+' : '−'}${formatMoney(Math.abs(outcome.net))}`}
                </Text>
              </View>
            ) : (
              <Text style={styles.ruledText}>Centering rules it out</Text>
            )}
            <Text style={styles.price}>{formatMoney(outcome.price)}</Text>
          </View>
        ))
      )}

      <View style={styles.costRow}>
        <View style={styles.costText}>
          <Text style={styles.label}>Grading + shipping</Text>
          <Text style={styles.note}>Per card, what you’d pay PSA</Text>
        </View>
        <Stepper icon="remove" label="Lower the cost" onPress={() => step(-GRADING_COST_STEP)} />
        <Text style={styles.cost}>{formatMoney(cost).replace('.00', '')}</Text>
        <Stepper icon="add" label="Raise the cost" onPress={() => step(GRADING_COST_STEP)} />
      </View>

      {verdict ? (
        <View
          style={[
            styles.verdict,
            verdict.tone === 'gain' ? styles.verdictGain : verdict.tone === 'loss' ? styles.verdictLoss : styles.verdictNeutral,
          ]}
        >
          <Ionicons
            name={verdict.tone === 'gain' ? 'checkmark-circle' : verdict.tone === 'loss' ? 'close-circle' : 'help-circle'}
            size={20}
            color={verdict.tone === 'gain' ? styles.gain.color : verdict.tone === 'loss' ? styles.loss.color : styles.accent.color}
          />
          <View style={styles.verdictText}>
            <Text style={styles.verdictTitle}>{verdict.title}</Text>
            <Text style={styles.verdictDetail}>{verdict.detail}</Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.footnote}>
        {`Green and red show what you’d make or lose versus selling it raw, after grading costs.${
          centering ? '' : ' Centering wasn’t measured, so every grade is counted.'
        } Graded prices are recent eBay sales.`}
      </Text>
    </SectionPanel>
  );
}

function Stepper({ icon, label, onPress }: { icon: 'add' | 'remove'; label: string; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} scaleTo={0.86} hitSlop={6}>
      <View style={styles.stepper}>
        <Ionicons name={icon} size={18} color={styles.stepperIcon.color} />
      </View>
    </PressableScale>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    cardName: {
      ...typography.caption,
      color: theme.colors.textMuted,
      paddingBottom: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 7,
    },
    ruledOut: {
      opacity: 0.5,
    },
    label: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
      flex: 1,
    },
    price: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
      minWidth: 72,
      textAlign: 'right',
    },
    net: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    netGain: {
      backgroundColor: withAlpha(theme.colors.gain, 0.16),
    },
    netLoss: {
      backgroundColor: withAlpha(theme.colors.loss, 0.16),
    },
    netText: {
      ...typography.caption,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    gain: {
      color: theme.colors.gain,
    },
    loss: {
      color: theme.colors.loss,
    },
    accent: {
      color: theme.colors.accent,
    },
    muted: {
      color: theme.colors.textMuted,
    },
    borderline: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    ruledText: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    loading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    note: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    costRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    costText: {
      flex: 1,
      gap: 1,
    },
    cost: {
      ...typography.label,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
      minWidth: 44,
      textAlign: 'center',
    },
    stepper: {
      width: 32,
      height: 32,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceRaised,
    },
    stepperIcon: {
      color: theme.colors.text,
    },
    verdict: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
    },
    verdictGain: {
      backgroundColor: withAlpha(theme.colors.gain, 0.12),
    },
    verdictLoss: {
      backgroundColor: withAlpha(theme.colors.loss, 0.12),
    },
    verdictNeutral: {
      backgroundColor: withAlpha(theme.colors.accent, 0.12),
    },
    verdictText: {
      flex: 1,
      gap: 2,
    },
    verdictTitle: {
      ...typography.label,
      color: theme.colors.text,
    },
    verdictDetail: {
      ...typography.caption,
      color: theme.colors.textMuted,
      lineHeight: 18,
    },
    footnote: {
      ...typography.caption,
      fontSize: 12,
      color: theme.colors.textFaint,
      marginTop: spacing.md,
      lineHeight: 16,
    },
  });
}
