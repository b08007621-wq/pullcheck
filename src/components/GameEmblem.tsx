import Svg, { Circle, Path, Polygon } from 'react-native-svg';

import type { Game } from '@/types/card';

type Props = {
  game: Game;
  size: number;
};

const MANA = [
  { color: '#F8F1D2', x: 12, y: 3.6 },
  { color: '#2E7FD9', x: 20, y: 9.4 },
  { color: '#3B3434', x: 16.9, y: 18.8 },
  { color: '#E0442F', x: 7.1, y: 18.8 },
  { color: '#2F9E58', x: 4, y: 9.4 },
];

export function GameEmblem({ game, size }: Props) {
  if (game === 'pokemon') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={10.5} fill="#FFFFFF" stroke="#1D1D1F" strokeWidth={1.6} />
        <Path d="M1.5 12a10.5 10.5 0 0 1 21 0Z" fill="#E3350D" stroke="#1D1D1F" strokeWidth={1.6} />
        <Circle cx={12} cy={12} r={3.4} fill="#FFFFFF" stroke="#1D1D1F" strokeWidth={1.8} />
        <Circle cx={12} cy={12} r={1.4} fill="#FFFFFF" stroke="#1D1D1F" strokeWidth={0.9} />
      </Svg>
    );
  }
  if (game === 'mtg') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={11.2} fill="#1C1A17" />
        {MANA.map((mana) => (
          <Circle key={mana.color} cx={mana.x} cy={mana.y} r={3.1} fill={mana.color} stroke="#0B0A09" strokeWidth={0.6} />
        ))}
      </Svg>
    );
  }
  if (game === 'yugioh') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Polygon points="2,4 22,4 12,22" fill="#E6B422" stroke="#8A5A00" strokeWidth={1.2} strokeLinejoin="round" />
        <Path d="M6.4 9.6Q12 5.4 17.6 9.6Q12 13.8 6.4 9.6Z" fill="#FFF7DC" stroke="#5C3B00" strokeWidth={0.9} />
        <Circle cx={12} cy={9.6} r={1.7} fill="#5C3B00" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="12,1.5 21.1,6.75 21.1,17.25 12,22.5 2.9,17.25 2.9,6.75" fill="#1B2A4A" stroke="#D6B25E" strokeWidth={1.4} />
      <Path d="M12 6.2C14.6 9.6 16.2 11.8 16.2 13.9a4.2 4.2 0 0 1-8.4 0C7.8 11.8 9.4 9.6 12 6.2Z" fill="#D6B25E" />
    </Svg>
  );
}
