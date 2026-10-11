# PullCheck: xtool (Swift) port handoff

This is the Expo/React Native handoff (`PULLCHECK_FULL_HANDOFF.md`) translated for rebuilding PullCheck as a native Swift iOS app with [xtool](https://github.com/xtool-org/xtool). Read the full handoff for the product detail. This file says what changes when the target is Swift and xtool instead of Expo Go.

I only checked the xtool GitHub landing page. Install steps, `xtool.yml` options and what resources or entitlements xtool supports are not verified here. Confirm them against xtool.sh/documentation/xtooldocs (installation-linux, installation-macos) and the first-app tutorial at xtool.sh/tutorials/xtooldocs/first-app before relying on them.

## 1. What xtool is

- A cross-platform (Linux, WSL, macOS) CLI that builds a SwiftPM package into an iOS app, signs it, and installs it on a device, with no Xcode or Mac needed.
- Subcommands: `setup`, `auth` (Apple Developer Services login), `sdk` (manages the Darwin Swift SDK), `new` (create a SwiftPM project), `dev` (build and run), `ds`, `devices`, `install`, `uninstall`, `launch`. Use `xtool help <subcommand>`.
- The app is a normal SwiftPM package (`Package.swift`) plus an xtool config file. Use SwiftUI, not storyboards or Interface Builder.
- The owner is on Windows, so the route is WSL2 with the Linux install guide, then an iPhone over USB.

Typical loop (verify exact flags in the docs):
```
xtool setup
xtool new PullCheck
cd PullCheck
xtool dev
```

## 2. What this changes versus the Expo app

| Expo app rule | In Swift/xtool |
| --- | --- |
| Expo Go only, no native code | Gone. Any Swift or system framework is fair game. Third-party SwiftPM packages must build for iOS on Linux. |
| Fast refresh, QR code | Rebuild and reinstall with `xtool dev`. Expect a slower loop. |
| `app.json` plugins and permissions | Info.plist keys: camera and photo library usage strings from `app.json` (`"PullCheck uses your camera to scan Pokémon cards…"`, `"PullCheck lets you pick a photo of a card…"`). |
| Dev-server API routes (`src/app/api`) | No dev server on the phone. Anything server-side must move on-device or to a deployed service. |
| Free Apple ID signing | Sideload signing expires (typically 7 days with a free account). Plan for re-signing. |

House rules that still apply: no comments in code, one type per file, all networking in one services layer, loading, empty and error states on every screen, and give the owner Windows-friendly commands.

## 3. Suggested Swift package layout

```
PullCheck/
  Package.swift
  xtool.yml
  Sources/PullCheck/
    App/            PullCheckApp.swift, RootTabView.swift
    Models/         Card, GameSet, CollectionItem, Binder, Pull, Wish, Settings
    Services/       PokemonTCGClient, TCGdexClient, TCGCSVClient, ScryfallClient,
                    YGOProDeckClient, LorcastClient, PriceHistoryClient,
                    PokePriceClient, HTTP (retry)
    Store/          CollectionStore, SettingsStore, BinderStore, RipStore, WishlistStore
    Scan/           CameraSession, CardLocator, Fingerprint, IndexMatcher,
                    NumberReader, ScanCoordinator
    Views/          Collection, Scan, Search, CardDetail, SetDetail, Sealed,
                    Binders, Pull, Trade, Wishlist, Upcoming, Centering, Backup, Appearance
    Rendering/      CardFoil, Card3D (SceneKit or Metal), Theme
  Resources/        card backs, game logos, set logos, binder art, SFX
```

## 4. Concept-by-concept translation

| Expo / RN | Swift |
| --- | --- |
| Expo Router tabs `(tabs)/index, scan, search` | `TabView` with Collection, Scan, Search. Collection is the home tab. |
| Stack routes (`card/[id]`, `set/[id]`, …) | `NavigationStack` with typed `navigationDestination` values |
| Context providers (Settings → Collection → Wishlist → Rip → Binder → Celebrate) | `@Observable` stores injected with `.environment(...)` in the same order |
| AsyncStorage keys `pullcheck.*.v1` | Codable JSON files in Application Support, same `v1` names. Keep the JSON shape so the existing backup JSON and CSV import still work. |
| `services/http.ts` retry | A single `URLSession` wrapper with retry and backoff (pokemontcg.io fails with 5xx about half the time) |
| `expo-camera` stills loop | `AVCaptureSession` with `AVCapturePhotoOutput`, or `AVCaptureVideoDataOutput` for real frames (no more one-still-per-second limit) |
| tesseract.js in a hidden WebView | Apple Vision `VNRecognizeTextRequest`, if xtool's SDK exposes it. Otherwise keep the WebView approach. |
| `expo-image-manipulator` | Core Graphics / Core Image |
| `expo-image-picker` | `PhotosPicker` (PhotosUI) |
| `expo-haptics` | `UIImpactFeedbackGenerator` / `UINotificationFeedbackGenerator` |
| `expo-audio` SFX | `AVAudioPlayer` |
| `expo-linear-gradient`, blur, glass | SwiftUI gradients, `.ultraThinMaterial`; Liquid Glass on iOS 26 if the SDK supports it |
| `react-native-svg` set symbols | Render SVG with a SwiftPM-compatible renderer, or pre-convert to PDF/PNG assets |
| `expo-gl` + three.js 3D card | SceneKit (or RealityKit/Metal) with a custom shader for foils |
| `expo-document-picker` and share sheet | `fileImporter` and `ShareLink` |
| react-native `PanResponder` and hold-to-wiggle arranging | SwiftUI `LongPressGesture` + `DragGesture`, with `LazyVGrid` or a custom `Layout` |
| `UndoToast`, `CelebrateProvider` fly-to-tab | Overlay view with `matchedGeometryEffect` or a manual animation |

## 5. What to port first (in value order)

1. **Models + storage + services.** Card, collection item, and the Pokémon, TCGdex and TCGCSV clients. This is the foundation and is independent of UI.
2. **Collection tab.** Rows and grid, total value, per-item change (24h/7d/30d/since added/vs paid), sort and filter, quantity, remove with undo.
3. **Search tab and card page.** Search, set lists, set pages with owned/missing, prices and variants.
4. **Scan tab.** Biggest payoff of going native, see section 6.
5. **Other games.** Scryfall, YGOPRODeck and Lorcast use the id prefixes `mtg-`, `ygo-`, `lor-` from the Expo app. Keep the same ids so data is portable.
6. **Binders, Pull, Trade, Wishlist, Upcoming.**
7. **Centering and grade calculator, backup/import, themes, 3D viewer and foils.**

## 6. The scanner on native

The Expo scanner is built around Expo Go limits. In Swift those limits go away, but the algorithm is still the valuable part. Port it, don't redesign it blindly.

- Algorithm (detail in `SCANNER_ARCHITECTURE.md`):
  1. Find the card outline from edge gradients, scored by edge strength, 63:88 aspect and a border-strip check.
  2. Perspective-warp to 64×88.
  3. Compute a 190-number fingerprint: DCT of luma 8×8 and chroma 4×4 over the whole card and the art box, normalized, stored as int8.
  4. Dot product against the index (about 15 ms for 23.5k cards).
  5. Close-up grayscale check against the TCGdex `low.webp` for the top 6.
  6. Apply the confidence rules (`sure` / `maybe` / `none`).
- The index is already built nightly by `scripts/card-index` and served from the `card-index` branch (`v1/meta.json`, `v1/vectors.bin`, int8, N × 190). A Swift app can download and use these as is, but **the Swift fingerprint must produce the same numbers as the JavaScript one** or matching breaks. Either port `cardVisionSource.ts` exactly and test against known vectors, or build a separate index version (new `CARD_VISION_VERSION` folder) with a Swift-compatible builder.
- Apple's frameworks can replace parts: `VNDetectRectanglesRequest` for the outline, Accelerate/vDSP for the dot product, `VNRecognizeTextRequest` for the printed number. If you use Vision for card finding, re-validate accuracy before dropping the custom locator. The measured results of the JS version are 91% right first try and 0 wrong in 1,800 trials.
- Keep the UX rule: nothing is added without a tap ("Is this it?" with Not it and Yes, add).
- Number parsing regex and name scoring are in `utils/scanText.ts`. Port them as is. Avoid locale-dependent normalization surprises when folding accents.

## 7. Data sources (unchanged)

Same endpoints and quirks as the main handoff: pokemontcg.io (retry), TCGdex, TCGCSV (needs a `PullCheck/1.0` user agent, batches of 3, WAF blocks bursts, daily data), PokemonPriceTracker (100 lookups/day, TCGplayer numeric ids), Scryfall, YGOPRODeck (many missing prices), Lorcast (`unique=prints`, AVIF images), jsDelivr for the card index, product art and price history.

Native does remove CORS problems, so the web-only workarounds for YGOPRODeck and Lorcast images are no longer needed. API keys (`POKEPRICE_API_KEY` and the vision-reader keys) must not ship inside the app. Either drop the `/api/identify` server fallback and `/api/pokeprice` caching, or host them as a small separate service.

## 8. Assets to carry over

All of `assets/` can be reused: `card-back*.jpg`, `games/` logos, `lorcana-sets/`, `yugioh-sets/`, `binder/` WebP renders and `binder.glb`, `models/*.json` sealed-product meshes, and `sfx/`. Licenses and sources are in `assets/ATTRIBUTION.md`. The Lorcana and Yu-Gi-Oh! logos are unlicensed (owner-approved for personal use), and the Japanese set logos from `ptcg-assets` need the owner's sign-off for any public release.

## 9. Things the port can't copy verbatim

- The theme system (Frutiger Aero "Default", Graphite, custom and saved themes) is React-specific styling. Recreate the tokens in `Theme.swift` from `src/theme/`.
- The arrangeable "boards" (`ArrangeBoard`) use flex-wrap flow with saved `{x, w, y}`. Rebuild with a custom SwiftUI `Layout` and keep the saved shape so layouts survive.
- Foils: the rarity-to-finish map (`three/cardFinish.ts`) and the `LOOKS` table (`foilMaterial.ts`) are data you can port. The shaders need rewriting for SceneKit/Metal.
- The Blender pipeline (`tools/blender/binder.py`) is independent of the app. Reuse the renders.

## 10. Open questions for the owner before starting

1. Free Apple ID (apps expire after about a week) or a paid developer account?
2. Replace the Expo app or build alongside it? The Expo app keeps working in Expo Go either way.
3. Is the Vision framework available through xtool's Darwin SDK on Linux, and does the Swift fingerprint need to match the existing index?
4. Should the Yu-Gi-Oh! pricing question be resolved first (TCGCSV per-printing prices)? It is the same decision in either stack.
5. Still unverified on a real iPhone in the Expo version: scanner, centering, set symbols, Lorcana and Yu-Gi-Oh! 3D. A native port should be tested on the device from day one.
