import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DetailLayout } from '@/components/DetailLayout';
import { TradePicker } from '@/components/TradePicker';
import { TradeSide as TradePanel } from '@/components/TradeSide';
import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, spacing, typography } from '@/theme';
import { formatMoney } from '@/utils/price';
import { addLine, setLineQuantity, type TradeLine, type TradeSide, tradeTotals, tradeVerdict } from '@/utils/trade';

export default function TradeScreen() {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const [give, setGive] = useState<TradeLine[]>([]);
  const [get, setGet] = useState<TradeLine[]>([]);
  const [picking, setPicking] = useState<TradeSide | null>(null);

  const giveTotals = useMemo(() => tradeTotals(give), [give]);
  const getTotals = useMemo(() => tradeTotals(get), [get]);
  const verdict = tradeVerdict(giveTotals, getTotals);

  const onPick = useCallback(
    (side: TradeSide, line: TradeLine) => {
      haptics.tap();
      (side === 'give' ? setGive : setGet)((lines) => addLine(lines, line));
    },
    [haptics],
  );

  const toneColor = verdict.tone === 'gain' ? styles.gain : verdict.tone === 'loss' ? styles.loss : styles.even;
  const sign = verdict.difference > 0 ? '+' : verdict.difference < 0 ? '−' : '';

  return (
    <DetailLayout>
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          Trade checker
        </Text>
        <View style={styles.summary}>
          <Text style={[styles.difference, toneColor]}>{`${sign}${formatMoney(Math.abs(verdict.difference), 'USD')}`}</Text>
          <Text style={styles.verdict}>{give.length + get.length === 0 ? 'Add cards to both sides' : verdict.label}</Text>
        </View>
        <TradePanel
          title="You give"
          lines={give}
          onAdd={() => setPicking('give')}
          onQuantity={(key, quantity) => setGive((lines) => setLineQuantity(lines, key, quantity))}
        />
        <TradePanel
          title="You get"
          lines={get}
          onAdd={() => setPicking('get')}
          onQuantity={(key, quantity) => setGet((lines) => setLineQuantity(lines, key, quantity))}
        />
      </View>
      <TradePicker side={picking} onClose={() => setPicking(null)} onPick={onPick} />
    </DetailLayout>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
      gap: spacing.lg,
    },
    title: {
      ...typography.title,
      color: theme.colors.text,
    },
    summary: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
    },
    difference: {
      ...typography.title,
      fontSize: 40,
      fontVariant: ['tabular-nums'],
    },
    verdict: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    gain: {
      color: theme.colors.gain,
    },
    loss: {
      color: theme.colors.loss,
    },
    even: {
      color: theme.colors.text,
    },
  });
}
