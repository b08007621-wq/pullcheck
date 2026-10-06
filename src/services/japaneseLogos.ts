import type { TcgcsvGroup } from './tcgcsv';

const ASSET_BASE = 'https://cdn.jsdelivr.net/gh/1niceroli/ptcg-assets@main';

const JAPANESE_LOGOS = new Set([
  'base1', 'ic24', 'm1l', 'm1s', 'm2', 'm2a', 'm3', 'm4', 'm5', 'm6', 'm6a', 'mbd', 'mbg', 'mc',
  's10a', 's10b', 's10d', 's10p', 's11', 's11a', 's12', 's12a', 's6a', 's8a', 'smp', 'sp',
  'sv10', 'sv11b', 'sv11w', 'sv1a', 'sv1s', 'sv1v', 'sv2a', 'sv2d', 'sv2p', 'sv3', 'sv3a', 'sv4a',
  'sv4k', 'sv4m', 'sv5a', 'sv5k', 'sv5m', 'sv6', 'sv6a', 'sv7', 'sv7a', 'sv8', 'sv8a', 'sv9', 'sv9a',
  'svod', 'svom', 'svp', 'vs', 'xyp',
]);

export function setCode(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function japaneseLogo(group: TcgcsvGroup): string | null {
  return japaneseLogoFor(group.abbreviation, group.name);
}

export function japaneseLogoFor(abbreviation: string | null | undefined, name: string): string | null {
  const prefix = /^([A-Za-z]{1,6}[\d.]*[a-z]?)\s*:/.exec(name)?.[1];
  for (const code of [abbreviation, prefix]) {
    const key = setCode(code);
    if (key && JAPANESE_LOGOS.has(key)) return `${ASSET_BASE}/ja_${key}/logo.png`;
  }
  return null;
}
