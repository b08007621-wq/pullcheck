import { clientKey, isRateLimited } from '@/server/rateLimit';

const BASE = 'https://www.pokemonpricetracker.com/api/v2/cards';
const CACHE_MS = 12 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; body: string }>();

export async function GET(request: Request) {
  const key = process.env.POKEPRICE_API_KEY;
  if (!key) return Response.json({ error: { code: 'not_configured' } }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const id = params.get('id') ?? '';
  if (!/^\d{1,10}$/.test(id)) return Response.json({ error: { code: 'bad_request' } }, { status: 400 });

  const cacheKey = id;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return new Response(hit.body, { headers: { 'Content-Type': 'application/json' } });
  }
  if (isRateLimited(clientKey(request))) return Response.json({ error: { code: 'rate_limited' } }, { status: 429 });

  const upstream = await fetch(
    `${BASE}?tcgPlayerId=${encodeURIComponent(id)}&includeEbay=true`,
    { headers: { Authorization: `Bearer ${key}` } },
  ).catch(() => null);
  if (!upstream) return Response.json({ error: { code: 'unreachable' } }, { status: 502 });
  const body = await upstream.text();
  if (!upstream.ok) return new Response(body, { status: upstream.status, headers: { 'Content-Type': 'application/json' } });
  cache.set(cacheKey, { at: Date.now(), body });
  return new Response(body, { headers: { 'Content-Type': 'application/json' } });
}
