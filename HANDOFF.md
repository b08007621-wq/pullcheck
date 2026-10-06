# PullCheck handoff (from cloud session, 2026-10-06)

`main` is the current branch on GitHub (remote `pc` on the local PC). Local work happens on `expo-app` and is pushed to both.

## Open items
- Graded section: fixed 2026-10-06 (the key line in `.env.local` was missing its `POKEPRICE_API_KEY=` name). Check `http://localhost:8081/api/pokeprice?id=517045` if it goes blank again.
- Daily price collector (`.github/workflows/price-history.yml` + `scripts/price-history/collect.mjs`) is on `main` since 2026-10-06 and runs nightly at 21:43 UTC. It publishes to the `price-history` branch, read by `src/services/priceHistory.ts` via jsDelivr.
- Scanner: picture matching + close-up check on the phone, "Is this it?" preview with Not it / Yes, add. Design in `SCANNER_ARCHITECTURE.md`. Real iPhone frames land in `scan-log/` while the dev server runs; check them before tuning.
- Product art: official transparent renders from github.com/1niceroli/ptcg-assets (booster boxes, ETBs, bundles, packs, mini tins, collections) via `src/services/productAssets.ts`. The nightly `card-index` workflow publishes `assets.json` (set → files, from the repo tree + README tables) to the `card-index` branch. `ProductImage` uses render → dev-server cutout → TCGplayer photo.
- "Heating up" needs 2+ days of collector data (or fresh Cardmarket averages).
- PokemonPriceTracker free plan: no history (3 days max), 100 credits/day, TCGplayer numeric ids only. Used for graded eBay prices only via `src/app/api/pokeprice+api.ts`.
- TCGCSV price archive is offline; history only builds forward from 2026-10-06.
- Japanese set logos come from github.com/1niceroli/ptcg-assets (no license file — ask the owner before shipping).

## Built this session
Rising fallback + history, sealed cutouts, floating swipeable tab bar, binders, rows/grid/3D collection views (remembered), upcoming sets, trade checker, barcode scanner, Japanese set pages + logos + foils, cross-language versions, graded copies, value chart with movers, market charts, search homes for JP/sealed, saved themes, background textures, Pull (pack opening) with possible pulls, scanner continuous autofocus.

Run `npx expo lint` and `npx tsc --noEmit` before finishing any change.
