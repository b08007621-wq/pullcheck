import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppearanceButton } from '@/components/AppearanceButton';
import { GameLanguageButton } from '@/components/GameLanguageButton';
import { GamePicker } from '@/components/GamePicker';
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
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';
import type { Game } from '@/types/card';
import type { Market } from '@/types/sealed';
import { gameLanguages } from '@/services/otherGames';
import { gameInfo } from '@/utils/game';

type SearchMode = 'cards' | 'sealed';

const MODES: { value: SearchMode; label: string }[] = [
  { value: 'cards', label: 'Cards' },
  { value: 'sealed', label: 'Sealed' },
];

export default function SearchScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { q, market: marketParam } = useLocalSearchParams<{ q?: string; market?: string }>();
  const paramKey = q ? `${q}|${marketParam ?? 'en'}` : undefined;
  const [mode, setMode] = useState<SearchMode>('cards');
  const [market, setMarket] = useState<Market>('en');
  const [cardText, setCardText] = useState(q ?? '');
  const [sealedText, setSealedText] = useState('');
  const [appliedQuery, setAppliedQuery] = useState(paramKey);
  const cardRecent = useRecentSearches('cards');
  const sealedRecent = useRecentSearches('sealed');
  const { settings, updateSettings } = useSettings();
  const theme = useTheme();
  const game = settings.searchGame;
  const pokemon = game === 'pokemon';
  const gameRecent = useRecentSearches(pokemon ? 'cards' : game);
  const languages = gameLanguages(game);
  const gameLanguage = pokemon ? 'en' : (settings.gameLanguages[game] ?? 'en');

  const gameRef = useRef({ game, updateSettings });
  useEffect(() => {
    gameRef.current = { game, updateSettings };
  });
  useEffect(() => {
    if (paramKey && gameRef.current.game !== 'pokemon') gameRef.current.updateSettings({ searchGame: 'pokemon' });
  }, [paramKey]);

  if (paramKey !== appliedQuery) {
    setAppliedQuery(paramKey);
    if (q) {
      setMode('cards');
      setMarket(marketParam === 'jp' ? 'jp' : 'en');
      setCardText(q);
    }
  }

  const isCards = mode === 'cards' || !pokemon;
  const japanese = pokemon && market === 'jp';
  const cardSearch = useCardSearch(isCards && !japanese ? cardText : '', game, gameLanguage);
  const jpCardSearch = useSealedSearch(cardText, 'jp', 'singles', isCards && japanese);
  const sealedSearch = useSealedSearch(sealedText, market, 'sealed', !isCards);
  const pickGame = (next: Game) => {
    if (next !== game) updateSettings({ searchGame: next });
  };

  const busy = isCards
    ? japanese
      ? jpCardSearch.isTyping || jpCardSearch.status === 'loading'
      : cardSearch.isTyping || cardSearch.status === 'loading'
    : sealedSearch.isTyping || sealedSearch.status === 'loading';
  const rememberCards = () => (pokemon ? cardRecent : gameRecent).remember(cardText);
  const rememberSealed = () => sealedRecent.remember(sealedText);

  return (
    <Screen title="Search" action={<AppearanceButton />}>
      <View style={styles.controls}>
        <GamePicker value={game} onChange={pickGame} />
        {pokemon ? (
          <View style={styles.modeRow}>
            <View style={styles.modes}>
              <SegmentedControl options={MODES} value={mode} onChange={setMode} />
            </View>
            {isCards ? null : (
              <IconButton icon="barcode-outline" accessibilityLabel="Scan a barcode" onPress={() => router.push('/barcode')} />
            )}
            <LanguageToggle value={market} onChange={setMarket} />
          </View>
        ) : languages.length > 1 ? (
          <View style={styles.modeRow}>
            <Text style={[styles.gameNote, { color: theme.colors.textMuted }]} numberOfLines={2}>
              {gameInfo(game).label} · {game === 'yugioh' ? 'card text in your language' : 'printed in your language'}
            </Text>
            <GameLanguageButton
              languages={languages}
              value={gameLanguage}
              note={
                game === 'yugioh'
                  ? 'Yu-Gi-Oh! names and card text are translated. Japanese (OCG) cards aren’t in the free database.'
                  : 'Shows printings in that language. Many non-English printings have no US price.'
              }
              onChange={(lang) => updateSettings({ gameLanguages: { ...settings.gameLanguages, [game]: lang } })}
            />
          </View>
        ) : null}
        <SearchBar
          value={isCards ? cardText : sealedText}
          onChangeText={isCards ? setCardText : setSealedText}
          onSubmit={isCards ? rememberCards : rememberSealed}
          isBusy={busy}
          placeholder={
            isCards
              ? japanese
                ? 'Japanese card, e.g. Pikachu 151'
                : gameInfo(game).placeholder
              : japanese
                ? 'Japanese product, e.g. 151 Booster Box'
                : 'Product, e.g. Surging Sparks ETB'
          }
        />
      </View>
      {isCards && !japanese ? (
        <SearchResults
          search={cardSearch}
          game={game}
          bottomInset={tabBarHeight}
          onSuggestion={setCardText}
          recent={pokemon ? cardRecent.recent : gameRecent.recent}
          onClearRecent={pokemon ? cardRecent.clear : gameRecent.clear}
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
  gameNote: {
    ...typography.caption,
    flex: 1,
  },
});
