# Scanner architecture

Auto scan recognizes a card held in the Scan frame by its picture, the way the big scanner apps do, and shows a small "Is this it?" card above the tab bar while you hold it there. The card's price shows right away, and **+** adds it in one tap. Tap the preview for the full sheet (versions, languages, binders). Move the card away and the preview fades 2 seconds after the scanner last saw it. Everything except the TCGdex card lookup runs on the phone, and none of it costs money.

Reading the printed number (OCR) is now the tie-breaker between printings that share the same art, plus the fallback for cards missing from the picture index. The shutter and Photos buttons use the same on-phone matcher first. The old `/api/identify` vision server is only the last resort when the phone finds nothing.

## Constraint: Expo Go

PullCheck is tested only in Expo Go on an iPhone, with no Mac and no custom dev build. That rules out `react-native-vision-camera` frame processors and ML Kit / Apple Vision text recognition, because both need native code that Expo Go doesn't ship. The scanner is built from modules Expo Go already includes:

| Need | Used | Why |
| --- | --- | --- |
| Camera + continuous autofocus | `expo-camera` `CameraView`, `autofocus="off"` | On iOS `off` maps to `AVCaptureDevice.FocusMode.continuousAutoFocus`, so close-up cards stay sharp without tapping |
| Frames | `takePictureAsync({ shutterSound: false })` in a loop | Expo Go has no frame-processor API; silent stills at roughly one per second are enough for a card held still |
| Crop / resize | `expo-image-manipulator` | Already used by the manual flow |
| On-device OCR | `tesseract.js` 7 (WASM) inside a hidden `react-native-webview` | Hermes can't run WASM, WKWebView can. `react-native-webview` 13.16.1 is bundled in Expo Go SDK 57 |

If the app ever moves to a dev build, swap `OcrHost` for an ML Kit / Vision frame processor. The `OcrHandle` interface (`load(image)`, `read(region, width)`) stays the same.

## Picture matching (`src/services/cardVisionSource.ts`)

One plain-JS module, `PullVision`, shipped as a string. The phone runs it inside the hidden WebView, and the nightly index builder runs the exact same code in Node, so the fingerprints always agree.

1. **Find the card.** Shrink the frame to about 240 px wide, then take color Sobel gradients. Score straight-line candidates for each side (±8° tilt), keeping up to 6 peaks per side. Pick the 4-line combination with the best edge strength × card aspect (63:88) × size near the on-screen guide. Each chosen line is then refit to sub-pixel accuracy with trimmed least squares. This finds the card's outer edge even when a silver border sits on a white table.
2. **Flatten it.** Perspective-warp to 64×88 with 4×4 supersampling.
3. **Fingerprint.** YCbCr DCT coefficients for the whole card (8×8 luma + 4×4 Cb/Cr) and the art box (same again), with each block normalized and weighted. That's 190 numbers, stored as int8.
4. **Match.** Dot product against the whole index (about 15 ms for 23.5k cards). The query is described 3 ways, as found, 2.5% tighter and 3.5% looser, because TCGdex scans of some eras (HGSS, SM) are cropped slightly inside the card. Each card keeps its best score.
5. **Confidence** (`src/services/visionMatch.ts`). "Same picture" = cards whose fingerprints have cosine ≥ 0.93 with the best match (reprints, EN/JA prints of the same art). `gap` = best score minus the best score of a *different* picture.
   - **sure**: score ≥ 0.75 and gap ≥ 0.05, or score ≥ 0.70 and gap ≥ 0.02 with the same top card two frames in a row → show "Is this it?"
   - **maybe** (score ≥ 0.68): try the number reader.
   - **none**: empty frame, skip OCR entirely.
   - If the "same picture" group has more than one card, read the number to choose the printing.

Measured on 400 synthetic phone shots made from the 600 px scans (random tilt, perspective, blur up to σ 1.8 px, glare, holo rainbow, sleeve haze, fingers, wood/white/black tables, JPEG), matched against the full 23,545-card index:

| | Right on first try | Right or same-art reprint | In top 5 |
| --- | --- | --- | --- |
| Normal | 91% | 98.3% | 99% |
| Harsh (blur σ 2.6, glare 70%, cards held small) | 85% | 90% | 92% |

With the "sure" thresholds, 90% of correct matches show immediately. Over 1,800 trials, 0 wrong matches and 0 of 200 empty frames triggered, while 8% of cards missing from the index got a confident wrong guess. That last case is why the UI asks "Is this it?" instead of adding the card automatically.

### Index (`scripts/card-index/build.mjs`, `.github/workflows/card-index.yml`)

- Every TCGdex card with an image: about 19.7k English (TCG Pocket excluded) and 3.9k Japanese. Fingerprints come from each card's `low.jpg`.
- Published to the orphan branch `card-index` as `v<CARD_VISION_VERSION>/meta.json` (ids like `en:sv01-045`) plus `vectors.bin` (int8, N × 190, about 4.5 MB). It's served by jsDelivr: `cdn.jsdelivr.net/gh/b08007621-wq/pullcheck@card-index/v1/`.
- The workflow runs daily at 09:17 UTC and on pushes that touch the matcher. Each run reuses existing vectors and only downloads new cards.
- **Changing the fingerprint math means bumping `CARD_VISION_VERSION`**, so old app builds keep reading the old folder.
- The WebView caches the index in IndexedDB and refreshes it in the background after 3 days.

## Camera → OCR bridge

```
CameraView ──takePictureAsync──▶ captureScanFrame()            src/services/scanImage.ts
                                   crop = frame + 10% margin (AUTO_CROP_MARGIN)
                                   resize ≤ 1600px, JPEG 0.9, base64, temp files deleted
                                         │ data:image/jpeg;base64,…
                                         ▼
OcrHost (hidden 2×2 WebView)  ◀─injectJavaScript─  ocrBridge.ts   (request ids, timeouts)
  OCR_PAGE_HTML                ──postMessage────▶
    tesseract.js worker (eng, LSTM, PSM 6)
    pullcheckLoad(id, image)       decode once per frame
    pullcheckRead(id, rect, width) crop → upscale → grayscale + 2–98% contrast stretch → recognize
```

- `src/services/ocrPage.ts` is the page. The engine, worker and English data (~7 MB) download from jsDelivr on first use. The data is cached in IndexedDB and the HTTP cache, and cache errors fall back to downloading again.
- `src/components/OcrHost.tsx` is the native host and restarts the WebView if iOS kills its content process. `OcrHost.web.tsx` hosts the same page in a `srcdoc` iframe, so the scanner also runs in the web preview.
- Host state is `loading | ready | failed`. The Scan hint shows "Getting auto scan ready…" or "Auto scan is offline. Tap the shutter instead".

## Frame loop

`src/hooks/useAutoScan.ts` runs only while the Scan tab is focused, the camera is ready, Auto is on, no sheet or setup is open, and the manual shutter isn't in use. Each step captures one frame (1280 px wide) and runs the picture match first:

- **sure** → `guess` (the "Is this it?" preview). The same card in later frames just refreshes `seenAt`, and the preview hides `GUESS_HIDE_MS` (2 s) after the last sighting. A blurry frame whose top match is still the shown card counts as a sighting.
- **none** → nothing, no OCR.
- **maybe**, or the index isn't loaded yet → the number-reading path below.

After **+** or after the sheet closes, that card is "handled" and won't prompt again until the frame has been empty twice.

Number-reading path:

1. Capture and load one frame.
2. OCR the bottom-left strip (modern cards). If no number is found, OCR the bottom-right strip (WotC to XY era). Whichever side works becomes sticky.
3. If neither side has a number, the next frame tries another vertical band (`0.875–1.0`, `0.85–0.975`, `0.9–1.03`, `0.95–1.08`, `0.8–0.93` of the frame), because people don't line cards up perfectly. The band that works becomes sticky.
4. Once a number is found, OCR the name strip (`x 0–0.75`, `y -0.02–0.17`), shifted by the same offset as the band that worked.
5. Match (below), then decide:
   - **confirmed** (the best name score is ≥ 0.72 and clearly ahead, or the set code matches exactly and the name is ≥ 0.45): open the sheet now.
   - otherwise the same top card must win in 3 frames. The sheet then opens labeled "Best guess for 045/198 · check it's yours", with every candidate swipeable.
6. **Dedupe**: once a card has been shown, it won't show again until the frame has been empty twice in a row, so you can leave the card on the table while tapping Add. The hint changes to "Swap in the next card".

The manual shutter waits for the in-flight auto step (`whenIdle`) so the two never call `takePictureAsync` at the same time.

## Regex rules (`src/utils/scanText.ts`)

```
(?:^|[^0-9]) (TG|GG|SV|RC|SH|H)? ([0-9O][0-9OoIl|]{0,2}) \s? [/⁄] \s? (TG|GG|SV|RC|SH|H)? ([0-9OoIl|]{2,3}) (?![0-9])
```

- Covers `045/198`, `4/102`, `12/149`, `TG05/TG30` and `GG05/GG70`. OCR lookalikes `O o → 0` and `I l | → 1` are fixed, but only inside the matched digits.
- Reads are rejected when the total is under 10, the number is 0, or the number is more than `2 × total + 10`. Secret rares like `210/165` and `349/190` pass.
- Up to three tokens before the number are read as hints: language (`EN DE FR ES IT PT`, also glued like `SVIEN`) and set code (`SVI`, `PAL`, `MEG`, `SV2a`, …).
- Name similarity is fuzzy-substring Levenshtein on letters only, with accents folded by hand (no `String.normalize`, so it doesn't depend on Hermes Intl). Suffixes like ex / V / VMAX / GX are ignored.

## Database matcher (`src/services/scanMatch.ts` + `src/services/tcgdex.ts`)

1. **English, by printed total**: `/v2/en/sets` (cached 24 h). Keep sets whose `cardCount.official` equals the total; `TG`/`GG` totals only match `*tg` / `*gg` sets. TCG Pocket sets (uppercase ids such as `A1` or `B2a`) are excluded. Set details provide `abbreviation.official`, which is ranked against the OCR set code. Each set is checked with `/v2/en/sets/{set}/{number}`, trying `45` then `045`, and 404s are remembered.
2. **Japanese, by set code**: when the code equals a `/v2/ja/sets` id (`SV2a`, `M2`, …), look up `/v2/ja/sets/{id}/{number}`.
3. **Localized names**: if no English name matches, the DE and FR names are scored too, so a German Garados-ex matches Gyarados ex.
4. **Name fallback**: if every candidate scores under 0.5 on the name, search `/v2/en/cards?name=<word>&localId=<number>` using the longest words OCR read. This recovers misread totals such as `045/196`.
5. Rank by `nameScore × 2 + codeScore × 0.5`.

### Mapping to the app's card ids

The collection, Sets pages and price refresh are keyed by pokemontcg.io ids, so `dexToCard()` maps the TCGdex set to a pokemontcg set: same normalized name, then same `ptcgoCode` and total, then same release date and total, then a name prefix such as `Base` vs `Base Set`. A scanned Gyarados ex is stored as `sv1-45`, the same card you'd get from Search. When no mapping is found within 4 s, or for Japanese cards, the id is `dex-<lang>-<tcgdex id>`. `getCard`, `getSetCards` and collection refresh all route `dex-` ids back to TCGdex, so those cards still open, refresh and show their set.

TCGdex `pricing.tcgplayer` (updated daily) is converted to the app's `tcgplayer.prices` shape (`reverse-holofoil` becomes `reverseHolofoil`), and `pricing.cardmarket` to `cardmarket.prices`. The same lookup is now the last fallback in `enrichCardPrices`, for cards still priceless after TCGCSV, and supplies the TCGplayer product id for graded prices.

## Asset pipeline

- Card images: TCGdex `{image}/high.png` and `/low.png` per language (`en`, `de`, `fr`, `ja`, …). If an English card has no TCGdex image, the pokemontcg.io image is used (6 s cap).
- Japanese set logos: `github.com/1niceroli/ptcg-assets` through jsDelivr (`japaneseLogoFor`). This repo has no license file, so ask the owner before shipping. TCGdex logos are the fallback.

## Collection integration

`src/components/ScanGuess.tsx` is the "Is this it?" preview: thumbnail, name, set and number, today's price, and a round **+**. It fades and springs in over the shutter row, which fades out underneath it (`ScannerControls hidden`). **+** adds the default version, NM, or adds to the pull in Pull mode, where confirmed matches add themselves after 1.1 s. Tapping the preview opens the full sheet. The old moving scan line is gone, and the frame corners lock while a guess is showing.

`src/components/ScanResultSheet.tsx`: a modal sheet that springs up from the bottom.

- Swipe down (more than 110 px or a fast flick) or tap outside to dismiss. Swipe sideways to move between candidates (`PagerDots`).
- The image, name and set update with the EN / DE / FR pills (`LanguagePills`), using names and images from `getLocalizedCards`.
- The price comes from the TCGdex preview immediately. The Add buttons enable once the app-id card resolves.
- **Add to collection** calls `addCard(card, resolveVersion(card, defaultVersion(card)))` (default variant, NM) and fulfills any wishlist entry. **Add to binder** shows Personal / Trade / For sale, then calls `setBinder(cardKey(…), binder)`. Both write to the existing AsyncStorage-backed `CollectionProvider`; there is no new database.
- In Pull mode the primary button is **Add to pull**. Confirmed matches add themselves after 1.1 s through `useRip().addPull`, so a pack can be scanned card after card without tapping.
- Pulls of $20 or more get the `hit` haptic; everything else gets `collect`.

Auto is a persisted setting (`settings.autoScan`, default on), toggled with the **Auto** pill in the Scan header.

## Files

| File | Role |
| --- | --- |
| `src/app/(tabs)/index.tsx` | Scan screen: Auto pill, hints, `OcrHost`, `ScanResultSheet` |
| `src/hooks/useAutoScan.ts` | Frame loop, picture-first recognition, preview timing, shutter/Photos recognition |
| `src/services/cardVisionSource.ts` | Card finder + fingerprint + search (shared by the phone and the index builder) |
| `src/services/visionMatch.ts` | Confidence rules, same-art printings, number tie-break |
| `scripts/card-index/build.mjs` | Builds/updates the picture index |
| `src/components/ScanGuess.tsx` | "Is this it?" preview |
| `src/hooks/useScanCard.ts` | Candidate → app `Card`, localized names |
| `src/services/ocrPage.ts`, `ocrBridge.ts` | WebView OCR page and message bridge |
| `src/components/OcrHost.tsx`, `OcrHost.web.tsx` | Hidden OCR host (WebView / iframe) |
| `src/services/scanImage.ts` | `captureScanFrame` |
| `src/utils/scanText.ts` | Number, set code and language parsing; name scoring |
| `src/services/scanMatch.ts` | Candidate search and ranking |
| `src/services/tcgdex.ts`, `src/types/tcgdex.ts` | TCGdex API layer and conversion to `Card` |
| `src/components/ScanResultSheet.tsx`, `ScanResultBody.tsx`, `ScanResultActions.tsx`, `BinderChoice.tsx`, `LanguagePills.tsx`, `PagerDots.tsx`, `AutoScanButton.tsx` | UI |

## Verified so far, and what isn't

Picture matching, verified Oct 6 2026 on the web build with a fake camera (headless Edge + y4m):
- Gyarados ex showed "Is this it?" within a few seconds of load, including the 4.5 MB index download from jsDelivr, and faded about 3 s after the card left.
- Base Set Charizard was next.
- **+** stored `card:sv1-45|holofoil|NM`.
- Shutter with Auto off recognized a blurred, tilted Celebi V in 0.4 s with zero `/api/identify` calls.

Still not verified on an iPhone.

Earlier OCR-only checks:

Verified on Windows with the real web build in headless Edge, using a fake camera stream of card scans on a desk:

- Gyarados ex (SV), Rowlet (Perfect Order, 2026) and Base Set Charizard were matched, with prices.
- German names and images, Add to binder → Trade (checked in storage), swipe-down dismiss, dedupe, and Pull mode auto-add all worked.
- `npx tsc --noEmit`, `npx expo lint` and `npx expo export -p ios` pass.

Not verified: the iPhone itself. That means WKWebView + tesseract on device, real `takePictureAsync` timing, and focus and glare. The fake camera is 720p and only roughly as sharp as a 600 px scan, so heavy blur in that test still misread digits. Real iPhone frames are about 4× sharper.

Things to tune if the phone disagrees:

- `BOTTOM_BANDS`, `NAME_BAND`, `AGREEMENT` and `STEP_PAUSE_MS` in `useAutoScan.ts`
- `FRAME_WIDTH` and `FRAME_QUALITY` in `scanImage.ts`
- `NAME_CONFIRMED` in `scanMatch.ts`
