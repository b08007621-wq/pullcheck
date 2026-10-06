# PullCheck handoff (from cloud session, 2026-10-06)

All work is merged into the `claude/sharp-curie-y20pyw` branch on GitHub (remote `pc` on the local PC).

## Open items
- Graded section not showing. Check `http://localhost:8081/api/pokeprice?id=517045` with the dev server running.
  - `not_configured` → add `POKEPRICE_API_KEY` to `.env.local` and restart.
  - Returns data with `ebay` → server works; debug card → TCGplayer product lookup in `src/hooks/useGradedPrices.ts` / `locateTcgProduct` in `src/services/cardPrices.ts`.
- Daily price collector (`.github/workflows/price-history.yml` + `scripts/price-history/collect.mjs`) only runs on schedule from the default branch `main`. Copy both files to `main` so it runs nightly. It publishes to the `price-history` branch, read by `src/services/priceHistory.ts` via jsDelivr.
- "Heating up" needs 2+ days of collector data (or fresh Cardmarket averages).
- PokemonPriceTracker free plan: no history (3 days max), 100 credits/day, TCGplayer numeric ids only. Used for graded eBay prices only via `src/app/api/pokeprice+api.ts`.
- TCGCSV price archive is offline; history only builds forward from 2026-10-06.
- Japanese set logos come from github.com/1niceroli/ptcg-assets (no license file — ask the owner before shipping).

## Built this session
Rising fallback + history, sealed cutouts, floating swipeable tab bar, binders, rows/grid/3D collection views (remembered), upcoming sets, trade checker, barcode scanner, Japanese set pages + logos + foils, cross-language versions, graded copies, value chart with movers, market charts, search homes for JP/sealed, saved themes, background textures, Pull (pack opening) with possible pulls, scanner continuous autofocus.

Run `npx expo lint` and `npx tsc --noEmit` before finishing any change.
