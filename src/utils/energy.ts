const ENERGY_COLORS: Record<string, string> = {
  Grass: '#5DBB63',
  Fire: '#F0592A',
  Water: '#3B9BE0',
  Lightning: '#F7D02C',
  Psychic: '#A65BD6',
  Fighting: '#C46A3A',
  Darkness: '#4A5568',
  Metal: '#9AA7B4',
  Fairy: '#E58AC6',
  Dragon: '#C9A227',
  Colorless: '#D9D9D9',
};

export function energyColor(type: string): string {
  return ENERGY_COLORS[type] ?? '#9AA0AE';
}
