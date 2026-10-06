import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2] ?? 'history';
const UA = 'PullCheck/1.0 (price-history; github.com/b08007621-wq/pullcheck)';
const CATEGORIES = { en: 3, jp: 85 };
const EPOCH = '2024-01-01';
const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_DAYS = 120;
const KEEP_DAYS = 1100;
const CONCURRENCY = 4;

const today = Math.round((Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(EPOCH)) / DAY_MS);

async function getJson(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    if (response.status === 404) return null;
    if (response.ok) return response.json();
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }
  throw new Error(`Failed ${url}`);
}

function variantKey(subTypeName) {
  return subTypeName
    .trim()
    .split(/\s+/)
    .map((word, index) => (index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
}

function compact(points) {
  const kept = [];
  let lastWeek = null;
  for (const point of points) {
    const age = today - point[0];
    if (age > KEEP_DAYS) continue;
    if (age > DAILY_DAYS) {
      const week = Math.floor(point[0] / 7);
      if (week === lastWeek) continue;
      lastWeek = week;
    }
    kept.push(point);
  }
  return kept;
}

async function readFile(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return { start: EPOCH, series: {} };
  }
}

async function collectGroup(market, category, group) {
  const prices = await getJson(`https://tcgcsv.com/tcgplayer/${category}/${group.groupId}/prices`);
  const rows = prices?.results ?? [];
  if (rows.length === 0) return 0;
  const file = path.join(OUT, market, `${group.groupId}.json`);
  const data = await readFile(file);
  let added = 0;
  for (const row of rows) {
    const amount = row.marketPrice ?? row.midPrice ?? row.lowPrice;
    if (!amount || amount <= 0) continue;
    const product = (data.series[row.productId] ??= {});
    const key = variantKey(row.subTypeName ?? 'Normal');
    const points = (product[key] ??= []);
    const last = points[points.length - 1];
    const value = Math.round(amount * 100) / 100;
    if (last && last[0] === today) last[1] = value;
    else points.push([today, value]);
    product[key] = compact(points);
    added++;
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data));
  return added;
}

async function run() {
  const summary = {};
  for (const [market, category] of Object.entries(CATEGORIES)) {
    const groups = (await getJson(`https://tcgcsv.com/tcgplayer/${category}/groups`))?.results ?? [];
    let points = 0;
    let failed = 0;
    for (let index = 0; index < groups.length; index += CONCURRENCY) {
      const batch = groups.slice(index, index + CONCURRENCY);
      const results = await Promise.allSettled(batch.map((group) => collectGroup(market, category, group)));
      for (const result of results) {
        if (result.status === 'fulfilled') points += result.value;
        else failed++;
      }
    }
    summary[market] = { groups: groups.length, points, failed };
    console.log(market, summary[market]);
  }
  await fs.writeFile(path.join(OUT, 'meta.json'), JSON.stringify({ updated: new Date().toISOString(), day: today, summary }));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
