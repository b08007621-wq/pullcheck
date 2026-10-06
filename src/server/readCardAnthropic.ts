import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

import type { CardReading } from '@/types/identify';

import { CardReadError, CardReadingSchema, type ImageMediaType, SYSTEM_PROMPT } from './cardReading';

const MODEL = 'claude-opus-5-5';

let client: Anthropic | null = null;

export async function readCardWithAnthropic(imageBase64: string, mediaType: ImageMediaType): Promise<CardReading> {
  client ??= new Anthropic();

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: 'low',
      format: betaZodOutputFormat(CardReadingSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: 'Read this card.' },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal') throw new CardReadError('refused');
  const reading = response.parsed_output;
  if (!reading) throw new CardReadError('unreadable');
  return reading;
}
