import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { CARD_VISION_JS, CARD_VISION_VERSION } from '../../src/services/cardVisionSource.ts';

const require = createRequire(import.meta.url);
const jpeg = require('jpeg-js');

const OUT = process.argv[2] ?? 'card-index';
const CACHE = process.argv[3] ?? null;
const UA = 'PullCheck/1.0 (card-index; github.com/b08007621-wq/pullcheck)';
const LANGUAGES = ['en', 'ja'];
const CONCURRENCY = 8;

const vision = new Function(`${CARD_VISION_JS}; return PullVision;`)();
const dir = path.join(OUT, `v${CARD_VISION_VERSION}`);

async function fetchWithRetry(url, read) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': UA } });
      if (response.status === 404) return null;
      if (response.ok) return await read(response);
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }
  throw new Error(`Failed ${url}`);
}

function isDigital(lang, id) {
  const set = id.slice(0, id.lastIndexOf('-'));
  return lang === 'en' && /^[A-Z]/.test(set);
}

async function listCards() {
  const cards = [];
  for (const lang of LANGUAGES) {
    const list = await fetchWithRetry(`https://api.tcgdex.net/v2/${lang}/cards`, (response) => response.json());
    for (const card of list ?? []) {
      if (!card.image || isDigital(lang, card.id)) continue;
      cards.push({ key: `${lang}:${card.id}`, lang, id: card.id, image: card.image });
    }
  }
  return cards;
}

async function readPrevious() {
  try {
    const meta = JSON.parse(await fs.readFile(path.join(dir, 'meta.json'), 'utf8'));
    const vectors = new Int8Array((await fs.readFile(path.join(dir, 'vectors.bin'))).buffer.slice(0));
    if (meta.dims !== vision.DIMS || meta.version !== CARD_VISION_VERSION) return new Map();
    return new Map(meta.ids.map((key, index) => [key, vectors.slice(index * meta.dims, (index + 1) * meta.dims)]));
  } catch {
    return new Map();
  }
}

async function imageBytes(card) {
  const cached = CACHE ? path.join(CACHE, card.lang, `${card.id.replace(/[^A-Za-z0-9._-]/g, '_')}.jpg`) : null;
  if (cached) {
    try {
      return await fs.readFile(cached);
    } catch {}
  }
  const bytes = await fetchWithRetry(`${card.image}/low.jpg`, async (response) => Buffer.from(await response.arrayBuffer()));
  if (bytes && cached) await fs.mkdir(path.dirname(cached), { recursive: true }).then(() => fs.writeFile(cached, bytes));
  return bytes;
}

async function main() {
  const cards = await listCards();
  const previous = await readPrevious();
  const vectors = new Map();
  const todo = [];
  for (const card of cards) {
    const known = previous.get(card.key);
    if (known) vectors.set(card.key, known);
    else todo.push(card);
  }
  console.log(`${cards.length} cards, ${vectors.size} reused, ${todo.length} to describe`);

  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < todo.length) {
      const card = todo[next++];
      try {
        const bytes = await imageBytes(card);
        if (!bytes) {
          failed++;
          continue;
        }
        const image = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 256 });
        vectors.set(card.key, vision.quantize(vision.describeReference(image)));
      } catch {
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const ids = cards.map((card) => card.key).filter((key) => vectors.has(key));
  const packed = new Int8Array(ids.length * vision.DIMS);
  ids.forEach((key, index) => packed.set(vectors.get(key), index * vision.DIMS));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'vectors.bin'), Buffer.from(packed.buffer));
  await fs.writeFile(
    path.join(dir, 'meta.json'),
    JSON.stringify({ version: CARD_VISION_VERSION, dims: vision.DIMS, built: new Date().toISOString(), ids }),
  );
  console.log(`Wrote ${ids.length} cards (${failed} failed) to ${dir}`);
}

await main();
