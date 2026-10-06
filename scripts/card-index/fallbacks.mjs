const UA = 'PullCheck/1.0 (card-index; github.com/b08007621-wq/pullcheck)';
const PTCG_DATA = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master';
const TCGCSV = 'https://tcgcsv.com/tcgplayer';
const CATEGORIES = { en: 3, ja: 85 };
const PAUSE_MS = 400;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': UA } });
      if (response.status === 404) return null;
      if (response.ok) return await response.json();
    } catch {}
    await wait(attempt * 2000);
  }
  return null;
}

const code = (value) => (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const words = (value) => (value ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

function sameNumber(first, second) {
  const strip = (value) => String(value ?? '').split('/')[0].trim().toUpperCase().replace(/^([A-Z-]*)0+(?=\d)/, '$1');
  return strip(first) !== '' && strip(first) === strip(second);
}

function setOf(card) {
  return card.id.slice(0, card.id.lastIndexOf('-'));
}

function localOf(card) {
  return card.id.slice(card.id.lastIndexOf('-') + 1);
}

function ptcgSetId(dexId) {
  return dexId.replace(/\./g, 'pt').replace(/^sv0(\d)/, 'sv$1').replace(/^me0(\d)/, 'me$1');
}

async function fromPokemonTcg(missing, dexSets, found) {
  const english = missing.filter((card) => card.lang === 'en' && !found.has(card.key));
  if (english.length === 0) return;
  const sets = (await getJson(`${PTCG_DATA}/sets/en.json`)) ?? [];
  const bySet = groupBy(english, setOf);
  for (const [dexSetId, cards] of bySet) {
    const dex = dexSets.get(`en:${dexSetId}`);
    const named = dex ? sets.filter((set) => words(set.name) === words(dex.name)) : [];
    const match =
      sets.find((set) => set.id === ptcgSetId(dexSetId) || set.id === dexSetId) ??
      (named.length === 1 ? named[0] : named.find((set) => set.total === dex?.cardCount?.total));
    if (!match) continue;
    const list = (await getJson(`${PTCG_DATA}/cards/en/${match.id}.json`)) ?? [];
    for (const card of cards) {
      const hit = list.find((entry) => sameNumber(entry.number, localOf(card)));
      if (hit?.images?.small) found.set(card.key, { url: hit.images.small, source: 'pokemontcg' });
    }
    await wait(PAUSE_MS);
  }
}

async function fromTcgcsv(missing, dexSets, found) {
  for (const lang of ['en', 'ja']) {
    const cards = missing.filter((card) => card.lang === lang && !found.has(card.key));
    if (cards.length === 0) continue;
    const groups = (await getJson(`${TCGCSV}/${CATEGORIES[lang]}/groups`))?.results ?? [];
    const byAbbreviation = new Map(groups.map((group) => [code(group.abbreviation), group]));
    const bySet = groupBy(cards, setOf);
    for (const [dexSetId, setCards] of bySet) {
      const dex = dexSets.get(`${lang}:${dexSetId}`);
      const group =
        byAbbreviation.get(code(lang === 'ja' ? dexSetId : (dex?.abbreviation ?? dexSetId))) ??
        (lang === 'en' && dex?.name ? groups.find((entry) => words(entry.name).endsWith(words(dex.name))) : undefined);
      if (!group) continue;
      await wait(PAUSE_MS);
      const products = (await getJson(`${TCGCSV}/${CATEGORIES[lang]}/${group.groupId}/products`))?.results ?? [];
      for (const card of setCards) {
        const hit = products.find(
          (product) =>
            product.imageUrl &&
            !/code card/i.test(product.name) &&
            sameNumber(product.extendedData?.find((data) => data.name === 'Number')?.value, localOf(card)),
        );
        if (hit) found.set(card.key, { url: hit.imageUrl, source: 'tcgplayer' });
      }
    }
  }
}

export async function findFallbackImages(missing, dexSets, options = {}) {
  const found = new Map();
  if (missing.length === 0) return found;
  await fromPokemonTcg(missing, dexSets, found);
  if (!options.skipTcgcsv) await fromTcgcsv(missing, dexSets, found);
  return found;
}

export async function loadDexSets(languages) {
  const sets = new Map();
  for (const lang of languages) {
    const list = (await getJson(`https://api.tcgdex.net/v2/${lang}/sets`)) ?? [];
    for (const set of list) sets.set(`${lang}:${set.id}`, set);
  }
  return sets;
}

export async function addAbbreviations(dexSets, keys) {
  for (const key of keys) {
    const set = dexSets.get(key);
    if (!set || set.abbreviation !== undefined) continue;
    const [lang, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    const detail = await getJson(`https://api.tcgdex.net/v2/${lang}/sets/${encodeURIComponent(id)}`);
    set.abbreviation = detail?.abbreviation?.official ?? null;
  }
}

function groupBy(list, keyOf) {
  const groups = new Map();
  for (const entry of list) {
    const key = keyOf(entry);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return groups;
}
