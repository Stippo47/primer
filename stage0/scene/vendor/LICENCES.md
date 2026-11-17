# Vendored files

Everything in this folder is copied unchanged from its official source.

| File | What | Version | Source | Licence |
|---|---|---|---|---|
| `d3-geo.min.mjs` | Map projections and paths | 3.1.2 | npm package `d3-geo` (`dist/d3-geo.min.mjs`), https://github.com/d3/d3-geo | ISC, copyright Mike Bostock; includes GeographicLib code, copyright Charles Karney (MIT) |
| `d3-array.min.mjs` | Needed by d3-geo | 3.2.5 | npm package `d3-array` (`dist/d3-array.min.mjs`), https://github.com/d3/d3-array | ISC, copyright Mike Bostock |
| `topojson-client.min.js` | Unpacks the map shapes | 3.1.0 | npm package `topojson-client` (`dist/topojson-client.min.js`), https://github.com/topojson/topojson-client | ISC, copyright Mike Bostock |
| `countries-50m.json`, `countries-110m.json` | Country and land outlines at two levels of detail | 2.0.2 | npm package `world-atlas`, https://github.com/topojson/world-atlas | Packaging ISC, copyright Mike Bostock. The shapes are Natural Earth 4.1.0, public domain, https://www.naturalearthdata.com |
| `fonts/nunito-latin.woff2` | Nunito, variable weight 400 to 900, Latin subset | Google Fonts v32 | https://fonts.google.com/specimen/Nunito | SIL Open Font License 1.1, copyright The Nunito Project Authors |
| `fonts/outfit-latin.woff2` | Outfit, variable weight 300 to 800, Latin subset | Google Fonts v15 | https://fonts.google.com/specimen/Outfit | SIL Open Font License 1.1, copyright The Outfit Project Authors |
| `fonts/source-serif-4-latin.woff2` | Source Serif 4, variable weight 400 to 700, Latin subset | Google Fonts v15 | https://fonts.google.com/specimen/Source+Serif+4 | SIL Open Font License 1.1, copyright Adobe |

Licence texts: ISC at https://opensource.org/license/isc-license-txt, SIL OFL 1.1 at https://openfontlicense.org.

Nothing else is loaded. Motion uses a small hand-written timing kit in `src/ease.js`, not a library.
