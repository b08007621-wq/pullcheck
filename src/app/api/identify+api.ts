import Anthropic from '@anthropic-ai/sdk';

import { CardReadError, type ImageMediaType } from '@/server/cardReading';
import { clientKey, isRateLimited } from '@/server/rateLimit';
import { activeReader, readCard } from '@/server/readCard';
import { OpenRouterError } from '@/server/readCardOpenRouter';

const MAX_IMAGE_CHARS = 7_000_000;
const MEDIA_TYPES: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/webp'];

type IdentifyRequest = {
  image: string;
  mediaType: ImageMediaType;
};

export async function POST(request: Request) {
  const reader = activeReader();
  if (!reader) {
    return failure(
      503,
      'not_configured',
      'Card recognition isn’t set up yet. Add OPENROUTER_API_KEY (or ANTHROPIC_API_KEY) to .env.local and restart the server.',
    );
  }
  if (isRateLimited(clientKey(request))) {
    return failure(429, 'rate_limited', 'Too many scans in a minute. Take a breather and try again.');
  }

  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return failure(400, 'bad_request', 'Send { image: base64 string, mediaType: "image/jpeg" | "image/png" | "image/webp" }.');
  }
  if (body.image.length > MAX_IMAGE_CHARS) {
    return failure(413, 'too_large', 'That photo is too large. Try again with a smaller one.');
  }

  try {
    const reading = await readCard(reader, body.image, body.mediaType);
    return Response.json({ reading });
  } catch (error) {
    return toFailure(error);
  }
}

function parseBody(value: unknown): IdentifyRequest | null {
  if (typeof value !== 'object' || value === null) return null;
  const { image, mediaType } = value as Record<string, unknown>;
  if (typeof image !== 'string' || image.length === 0) return null;
  if (!MEDIA_TYPES.includes(mediaType as ImageMediaType)) return null;
  return { image: image.replace(/^data:image\/\w+;base64,/, ''), mediaType: mediaType as ImageMediaType };
}

function toFailure(error: unknown): Response {
  if (error instanceof CardReadError) {
    return failure(422, error.code, error.code === 'refused'
      ? 'This photo couldn’t be processed. Try another shot of the card.'
      : 'Couldn’t read the card. Try a sharper photo with less glare.');
  }
  if (error instanceof OpenRouterError) return openRouterFailure(error);
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return failure(500, 'bad_key', 'The server’s Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.local.');
  }
  if (error instanceof Anthropic.RateLimitError) {
    return failure(429, 'upstream_rate_limited', 'Card recognition is busy right now. Try again in a moment.');
  }
  if (error instanceof Anthropic.BadRequestError) {
    return failure(400, 'upstream_bad_request', 'The photo couldn’t be sent for recognition. Try retaking it.');
  }
  if (error instanceof Anthropic.APIError) {
    return failure(502, 'upstream_error', 'Card recognition had a hiccup. Try again.');
  }
  return failure(500, 'server_error', 'Something went wrong on the server. Try again.');
}

function openRouterFailure(error: OpenRouterError): Response {
  switch (error.status) {
    case 401:
      return failure(500, 'bad_key', 'OpenRouter rejected the API key. Check OPENROUTER_API_KEY in .env.local.');
    case 402:
      return failure(402, 'no_credits', 'Your OpenRouter account is out of credits for this model. Switch back to a free model or add credits.');
    case 403:
      return failure(422, 'refused', 'This photo couldn’t be processed. Try another shot of the card.');
    case 429:
      return failure(429, 'upstream_rate_limited', 'Free scans are used up for now (about 20 a minute, 50 a day). Try again later.');
    default:
      return failure(502, 'upstream_error', 'The card reader is busy or down right now. Try again in a moment.');
  }
}

function failure(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}
