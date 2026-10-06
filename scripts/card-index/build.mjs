import fs from 'node:fs/promises';
import path from 'node:path';

import { CARD_VISION_JS, CARD_VISION_VERSION } from '../../src/services/cardVisionSource.ts';
import { addAbbreviations, findFallbackImages, loadDexSets } from './fallbacks.mjs';
import { decode, download, trimWhite } from './images.mjs';

const OUT = process.argv[2] ?? 'card-index';
const CACHE = process.argv[3] ?? null;
const UA = 'PullCheck/1.0 (card-index; github.com/b08007621-wq/pullcheck)';
const LANGUAGES = ['en', 'ja'];
const CONCURRENCY = 8;
const FALLBACK_CONCURRENCY = 4;
const SKIP_TCGCSV = process.env.SKIP_TCGCSV === '1';

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
      if (isDigital(lang, card.id)) continue;
      cards.push({ key: `${lang}:${card.id}`, lang, id: card.id, image: card.image ?? null });
    }
  }
  return cards;
}

async function readPrevious() {
  try {
    const meta = JSON.parse(await fs.readFile(path.join(dir, 'meta.json'), 'utf8'));
    const vectors = new Int8Array((await fs.readFile(path.join(dir, 'vectors.bin'))).buffer.slice(0));
    if (meta.dims !== vision.DIMS || meta.version !== CARD_VISION_VERSION) return { vectors: new Map(), images: {} };
    return {
      vectors: new Map(meta.ids.map((key, index) => [key, vectors.slice(index * meta.dims, (index + 1) * meta.dims)])),
      images: meta.images ?? {},
    };
  } catch {
    return { vectors: new Map(), images: {} };
  }
}

async function primaryBytes(card) {
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

async function describeAll(todo, concurrency, load) {
  const vectors = new Map();
  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < todo.length) {
      const card = todo[next++];
      try {
        const image = await load(card);
        if (image) vectors.set(card.key, vision.quantize(vision.describeReference(image)));
        else failed++;
      } catch {
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { vectors, failed };
}

async function main() {
  const cards = await listCards();
  const previous = await readPrevious();
  const vectors = new Map();
  const images = {};
  const withImage = [];
  const withoutImage = [];
  for (const card of cards) {
    const known = previous.vectors.get(card.key);
    if (known) {
      vectors.set(card.key, known);
      if (previous.images[card.key]) images[card.key] = previous.images[card.key];
    } else if (card.image) withImage.push(card);
    else withoutImage.push(card);
  }
  console.log(`${cards.length} cards, ${vectors.size} reused, ${withImage.length} new with images, ${withoutImage.length} without`);

  const primary = await describeAll(withImage, CONCURRENCY, async (card) => {
    const bytes = await primaryBytes(card);
    return bytes ? decode(bytes) : null;
  });
  for (const [key, vector] of primary.vectors) vectors.set(key, vector);

  const dexSets = await loadDexSets(LANGUAGES);
  const englishSets = [...new Set(withoutImage.filter((card) => card.lang === 'en').map((card) => `en:${card.id.slice(0, card.id.lastIndexOf('-'))}`))];
  if (!SKIP_TCGCSV) await addAbbreviations(dexSets, englishSets);
  const fallbacks = await findFallbackImages(withoutImage, dexSets, { skipTcgcsv: SKIP_TCGCSV });
  const fallbackCards = withoutImage.filter((card) => fallbacks.has(card.key));
  const sourced = await describeAll(fallbackCards, FALLBACK_CONCURRENCY, async (card) => {
    const { url, source } = fallbacks.get(card.key);
    const bytes = await download(url);
    if (!bytes) return null;
    const decoded = decode(bytes);
    return source === 'tcgplayer' ? trimWhite(decoded) : decoded;
  });
  for (const [key, vector] of sourced.vectors) {
    vectors.set(key, vector);
    images[key] = fallbacks.get(key).url;
  }
  const bySource = {};
  for (const key of sourced.vectors.keys()) {
    const source = fallbacks.get(key).source;
    bySource[source] = (bySource[source] ?? 0) + 1;
  }
  console.log(`Fallback images: ${fallbacks.size} found, ${sourced.vectors.size} described ${JSON.stringify(bySource)}, ${sourced.failed} failed`);

  const ids = cards.map((card) => card.key).filter((key) => vectors.has(key));
  const series = {};
  for (const card of cards) {
    if (!card.image) continue;
    const parts = card.image.split('/');
    series[`${card.lang}:${parts[parts.length - 2]}`] = parts[parts.length - 3];
  }
  const built = new Date().toISOString();
  const packed = new Int8Array(ids.length * vision.DIMS);
  ids.forEach((key, index) => packed.set(vectors.get(key), index * vision.DIMS));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'vectors.bin'), Buffer.from(packed.buffer));
  await fs.writeFile(
    path.join(dir, 'meta.json'),
    JSON.stringify({ version: CARD_VISION_VERSION, dims: vision.DIMS, built, series, images, ids }),
  );
  await fs.writeFile(path.join(dir, 'stamp.json'), JSON.stringify({ built, count: ids.length }));
  console.log(`Wrote ${ids.length} cards (${primary.failed} primary failed) to ${dir}`);
}

await main();
