import { useLocalSearchParams } from 'expo-router';

import { GameSetList } from '@/components/GameSetList';
import { isGame, type OtherGame } from '@/utils/game';

export default function GameSetsScreen() {
  const { game: gameParam } = useLocalSearchParams<{ game: string }>();
  const game: OtherGame | null = isGame(gameParam) && gameParam !== 'pokemon' ? gameParam : null;
  return <GameSetList game={game} />;
}
