import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppearanceButton } from '@/components/AppearanceButton';
import { IconButton } from '@/components/IconButton';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Screen } from '@/components/Screen';
import { SealedResults } from '@/components/SealedResults';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useCardSearch } from '@/hooks/useCardSearch';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { useSealedSearch } from '@/hooks/useSealedSearch';
import { spacing } from '@/theme';
import type { Market } from '@/types/sealed';

type SearchMode = 'cards' | 'sealed';

const MODES: { value: SearchMode; label: string }[] = [
  { value: 'cards', label: 'Cards' },
  { value: 'sealed', label: 'Sealed' },
];

export default function SearchScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [mode, setMode] = useState<SearchMode>('cards');
  const [market, setMarket] = useState<Market>('en');
  const [cardText, setCardText] = useState(q ?? '');
  const [sealedText, setSealedText] = useState('');
  const [appliedQuery, setAppliedQuery] = useState(q);
  const cardRecent = useRecentSearches('cards');
  const sealedRecent = useRecentSearches('sealed');

  if (q !== appliedQuery) {
    setAppliedQuery(q);
    if (q) {
      setMode('cards');
      setMarket('en');
      setCardText(q);
    }
  }

  const isCards = mode === 'cards';
  const japanese = market === 'jp';
  const cardSearch = useCardSearch(isCards && !japanese ? cardText : '');
  const jpCardSearch = useSealedSearch(cardText, 'jp', 'singles', isCards && japanese);
  const sealedSearch = useSealedSearch(sealedText, market, 'sealed', !isCards);

  const busy = isCards
    ? japanese
      ? jpCardSearch.isTyping || jpCardSearch.status === 'loading'
      : cardSearch.isTyping || cardSearch.status === 'loading'
    : sealedSearch.isTyping || sealedSearch.status === 'loading';
  const rememberCards = () => cardRecent.remember(cardText);
  const rememberSealed = () => sealedRecent.remember(sealedText);

  return (
    <Screen title="Search" action={<AppearanceButton />}>
      <View style={styles.controls}>
        <View style={styles.modeRow}>
          <View style={styles.modes}>
            <SegmentedControl options={MODES} value={mode} onChange={setMode} />
          </View>
          {isCards ? null : (
            <IconButton icon="barcode-outline" accessibilityLabel="Scan a barcode" onPress={() => router.push('/barcode')} />
          )}
          <LanguageToggle value={market} onChange={setMarket} />
        </View>
        <SearchBar
          value={isCards ? cardText : sealedText}
          onChangeText={isCards ? setCardText : setSealedText}
          onSubmit={isCards ? rememberCards : rememberSealed}
          isBusy={busy}
          placeholder={
            isCards
              ? japanese
                ? 'Japanese card, e.g. Pikachu 151'
                : 'Card name, e.g. Charizard'
              : japanese
                ? 'Japanese product, e.g. 151 Booster Box'
                : 'Product, e.g. Surging Sparks ETB'
          }
        />
      </View>
      {isCards && !japanese ? (
        <SearchResults
          search={cardSearch}
          bottomInset={tabBarHeight}
          onSuggestion={setCardText}
          recent={cardRecent.recent}
          onClearRecent={cardRecent.clear}
          onOpenResult={rememberCards}
        />
      ) : (
        <SealedResults
          search={isCards ? jpCardSearch : sealedSearch}
          bottomInset={tabBarHeight}
          onSuggestion={isCards ? setCardText : setSealedText}
          recent={isCards ? cardRecent.recent : sealedRecent.recent}
          onClearRecent={isCards ? cardRecent.clear : sealedRecent.clear}
          onOpenResult={isCards ? rememberCards : rememberSealed}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modes: {
    flex: 1,
  },
});
