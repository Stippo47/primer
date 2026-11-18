# Vendored files

Everything in this folder is copied unchanged from `stage0/scene/vendor/`, which took it from its official source. Nothing is loaded from the web at run time.

| File | What | Version | Source | Licence |
|---|---|---|---|---|
| `d3-geo.min.mjs` | Map projections and paths, for the Globe part | 3.1.2 | npm package `d3-geo` (`dist/d3-geo.min.mjs`), https://github.com/d3/d3-geo | ISC, copyright Mike Bostock; includes GeographicLib code, copyright Charles Karney (MIT) |
| `d3-array.min.mjs` | Needed by d3-geo | 3.2.5 | npm package `d3-array` (`dist/d3-array.min.mjs`), https://github.com/d3/d3-array | ISC, copyright Mike Bostock |
| `topojson-client.min.js` | Unpacks the map shapes | 3.1.0 | npm package `topojson-client` (`dist/topojson-client.min.js`), https://github.com/topojson/topojson-client | ISC, copyright Mike Bostock |
| `countries-110m.json` | Country outlines | 2.0.2 | npm package `world-atlas`, https://github.com/topojson/world-atlas | Packaging ISC, copyright Mike Bostock. The shapes are Natural Earth 4.1.0, public domain, https://www.naturalearthdata.com |
| `fonts/nunito-latin.woff2` | Nunito, variable weight 400 to 900, Latin subset | Google Fonts v32 | https://fonts.google.com/specimen/Nunito | SIL Open Font License 1.1, copyright The Nunito Project Authors |

Licence texts: ISC at https://opensource.org/license/isc-license-txt, SIL OFL 1.1 at https://openfontlicense.org.

The drawings (step buttons, medallions, the globe's look, the Disc hurricane) are this project's own, copied from `stage0/`. Motion uses the small timing kit in `js/ease.js`, copied from `stage0/scene/src/ease.js`.
