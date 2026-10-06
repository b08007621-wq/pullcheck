import { z } from 'zod';

import type { CardFinish, CardReading, ReadingConfidence } from '@/types/identify';

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

const FINISHES = ['normal', 'holo', 'reverse', 'unknown'] as const satisfies readonly CardFinish[];

export const SYSTEM_PROMPT = `You read photos of Pokémon Trading Card Game cards so an app can look the exact printing up in a card database.

Report only what is printed on the card. Never guess from artwork or memory.
- name: the card name exactly as printed at the top, including suffixes and prefixes such as "ex", "V", "VMAX", "VSTAR", "GX", "Mega", or a trainer's name ("Blaine's Charizard").
- collectorNumber: the collector number exactly as printed near the bottom corner, e.g. "079/128", "125/094", "TG05/TG30", "SWSH050". Empty string if you can't read it.
- setCode: the short set code printed next to the collector number or regulation mark (e.g. "PFL", "30C", "MEW"), uppercase. Empty string if there is none or it's unreadable.
- hp: the HP number for Pokémon cards, digits only. Empty string for trainers and energy.
- language: the card's printed language, e.g. "English", "Japanese".
- confidence: "high" if name and number are both clearly legible, "medium" if one is partly obscured, "low" otherwise.
- finish: the foil you can see. "reverse" if the rainbow shine covers the card body and frame outside the artwork while the artwork itself is flat (reverse holo). "holo" if only the artwork window shines, or the whole card including the art shines (full art, ex and special cards). "normal" if nothing shines. "unknown" if the lighting makes it impossible to tell.
- notes: one short sentence about anything that made reading hard (glare, blur, card cut off). Empty string if nothing.
If the photo is not a Pokémon card, set isPokemonCard to false and leave the other text fields empty.`;

export const CardReadingSchema = z.object({
  isPokemonCard: z.boolean(),
  name: z.string(),
  collectorNumber: z.string(),
  setCode: z.string(),
  hp: z.string(),
  language: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  finish: z.enum(FINISHES),
  notes: z.string(),
});

export const CARD_READING_KEYS = Object.keys(CardReadingSchema.shape);

export const CARD_READING_JSON_SCHEMA = {
  type: 'object',
  properties: {
    isPokemonCard: { type: 'boolean' },
    name: { type: 'string' },
    collectorNumber: { type: 'string' },
    setCode: { type: 'string' },
    hp: { type: 'string' },
    language: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    finish: { type: 'string', enum: FINISHES },
    notes: { type: 'string' },
  },
  required: ['isPokemonCard', 'name', 'collectorNumber', 'setCode', 'hp', 'language', 'confidence', 'finish', 'notes'],
  additionalProperties: false,
} as const;

export class CardReadError extends Error {
  readonly code: 'refused' | 'unreadable';

  constructor(code: 'refused' | 'unreadable') {
    super(code === 'refused' ? 'The model declined to read this image.' : 'The model could not read this image.');
    this.name = 'CardReadError';
    this.code = code;
  }
}

export function readingFromText(text: string): CardReading | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return normalizeReading(JSON.parse(text.slice(start, end + 1)));
  } catch {
    return null;
  }
}

function normalizeReading(value: unknown): CardReading | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const text = (key: string) => (typeof raw[key] === 'string' ? (raw[key] as string).trim() : '');
  const name = text('name');
  const confidence = text('confidence').toLowerCase();
  const finish = text('finish').toLowerCase();

  return {
    isPokemonCard: typeof raw.isPokemonCard === 'boolean' ? raw.isPokemonCard : name.length > 0,
    name,
    collectorNumber: text('collectorNumber'),
    setCode: text('setCode').toUpperCase(),
    hp: text('hp').replace(/\D/g, ''),
    language: text('language') || 'English',
    confidence: (['high', 'medium', 'low'].includes(confidence) ? confidence : 'medium') as ReadingConfidence,
    finish: (FINISHES as readonly string[]).includes(finish) ? (finish as CardFinish) : 'unknown',
    notes: text('notes'),
  };
}
