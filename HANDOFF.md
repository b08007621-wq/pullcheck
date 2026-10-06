# PullCheck handoff (from cloud session, 2026-10-06)

`main` is the current branch on GitHub (remote `pc` on the local PC). Local work happens on `expo-app` and is pushed to both.

## Open items
- Graded section: fixed 2026-10-06 (the key line in `.env.local` was missing its `POKEPRICE_API_KEY=` name). Check `http://localhost:8081/api/pokeprice?id=517045` if it goes blank again.
- Daily price collector (`.github/workflows/price-history.yml` + `scripts/price-history/collect.mjs`) is on `main` since 2026-10-06 and runs nightly at 21:43 UTC. It publishes to the `price-history` branch, read by `src/services/priceHistory.ts` via jsDelivr.
- Scanner: picture matching + close-up check on the phone, "Is this it?" preview with Not it / Yes, add. Design in `SCANNER_ARCHITECTURE.md`. Real iPhone frames land in `scan-log/` while the dev server runs; check them before tuning.
- Collection page (Oct 6): search, Sort & filter sheet (`utils/collectionQuery.ts`), long-press quick actions (`ItemActionsSheet`), Recently added, Quick stats, CSV export, "Just pulled" panel after a pack. Per-item change for 24h/7d/30d/since added/vs paid (`utils/collectionChange.ts`) in rows, grid and 3D. The Customize sheet saves `settings.collectionLayout` (section order and visibility, grid columns, names, change basis). Graded items only compare against price paid.
- Add celebration: `CelebrateProvider` overlay + `useCelebrate().celebrate({ image, amount, from })`. The card flies to the Collection tab, which bounces with "+N". It's used by the scan preview and sheet and the card and sealed pages. Pass the image URL the screen is already showing so it's cached. The Pull save plays `PackCollectOverlay`, then `showFresh` feeds the collection's Just pulled panel.
- Graded prices: the dev server caches PokemonPriceTracker answers in `.cache/pokeprice` for 3 days and stops calling after a daily-limit 429 until the reset. The app caches for 3 days too, and the card page says when graded prices are paused (free plan = 100 lookups/day).
- Product art: official transparent renders from github.com/1niceroli/ptcg-assets (booster boxes, ETBs, bundles, packs, mini tins, collections) via `src/services/productAssets.ts`. The nightly `card-index` workflow publishes `assets.json` (set → files, from the repo tree + README tables) to the `card-index` branch. `ProductImage` uses render → dev-server cutout → TCGplayer photo.
- "Heating up" needs 2+ days of collector data (or fresh Cardmarket averages).
- PokemonPriceTracker free plan: no history (3 days max), 100 credits/day, TCGplayer numeric ids only. Used for graded eBay prices only via `src/app/api/pokeprice+api.ts`.
- TCGCSV price archive is offline; history only builds forward from 2026-10-06.
- Japanese set logos come from github.com/1niceroli/ptcg-assets (no license file — ask the owner before shipping).

## Built this session
Rising fallback + history, sealed cutouts, floating swipeable tab bar, binders, rows/grid/3D collection views (remembered), upcoming sets, trade checker, barcode scanner, Japanese set pages + logos + foils, cross-language versions, graded copies, value chart with movers, market charts, search homes for JP/sealed, saved themes, background textures, Pull (pack opening) with possible pulls, scanner continuous autofocus.

Run `npx expo lint` and `npx tsc --noEmit` before finishing any change.
