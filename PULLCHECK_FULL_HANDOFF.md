# PullCheck: full handoff

Written 2026-10-11 from the cloud session on branch `claude/pull-check-handoff-ndgs7y` (identical to `main`, 89 commits, about 400 tracked files, about 106k lines). This file consolidates `HANDOFF.md`, `SCANNER_ARCHITECTURE.md`, `AGENTS.md` and `assets/ATTRIBUTION.md`. Those four stay the source of truth for detail. Read this first, then dive into them.

## 1. What it is

PullCheck is a trading card collection and price app. The core is Pokémon, with Magic, Yu-Gi-Oh! and Lorcana added later. It is an Expo / React Native app (Expo SDK 57, RN 0.86.3, React 19.2.3, Expo Router, TypeScript 6) with a dark default look called Frutiger Aero. The owner tests only in Expo Go on an iPhone and develops on Windows PowerShell. Cloud Claude sessions work in parallel on the same repo.

What it does:
- **Collection**: rows, grid and 3D coverflow views. Search, Sort & filter, a value chart, change per item over 24h/7d/30d/since added/vs paid, widgets (Recently added, Quick stats, Top cards, Your games, Most valuable), CSV export, backup/restore, Collectr/TCGplayer CSV import.
- **Scan**: camera auto scan that recognizes a card by its picture on the phone, then shows an "Is this it?" preview with price and a one-tap add. Also a shutter, Photos picker and a barcode scanner for sealed products.
- **Search**: Pokémon (pokemontcg.io + TCGdex + TCGCSV), Japanese sets, sealed products, and the other three games. Each game has a search home, set lists and set pages with owned/missing progress.
- **Card page**: prices, variants, graded eBay prices, price history, other versions and languages, gameplay text, legality, 3D viewer with rarity-specific foils.
- **Extras**: Pull (pack opening with possible pulls and a reveal), Binders (3D cover plus 9-pocket pages with hold-and-drag), Trade checker, Wishlist, Upcoming sets, Centering checker and "Should I grade it?", Themes, an arrangeable "board" layout on most screens, and a welcome tour.

## 2. House rules (follow these exactly)

1. **Expo Go only.** No library with native code that Expo Go doesn't bundle. No dev build, no Mac. The "development build" advice in `AGENTS.md` does not apply.
2. **No comments in code.** This is also the owner's standing preference. One component per file. All network calls in `src/services`. Every screen has loading, empty and error states.
3. **Expo has changed.** Read the `expo` major version in `package.json` (57), then use `https://docs.expo.dev/versions/v57.0.0/` or `https://docs.expo.dev/llms.txt`. Don't write Expo/EAS/RN API code from memory.
4. Add packages with `npx expo install <pkg>`, never plain `npm install`.
5. Windows PowerShell blocks `.ps1` shims, so give the owner `npx.cmd` / `npm.cmd` commands.
6. Run `npx expo lint` and `npx tsc --noEmit` before calling anything done.
7. Parallel sessions exist. `git fetch` and check `claude/*` branches before starting. Merge finished work into `main`.
8. `ios/` and `android/` don't exist (Continuous Native Generation). Never hand-create them. Configure via `app.json` and config plugins.
9. Paths use the `@/` alias to `src/`. Routes live in `src/app/`, with typed routes on.
10. Only commit or open PRs when asked. Do not push to a branch other than the one the session assigns.

## 3. Setup and commands

```
npm.cmd install              # or npm install
npx expo start               # dev server, scan the QR in Expo Go
npx expo start --tunnel      # when the phone can't reach the PC
npx expo lint
npx tsc --noEmit
```

`node_modules` is not installed in the cloud checkout. Run `npm install` before lint or typecheck.

Environment (`.env.example`, real values in untracked `.env.local`):

| Variable | Used for |
| --- | --- |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL` | `/api/identify` server fallback that reads a card photo with a free vision model |
| `ANTHROPIC_API_KEY` | Alternative card reader (`readCardAnthropic.ts`) |
| `CARD_READER` | Picks the reader backend |
| `POKEPRICE_API_KEY` | PokemonPriceTracker graded prices through `/api/pokeprice`. The key line must include the `POKEPRICE_API_KEY=` name, which was the cause of a past blank Graded section |
| `EXPO_PUBLIC_API_URL` | Where the app finds the API routes. Otherwise `apiBase.ts` uses the dev server host from `Constants.expoConfig.hostUri` |
| `SKIP_TCGCSV`, `GITHUB_TOKEN` | Used by the nightly scripts |

`web.output` is `server`, so `src/app/api/*+api.ts` are Expo Router API routes that run on the dev server (or a deployed web server). On a phone these only work while the dev server is up.

## 4. Architecture

### Layout
- `src/app/`: routes. Tabs: `(tabs)/index` (Collection, the app's home), `(tabs)/scan`, `(tabs)/search`. Other screens: `card/[id]`, `set/[id]`, `jpset/[id]`, `sealed/[id]`, `tcg/[game]`, `tcgset/[id]`, `binders`, `binder/[id]`, `rip`, `trade`, `wishlist`, `upcoming`, `sets`, `viewer`, `centering`, `barcode`, `backup`, `appearance`. API routes: `identify`, `pokeprice`, `scan-log`, `card-layout`, `product-art`, `product-cutout`, `product-face/[file]`.
- `src/components/`: about 190 components, one per file (the `AppNavigator`, `FloatingTabBar`, `ArrangeBoard`, `ModelViewer` family and the scanner family are the big ones).
- `src/services/`: all I/O. Data sources and domain services (see section 5).
- `src/state/`: context providers in this order: Settings → Collection → Wishlist → Rip → Binder → Celebrate → `AppNavigator`. Reducers in `collectionReducer.ts`.
- `src/hooks/`: about 50 hooks (`useAutoScan`, `useCardDetail`, `useResource` and others).
- `src/utils/`: pure logic (`collectionQuery`, `collectionChange`, `centering`, `csvImport`, `scanText`, `game`, `gameFinish`, `cardBack`, `setLogos`).
- `src/three/`: 3D card rendering with expo-gl and `@react-three/fiber` (`foilMaterial`, `cardFinish`, `cardBack`, `textures`, `models`).
- `src/server/`: server-only code for API routes (card reading, product cutouts, image geometry, rate limit).
- `src/theme/`: themes (Frutiger Aero `aero` shown as "Default", Graphite and others, custom and saved themes).
- `assets/`: card backs, game logos, Lorcana and Yu-Gi-Oh! set logos, binder art, 3D model JSON, SFX. `assets/ATTRIBUTION.md` has sources and licenses.
- `scripts/card-index/` and `scripts/price-history/`: nightly data builders.
- `tools/blender/`: Blender scripts and `.blend` for the binder art and sealed-product catalog.

### Storage (AsyncStorage keys)
`pullcheck.settings.v1`, `pullcheck.collection.v1`, `pullcheck.rip.v1`, `pullcheck.wishlist.v1`, `pullcheck.binders.v1`, `pullcheck.snapshots.v1`, `pullcheck.recent.v1`, `pullcheck.market.v1`. Never persist `require()` numbers (bundled image asset ids). `DESIGN_VERSION` 3 switched existing installs to the Aero theme once.

### Card ids
- Pokémon: pokemontcg.io ids (`sv1-45`). Scanned cards are mapped from TCGdex to these by `dexToCard()`. When mapping fails, the id is `dex-<lang>-<tcgdex id>`, and `getCard`, `getSetCards` and refresh route those back to TCGdex.
- Magic `mtg-…`, Yu-Gi-Oh! `ygo-<passcode>~<set code>~<rarity code>[@lang]`, Lorcana `lor-…`. Sets are `<prefix>set-<code>`. `services/otherGames.ts` dispatches by prefix, and `getCard`, `enrichCardPrices` and `fetchCardsByIds` go through it.

## 5. External data sources and their quirks

| Source | Use | Gotchas |
| --- | --- | --- |
| api.pokemontcg.io | Pokémon cards and sets | Returns 5xx about half the time. `services/http.ts` retries. Keep that. |
| TCGdex (`/v2/en`, `/v2/ja`) | Scan matching, images, localized names, fallback prices | 24 h cache for sets. Some cards have no image. |
| TCGCSV (tcgplayer mirror) | Daily prices, sealed products, Japanese products | Rejects library user agents (sends `PullCheck/1.0`). No CORS. Its WAF blocks the caller's IP for about 20 minutes after bursts, so batch 3 requests at a time. Data updates once a day. Its price archive is offline, so history builds forward only from 2026-10-06. |
| PokemonPriceTracker | Graded eBay prices | Free plan has 100 credits/day, 3 days of history, TCGplayer numeric ids only. The dev server caches in `.cache/pokeprice` for 3 days and stops after a 429 until the reset. |
| Scryfall | Magic | Free, no key. Serves an HTML 404 for set symbols it hasn't drawn, so anything not starting with `<svg` falls back to the set code. |
| YGOPRODeck | Yu-Gi-Oh! | `set_price` is `0` on every printing since 2023 and many older ones. See open questions. |
| Lorcast | Lorcana | Needs `unique=prints` for all printings. Images are AVIF. |
| jsDelivr | Card index, OCR engine, price history, product art manifest | 7-day max-age once left a phone on an old index. Use `cache: 'no-store'` plus an `at=` query. |
| github.com/1niceroli/ptcg-assets | Official transparent product renders and Japanese set logos | No license file. Ask the owner before shipping. |
| OpenRouter free vision models | `/api/identify` last-resort scan | Free `:free` image models go paid or vanish without warning. Re-check `openrouter.ai/api/v1/models` if server scanning breaks. |

Nightly GitHub workflows publish to orphan branches:
- `card-index` (09:17 UTC daily, plus on matcher changes): picture index `v1/meta.json` and `v1/vectors.bin` (about 29.8k cards, 190 int8 numbers each). Also `assets.json` mapping sets to product renders.
- `price-history` (21:43 UTC daily): daily price snapshots read by `services/priceHistory.ts`.

## 6. The scanner (most complex area)

Full design is in `SCANNER_ARCHITECTURE.md`. Summary:

- **Expo Go constraint**: no frame processors or ML Kit. Frames come from `takePictureAsync({ shutterSound: false })` about once a second. OCR is `tesseract.js` (WASM) inside a hidden `react-native-webview`. Camera autofocus is `autofocus="off"`, which on iOS means continuous autofocus.
- **Picture matching** (`services/cardVisionSource.ts`, a plain-JS module shipped as a string). The same code runs on the phone and in the Node index builder, so fingerprints agree. Steps: locate card (edge scoring plus border-strip check), perspective flatten to 64×88, 190-number DCT fingerprint, dot product against the index (about 15 ms), close-up grayscale check against TCGdex `low.webp` for the top 6, then confidence rules in `services/visionMatch.ts` (`sure` / `maybe` / `none`).
- **Changing the fingerprint math means bumping `CARD_VISION_VERSION`** so old app builds keep reading the old index folder.
- **Frame loop** (`hooks/useAutoScan.ts`): picture first, then the number-reading OCR path for `maybe`. Nothing is ever added without a tap.
- **Number parsing** in `utils/scanText.ts` (regex, OCR lookalike fixes, fuzzy name scoring, no `String.normalize`).
- **Database matching** in `services/scanMatch.ts` and `services/tcgdex.ts`.
- **Centering checker** reuses the locator, refines edges at full resolution, warps to 630×880 and picks one consistent border plateau per side. PSA caps in `utils/centering.ts`: 10 is safe at 55/45 and gray up to 60/40, 9 is 60–65, 8 is 65–70, 7 is 70–75.
- **Measured**: on 400 synthetic phone shots, 91% right first try (98.3% right or same-art reprint), 0 wrong matches in 1,800 trials. 8% of cards missing from the index got a confident wrong guess, which is why the UI asks "Is this it?".
- **Real-device data**: in dev, `logScan` posts frames to `/api/scan-log`, which writes `scan-log/` (gitignored, newest 800 files kept). Use these to tune thresholds.
- **Tunables if the phone disagrees**: `BOTTOM_BANDS`, `NAME_BAND`, `AGREEMENT`, `STEP_PAUSE_MS` in `useAutoScan.ts`; `FRAME_WIDTH`, `FRAME_QUALITY` in `scanImage.ts`; `NAME_CONFIRMED` in `scanMatch.ts`.

## 7. Feature notes worth knowing before editing

- **Arranging boards**: `components/ArrangeBoard.tsx` drives the Collection page, card, sealed, set header and each search home. Sections use a normal flex-wrap flow so they cannot overlap (an earlier absolute "FreeBoard" piled up on phones). Hold 600 ms (150 ms in edit mode) to wiggle and drag. It never refuses the responder (that causes a ScrollView error). Saved `BoardItem` uses `{x, w, y}`: y orders, w < 0.75 means half width, old `hs` is ignored.
- **Sets wiggle**: `hooks/useSetArrange.ts` and `SetArrangeRow.tsx`, order saved per section in `settings.setOrder`. Off while searching. Japanese sets aren't covered.
- **Binders**: cover plus 9-pocket pages, one blank page always at the end, turned by a PanResponder (a ScrollView pager broke stacking on web). Art rendered by `tools/blender/binder.py` (`python -I tools/blender/binder.py <outdir> hero|front|glb`, bpy 5.2, Cycles CPU), then converted to WebP.
- **Card swiping**: list screens call `setBrowseList` before opening a card. The card page swaps cards with `router.setParams`, and `card/[id]` sets `fullScreenGestureEnabled: false`.
- **Add celebration**: `useCelebrate().celebrate({ image, amount, from })` flies the card to the Collection tab. Pass an image URL already on screen so it's cached.
- **New tags and Undo**: `seenAt` on items, `showsNewTag` logic, `services/seen.ts`. Removed items stay in `removed` for 6 s for Undo.
- **Foils**: `three/cardFinish.ts` maps rarity to a finish and the set's era picks the pattern. `foilMaterial.ts` holds a `LOOKS` table. Other games use `utils/gameFinish.ts`.
- **Product art chain**: official render → dev-server cutout → TCGplayer photo (`ProductImage`).
- **Other games**: Magic has every Scryfall language, Yu-Gi-Oh! has fr/de/it/pt, Lorcana English only. Backs via `utils/cardBack.ts` (`assets/card-back-ygo.jpg`, `card-back-ygo-ocg.jpg`, plain for Lorcana). Set logos bundled in `assets/lorcana-sets` and `assets/yugioh-sets`, mapped in `utils/lorcanaSetLogos.ts` and `utils/yugiohSetLogos.ts` behind `bundledSetLogo(game, code)`.
- **Web caveats**: the 3D viewer can't load YGOPRODeck or Lorcast images on web (no CORS). The OCR host has a `.web.tsx` iframe version so the scanner runs in the web preview.

## 8. Known gotchas

- Metro forces `three` to `three.module.js` (`metro.config.js`) because the CJS build crashes RN.
- Avoid `String.normalize` (Hermes Intl).
- RN 0.86 has no `StyleSheet.absoluteFillObject`. Use `absoluteFill`.
- expo-image's iOS SVG decoder mis-draws arcs with packed flags, so Magic set symbols are drawn with `react-native-svg` (`SvgXml`) with black swapped for `currentColor`.
- Don't remove the retry in `services/http.ts`.
- The default Expo template advice in `AGENTS.md` about dev builds and EAS is generic. This project is Expo Go only.

## 9. Open items and unverified work

Not yet checked on a physical iPhone:
1. Whole scanner on device: WKWebView + tesseract, real `takePictureAsync` timing, focus and glare. Picture matching was only verified on web with a fake camera.
2. Centering checker on a real phone photo.
3. Magic set symbols draw and tint in the Sets list and set header.
4. Lorcana 3D viewer (AVIF downloaded to a `.png` path for expo-gl, iOS 16+ should decode it).
5. Yu-Gi-Oh! 3D viewer shows the new back, and logo chips look right in light and dark themes.
6. Reverse holo auto-detect (`foilDrift` / `looksReverseHolo`) thresholds are guesses until real frames are logged.

Open decisions and gaps:
- **Yu-Gi-Oh! pricing**: add TCGCSV per-printing prices (category 2, one products + prices pair per set, batches of 3), hide the cheapest-version fallback on printings, or leave it. Today the Yu-Gi-Oh! search home shows only New sets and "Your games" shows Yu-Gi-Oh! at $0.00 because most printings have no price.
- Scanner, sealed, Pull and binder set fill don't cover the three newer games.
- Japanese Yu-Gi-Oh! (OCG) isn't in any free API.
- No Lorcana card back (every source is unlicensed or fair use).
- Unlicensed assets shipped with the owner's approval (2026-10-07): Lorcana and Yu-Gi-Oh! logos. Japanese set logos from `ptcg-assets` need the owner's sign-off before any public release.
- "Heating up" needs 2+ days of collector data.
- Optional future: if the app moves to a dev build, swap `OcrHost` for an ML Kit / Vision frame processor behind the same `OcrHandle` interface (`load(image)`, `read(region, width)`).

## 10. Git state

- Remote branches: `main` and `claude/pull-check-handoff-ndgs7y`, which is identical to `main` (0 ahead, 0 behind). Latest commit: `63eacc1 Add Lorcana game logo plus Lorcana and Yu-Gi-Oh! set logos`.
- Older notes mention a local `expo-app` branch and a remote `pc` on the owner's PC. Check there before assuming `main` is the whole story.
- Recent history, newest first: other-game logos; AVIF/WebP to PNG conversion for the 3D viewer; Yu-Gi-Oh! backs and live API fixes; set pages, languages, foils and widgets for Magic/Yu-Gi-Oh!/Lorcana; card search for those games; tidy wiggle arranging; booster box 3D model; virtual binder; whole-page arranging and undo; welcome tour; swipe between cards; Aero theme; foils per rarity; centering and grade calculator; backup and import; scanner picture matching.

## 11. Suggested first steps for the next agent

1. `git fetch --all`, check `claude/*` branches and the `pc` remote.
2. Read `AGENTS.md`, `HANDOFF.md`, then `SCANNER_ARCHITECTURE.md` if touching scan or centering.
3. `npm install`, then `npx tsc --noEmit` and `npx expo lint` to get a baseline.
4. Pick from section 9. The most valuable unblocked item is deciding the Yu-Gi-Oh! pricing question with the owner. Everything else needs the owner's iPhone.
5. Keep commits small, follow the no-comments rule, and update `HANDOFF.md` when you finish something others need to know about.
