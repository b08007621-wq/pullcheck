# Asset attribution

Sources and licenses for images added to `assets/`. Licenses below cover copyright in the files. Logos, marks and card back designs are still trademarks of their owners and are used only to identify each game.

## Card backs

| File | Source | License |
| --- | --- | --- |
| `card-back-ygo.jpg` | Composited from [kooriookami/yugioh-card](https://github.com/kooriookami/yugioh-card), branch `master`, `src/assets/yugioh-card/yugioh-back/image/`: `card-normal.png` (1394×2031) with `konami.png` at (94,95), `register.png` at (370,114) and `logo-tcg.png` at (859,1763), the same positions as the repo's `packages/src/yugioh-back-card/index.js`. Resized to 745×1085, JPEG quality 88. | MIT, Copyright (c) 2023-present kooriookami |
| `card-back-ygo-ocg.jpg` | Same as above with `logo-ocg.png` at (878,1722). | MIT, Copyright (c) 2023-present kooriookami |

The Yu-Gi-Oh! back design, the KONAMI mark and the Yu-Gi-Oh! logos belong to Konami.

## Game logos (`assets/games/`)

The Pokémon, Magic and Yu-Gi-Oh! files come from Wikimedia Commons, rendered to PNG by Commons, trimmed to the logo's edges and resized to 256 px tall. `lorcana.png` is covered under Lorcana and Yu-Gi-Oh! logos below.

| File | Source | License |
| --- | --- | --- |
| `pokemon.png` (696×256) | [File:International Pokémon logo.svg](https://commons.wikimedia.org/wiki/File:International_Pok%C3%A9mon_logo.svg) | Public domain (text logo), trademarked |
| `mtg.png` (893×256) | [File:Magicthegathering-logo.svg](https://commons.wikimedia.org/wiki/File:Magicthegathering-logo.svg) | Public domain (text logo), trademarked |
| `yugioh.png` (731×256) | [File:Yu-Gi-Oh!.png](https://commons.wikimedia.org/wiki/File:Yu-Gi-Oh!.png) | Public domain (text logo), trademarked |

The Magic file is the classic wordmark. The 2017 logo (File:Magic the Gathering 2017.svg, also public domain) has dark lettering that disappears on the dark selected chip.

## Lorcana and Yu-Gi-Oh! logos

These are not licensed. The app owner approved shipping them on 2026-10-07 for personal use and accepts the trademark risk. The owner first asked for "halodex". halodex.com is an unrelated company page, and HoloDex (getholodex.com, a TCG app) only shows app screenshots on its site, so the owner approved the best public source instead: Ravensburger's official Disney Lorcana site and Yugipedia. Disney Lorcana, its set logos and the Lorcana Challenge mark belong to Disney and Ravensburger. The Yu-Gi-Oh! logos belong to Konami.

Every file is trimmed to its edges and resized to 256 px tall. Files that stay above libimagequant quality 85 as a 256-color palette are saved that way, and the rest stay 32-bit RGBA.

### Lorcana (`assets/games/lorcana.png`, `assets/lorcana-sets/<Lorcast code>.png`)

| File | Source |
| --- | --- |
| `games/lorcana.png` (1187×256) | Header logo of disneylorcana.com, `https://www.disneylorcana.com/_nuxt/logo-lg.DNvD6mC_.webp` (648×300). Only the gold LORCANA line is kept, because the white "Disney" and "Trading Card Game" lines disappear on light chips. |
| `1.png` | Logo cut from the product header `https://ravensburger.cloud/cms/gallery/lorcana-web/products/en_products_header_now_1920.png` (disneylorcana.com/en-US/product/the-first-chapter) |
| `2.png` | Logo cut from `https://ravensburger.cloud/cms/gallery/lorcana-web/product-s2/en_wgfytdu8ii.png` (…/product/rise-of-the-floodborn) |
| `3.png` | Logo cut from `https://ravensburger.cloud/cms/gallery/lorcana-web/product-s3/en_z6ojsofqq1_1920.png` (…/product/into-the-inklands) |
| `4.png` | Logo cut from `https://ravensburger.cloud/cms/gallery/lorcana-web/products/s4/z9qog5qlpa_en_1920w.png` (…/product/ursulas-return) |
| `5.png` | `https://ravensburger.cloud/cms/gallery/lorcana-web/products/s5/lorcana-s5-logo_en.png` |
| `6.png` | `https://ravensburger.cloud/cms/gallery/lorcana-web/products/s6/dlc_s6_logo_en.png` |
| `7.png` | `https://ravensburger.cloud/cms/gallery/lorcana-web/products/arch/logos/s7_en_j4blelafze-1.png` |
| `8.png` | `https://ravensburger.cloud/cms/gallery/lorcana-web/products/jafar/logos/dlc_roj_en.png` |
| `9.png` | `https://ravensburger.cloud/cms/gallery/lorcana-web/products/fabled/logos/en_xdceeumyxu_v2.png` |
| `10.png` | `https://ravensburger.cloud/cms/gallery/lorcana-web/products/s10/logos/dlc_s10_logos_en.png` |
| `11.png` | `https://ravensburger.cloud/cms/gallery/lorcana-web/products/s11-winterspell/en/dlc_s11_logo_en.png` |
| `12.png` | `https://ravensburger.cloud/cms/gallery/lorcana-web/products/s12-wild-unknown/en/dlc_s12_logo_en.png` |
| `13.png` | `https://ravensburger.cloud/cms/gallery/lorcana-web/products/s13-attack-of-the-vine/heroes-logos-and-backgrounds/dlc_s13_logo_en.png` |
| `14.png` | `https://ravensburger.cloud/cms/gallery/lorcana-web/products/s14-hyperia-city/en/whtzuxaqg5_en.png` |
| `Q3.png` | `https://ravensburger.cloud/cms/gallery/lorcana-web/products/iq3-great-hunny-rescue/logo/en_gosdhfht9u.png` |
| `cp.png`, `C2.png` | Disney Lorcana Challenge logo, `https://ravensburger.cloud/cms/gallery/lorcana-web/play/challenge/us5oldsjaa_hero.png` (disneylorcana.com/en-US/play/lorcana-challenge) |

For sets 1–4, the logo is the part of the product header below the art panel. The art and the "Out now"/release-date badge were removed by connected-component labelling on the alpha channel. The rest of Lorcast's sets (P1–P4, D23, DIS, CC1, Coconut, PD1) have no official logo, so they show their code.

### Yu-Gi-Oh! (`assets/yugioh-sets/<set code>.png`)

60 sets, each from Yugipedia's `File:<CODE>-LogoEN.png` (`https://yugipedia.com/wiki/File:<CODE>-LogoEN.png`, tagged fair use there). Codes are YGOPRODeck `set_code`s: 2018 2019 ABYR AGOV ALIN BACH BLVO BODE BOSH BPRO CBLZ CHIM CIBR CORE COTD CROS CYAC CYHO DABL DAMA DANE DIFO DOCS DOOD DUAD DUEA DUNE ETCO EXFO FLOD IGAS INFO INOV JOTL LEDE LIOV LTGY LVAL NECH PHHY PHNI PHRA POTE PRIO RATE REDU RIRA ROTA ROTD SAST SBLS SBSC SBTK SECE SHSP SHVI SOFU SUDA TDIL ZDC1.

Yugipedia has no `-LogoEN`/`-LogoNA`/`-LogoEU`/`-LogoTCG`/`-Logo` file for the other 584 codes (checked 2026-10-07). Those sets keep YGOPRODeck's `set_image` pack art or their code. Opaque white, brown or maroon backgrounds (BOSH CBLZ CHIM CYHO DANE DOCS ETCO FLOD IGAS PHHY PHRA RATE REDU RIRA ROTD SAST SBLS SBSC SBTK SOFU ZDC1) were removed from the edges in, with color-to-alpha on a 3 px edge band. Skipped: `GLD1` (logo sits on a photo) and `2020` (the file is the World Championship 2020 logo, but YGOPRODeck's `2020` is the KC Grand Tournament prize card).

## Left out

- **Lorcana card back.** No source licenses it for shipping. Wikipedia's `File:Lorcana Card Back.png` (260×362) is non-free fair use. The Ravensburger "Community Code" that Lorcast links to is a conduct policy, not an asset license, and the Zebra Partners press kit link now redirects to disneylorcana.com. Lorcana keeps `card-back-plain.jpg`.
