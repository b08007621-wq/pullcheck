import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { CardIdentify } from '@/hooks/useCardIdentify';
import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';
import type { Card } from '@/types/card';
import type { CardReading } from '@/types/identify';
import type { ScanPhoto } from '@/types/scan';
import { cardVersionPrice, versionLabel } from '@/utils/cardVersion';
import { formatPrice } from '@/utils/price';
import { variantForFinish } from '@/utils/rip';

import { ActionButton } from './ActionButton';
import { Chip } from './Chip';
import { IdentifyCandidates } from './IdentifyCandidates';
import { ReadingSummary } from './ReadingSummary';

type Props = {
  photo: ScanPhoto;
  identify: CardIdentify;
  onRetake: () => void;
  onIdentify: () => void;
  onOpenCard: (card: Card) => void;
  onSearchName: (name: string) => void;
  ripping?: boolean;
};

export function ScanPreviewActions({
  photo,
  identify,
  onRetake,
  onIdentify,
  onOpenCard,
  onSearchName,
  ripping = false,
}: Props) {
  const theme = useTheme();
  const { stage, reading, match, error } = identify;

  if (stage === 'reading' || stage === 'matching') {
    return (
      <View style={styles.block}>
        <View style={styles.status}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.statusText}>
            {stage === 'reading' ? 'Reading the card…' : 'Finding it in the database…'}
          </Text>
        </View>
        {reading ? <ReadingSummary reading={reading} /> : null}
        <ActionButton label="Cancel" icon="close" variant="secondary" onPress={onRetake} />
      </View>
    );
  }

  if (stage === 'error') {
    return (
      <View style={styles.block}>
        <View style={styles.status}>
          <Ionicons name="alert-circle" size={20} color={theme.colors.danger} />
          <Text style={styles.statusText}>{error?.message ?? 'Couldn’t identify this card.'}</Text>
        </View>
        <View style={styles.buttons}>
          <ActionButton label="Retake" icon="camera-reverse-outline" variant="secondary" onPress={onRetake} />
          <ActionButton label="Try again" icon="refresh" onPress={onIdentify} />
        </View>
      </View>
    );
  }

  if (stage === 'done' && match?.status === 'single') {
    return (
      <View style={styles.block}>
        <View style={styles.status}>
          <Ionicons name="checkmark-circle" size={22} color={theme.colors.gain} />
          <Text style={styles.statusText}>
            {ripping ? pulledLabel(match.card, reading) : `Found ${match.card.name} · ${match.card.set.name}`}
          </Text>
        </View>
        <View style={styles.buttons}>
          <ActionButton label="Retake" icon="camera-reverse-outline" variant="secondary" onPress={onRetake} />
          <ActionButton
            label={ripping ? 'Add to pull' : 'Open card'}
            icon={ripping ? 'add' : 'arrow-forward'}
            onPress={() => onOpenCard(match.card)}
          />
        </View>
      </View>
    );
  }

  if (stage === 'done' && match?.status === 'multiple') {
    return (
      <View style={styles.block}>
        <Text style={styles.title}>Which one is it?</Text>
        {reading ? <ReadingSummary reading={reading} /> : null}
        <IdentifyCandidates cards={match.cards} onSelect={onOpenCard} />
        <ActionButton label="Retake" icon="camera-reverse-outline" variant="secondary" onPress={onRetake} />
      </View>
    );
  }

  if (stage === 'done') {
    const name = reading?.isPokemonCard ? reading.name.trim() : '';
    return (
      <View style={styles.block}>
        <Text style={styles.title}>
          {reading?.isPokemonCard === false ? 'That doesn’t look like a Pokémon card' : 'Couldn’t find a match'}
        </Text>
        {reading?.isPokemonCard ? <ReadingSummary reading={reading} /> : null}
        {reading?.notes ? <Text style={styles.note}>{reading.notes}</Text> : null}
        <View style={styles.buttons}>
          <ActionButton label="Retake" icon="camera-reverse-outline" variant="secondary" onPress={onRetake} />
          <ActionButton
            label={name ? `Search “${truncate(name)}”` : 'Search by name'}
            icon="search"
            onPress={() => onSearchName(name)}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <View style={styles.chips}>
        <Chip label={photo.source === 'camera' ? 'Camera' : 'From Photos'} tone="accent" />
        <Chip label={`${photo.width} × ${photo.height}`} />
        {photo.cropped ? <Chip label="Cropped to frame" tone="gain" /> : null}
      </View>
      <View style={styles.buttons}>
        <ActionButton label="Retake" icon="camera-reverse-outline" variant="secondary" onPress={onRetake} />
        <ActionButton label="Identify card" icon="sparkles" onPress={onIdentify} />
      </View>
    </View>
  );
}

function pulledLabel(card: Card, reading: CardReading | null): string {
  const version = { variant: variantForFinish(card, reading?.finish), condition: 'NM' as const };
  const price = cardVersionPrice(card, version);
  const label = versionLabel(card, version, 'short');
  return [card.name, label, price ? formatPrice(price) : 'no price yet'].filter(Boolean).join(' · ');
}

function truncate(text: string): string {
  return text.length > 18 ? `${text.slice(0, 17)}…` : text;
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    gap: spacing.md,
    alignSelf: 'stretch',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statusText: {
    ...typography.label,
    color: '#FFFFFF',
    flexShrink: 1,
    textAlign: 'center',
  },
  title: {
    ...typography.heading,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  note: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
