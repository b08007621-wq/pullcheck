import type { CardReading } from '@/types/identify';

import type { ImageMediaType } from './cardReading';
import { readCardWithAnthropic } from './readCardAnthropic';
import { readCardWithOpenRouter } from './readCardOpenRouter';

export type CardReader = 'openrouter' | 'anthropic';

export function activeReader(): CardReader | null {
  const preferred = process.env.CARD_READER?.trim().toLowerCase();
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

  if (preferred === 'anthropic' && hasAnthropic) return 'anthropic';
  if (preferred === 'openrouter' && hasOpenRouter) return 'openrouter';
  if (hasOpenRouter) return 'openrouter';
  if (hasAnthropic) return 'anthropic';
  return null;
}

export function readCard(reader: CardReader, imageBase64: string, mediaType: ImageMediaType): Promise<CardReading> {
  return reader === 'openrouter'
    ? readCardWithOpenRouter(imageBase64, mediaType)
    : readCardWithAnthropic(imageBase64, mediaType);
}
