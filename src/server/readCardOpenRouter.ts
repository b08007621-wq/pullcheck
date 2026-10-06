import type { CardReading } from '@/types/identify';

import {
  CARD_READING_JSON_SCHEMA,
  CARD_READING_KEYS,
  CardReadError,
  type ImageMediaType,
  readingFromText,
  SYSTEM_PROMPT,
} from './cardReading';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'dots-studio/dots-3-note-preview:free',
];
const ATTEMPT_TIMEOUT_MS = 45000;
const RETRY_NEXT_MODEL = new Set([404, 408, 429, 502, 503]);

type Attempt = {
  model: string;
  structured: boolean;
};

type ChatResponse = {
  choices?: { message?: { content?: string | { type: string; text?: string }[] | null } }[];
  error?: { code?: number; message?: string };
};

export class OpenRouterError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
  }
}

export async function readCardWithOpenRouter(imageBase64: string, mediaType: ImageMediaType): Promise<CardReading> {
  const configured = process.env.OPENROUTER_MODEL?.trim();
  const models = configured ? [configured] : FREE_MODELS;

  let lastError: unknown = new CardReadError('unreadable');
  for (const model of models) {
    for (const structured of [true, false]) {
      try {
        const reading = await requestReading({ model, structured }, imageBase64, mediaType);
        if (reading) return reading;
        lastError = new CardReadError('unreadable');
      } catch (error) {
        lastError = error;
        if (!(error instanceof OpenRouterError)) throw error;
        if (structured && error.status === 400) continue;
        if (RETRY_NEXT_MODEL.has(error.status)) break;
        throw error;
      }
    }
  }
  throw lastError;
}

async function requestReading(attempt: Attempt, imageBase64: string, mediaType: ImageMediaType): Promise<CardReading | null> {
  const baseUrl = (process.env.OPENROUTER_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ''}`,
      'Content-Type': 'application/json',
      'X-Title': 'PullCheck',
    },
    body: JSON.stringify({
      model: attempt.model,
      temperature: 0,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\nReply with only a JSON object with exactly these keys: ${CARD_READING_KEYS.join(', ')}.` },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Read this card.' },
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
          ],
        },
      ],
      ...(attempt.structured
        ? {
            response_format: {
              type: 'json_schema',
              json_schema: { name: 'card_reading', strict: true, schema: CARD_READING_JSON_SCHEMA },
            },
          }
        : {}),
    }),
  }).catch((error: unknown) => {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    throw new OpenRouterError(timedOut ? 408 : 502, timedOut ? 'The model took too long.' : 'Could not reach OpenRouter.');
  });

  const data = (await response.json().catch(() => null)) as ChatResponse | null;
  if (!response.ok || !data || data.error) {
    const status = response.ok ? data?.error?.code ?? 502 : response.status;
    throw new OpenRouterError(status, data?.error?.message ?? `OpenRouter returned ${response.status}.`);
  }

  const content = data.choices?.[0]?.message?.content;
  const text = Array.isArray(content) ? content.map((part) => part.text ?? '').join('') : content ?? '';
  return readingFromText(text);
}
