import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2] ?? 'card-index';
const REPO = '1niceroli/ptcg-assets';
const BRANCH = 'main';
const UA = 'PullCheck/1.0 (card-index; github.com/b08007621-wq/pullcheck)';
const IMAGE = /\.(png|webp|jpe?g|avif)$/i;
const ROW = /^\|\s*([A-Za-z0-9_.-]+)\s*\|\s*([a-z]{2})\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/;

async function get(url, read) {
  const headers = { 'User-Agent': UA };
  if (process.env.GITHUB_TOKEN && url.startsWith('https://api.github.com/')) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await fetch(url, { headers }).catch(() => null);
    if (response?.ok) return read(response);
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }
  throw new Error(`Failed ${url}`);
}

async function main() {
  const [tree, readme] = await Promise.all([
    get(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`, (response) => response.json()),
    get(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/README.md`, (response) => response.text()),
  ]);

  const files = new Map();
  for (const entry of tree.tree ?? []) {
    if (entry.type !== 'blob' || !IMAGE.test(entry.path)) continue;
    const split = entry.path.indexOf('/');
    if (split < 0) continue;
    const id = entry.path.slice(0, split);
    const rest = entry.path.slice(split + 1);
    if (rest.startsWith('promo/') || rest.startsWith('_')) continue;
    if (!files.has(id)) files.set(id, []);
    files.get(id).push(rest);
  }

  const sets = [];
  for (const line of readme.split('\n')) {
    const row = ROW.exec(line.trim());
    if (!row || row[1] === 'ID' || /^-+$/.test(row[1])) continue;
    const [, id, lang, name, series] = row;
    const list = files.get(id);
    if (!list) continue;
    sets.push({ id, lang, name, series, files: list.sort() });
  }

  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(
    path.join(OUT, 'assets.json'),
    JSON.stringify({ built: new Date().toISOString(), base: `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/`, sets }),
  );
  console.log(`Wrote ${sets.length} sets, ${sets.reduce((sum, set) => sum + set.files.length, 0)} files`);
}

await main();
