import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';
import { parseProductDescription } from '@/utils/sealed';

import { SectionPanel } from './SectionPanel';

type Props = {
  description: string | null;
};

export function SealedContents({ description }: Props) {
  const theme = useTheme();
  const { intro, contents } = parseProductDescription(description);
  if (intro.length === 0 && contents.length === 0) return null;

  return (
    <SectionPanel title="What’s inside" icon="cube">
      {contents.map((line) => (
        <View key={line} style={styles.bulletRow}>
          <View style={[styles.bullet, { backgroundColor: theme.colors.accent }]} />
          <Text style={[styles.bulletText, { color: theme.colors.text }]}>{line}</Text>
        </View>
      ))}
      {intro.map((paragraph) => (
        <Text key={paragraph} style={[styles.paragraph, { color: theme.colors.textMuted }]}>
          {paragraph}
        </Text>
      ))}
    </SectionPanel>
  );
}

const styles = StyleSheet.create({
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  bulletText: {
    ...typography.body,
    fontSize: 15,
    flex: 1,
  },
  paragraph: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
