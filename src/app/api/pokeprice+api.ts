import fs from 'node:fs/promises';
import path from 'node:path';

import { clientKey, isRateLimited } from '@/server/rateLimit';

const BASE = 'https://www.pokemonpricetracker.com/api/v2/cards';
const CACHE_MS = 3 * 24 * 60 * 60 * 1000;
const DIRECTORY = path.join(process.cwd(), '.cache', 'pokeprice');
const memory = new Map<string, { at: number; body: string }>();
let limitedUntil = 0;

export async function GET(request: Request) {
  const key = process.env.POKEPRICE_API_KEY;
  if (!key) return Response.json({ error: { code: 'not_configured' } }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const id = params.get('id') ?? '';
  if (!/^\d{1,10}$/.test(id)) return Response.json({ error: { code: 'bad_request' } }, { status: 400 });

  const cached = await readCache(id);
  if (cached) return json(cached);
  if (Date.now() < limitedUntil) return Response.json({ limited: { resetsAt: new Date(limitedUntil).toISOString() } });
  if (isRateLimited(clientKey(request))) return Response.json({ error: { code: 'rate_limited' } }, { status: 429 });

  const upstream = await fetch(`${BASE}?tcgPlayerId=${encodeURIComponent(id)}&includeEbay=true`, {
    headers: { Authorization: `Bearer ${key}` },
  }).catch(() => null);
  if (!upstream) return Response.json({ error: { code: 'unreachable' } }, { status: 502 });
  const body = await upstream.text();
  if (upstream.status === 429) {
    const resetsAt = dailyReset(body);
    if (resetsAt) {
      limitedUntil = resetsAt;
      return Response.json({ limited: { resetsAt: new Date(resetsAt).toISOString() } });
    }
  }
  if (!upstream.ok) return new Response(body, { status: upstream.status, headers: { 'Content-Type': 'application/json' } });
  await writeCache(id, body);
  return json(body);
}

function json(body: string): Response {
  return new Response(body, { headers: { 'Content-Type': 'application/json' } });
}

function dailyReset(body: string): number | null {
  try {
    const parsed = JSON.parse(body) as { limitType?: string; resetsAt?: string };
    if (parsed.limitType !== 'daily') return null;
    const at = Date.parse(parsed.resetsAt ?? '');
    return Number.isFinite(at) ? at : Date.now() + 6 * 60 * 60 * 1000;
  } catch {
    return null;
  }
}

async function readCache(id: string): Promise<string | null> {
  const hit = memory.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.body;
  try {
    const file = path.join(DIRECTORY, `${id}.json`);
    const stat = await fs.stat(file);
    if (Date.now() - stat.mtimeMs > CACHE_MS) return null;
    const body = await fs.readFile(file, 'utf8');
    memory.set(id, { at: stat.mtimeMs, body });
    return body;
  } catch {
    return null;
  }
}

async function writeCache(id: string, body: string) {
  memory.set(id, { at: Date.now(), body });
  await fs.mkdir(DIRECTORY, { recursive: true }).catch(() => {});
  await fs.writeFile(path.join(DIRECTORY, `${id}.json`), body).catch(() => {});
}
