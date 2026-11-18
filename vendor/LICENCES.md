# Vendored files

Everything in this folder came from its official source: the map and font files copied unchanged from `stage0/scene/vendor/`, and `ts-fsrs.mjs` from npm (below). Nothing is loaded from the web at run time.

| File | What | Version | Source | Licence |
|---|---|---|---|---|
| `d3-geo.min.mjs` | Map projections and paths, for the Globe part | 3.1.2 | npm package `d3-geo` (`dist/d3-geo.min.mjs`), https://github.com/d3/d3-geo | ISC, copyright Mike Bostock; includes GeographicLib code, copyright Charles Karney (MIT) |
| `d3-array.min.mjs` | Needed by d3-geo | 3.2.5 | npm package `d3-array` (`dist/d3-array.min.mjs`), https://github.com/d3/d3-array | ISC, copyright Mike Bostock |
| `topojson-client.min.js` | Unpacks the map shapes | 3.1.0 | npm package `topojson-client` (`dist/topojson-client.min.js`), https://github.com/topojson/topojson-client | ISC, copyright Mike Bostock |
| `countries-110m.json` | Country outlines | 2.0.2 | npm package `world-atlas`, https://github.com/topojson/world-atlas | Packaging ISC, copyright Mike Bostock. The shapes are Natural Earth 4.1.0, public domain, https://www.naturalearthdata.com |
| `fonts/nunito-latin.woff2` | Nunito, variable weight 400 to 900, Latin subset | Google Fonts v32 | https://fonts.google.com/specimen/Nunito | SIL Open Font License 1.1, copyright The Nunito Project Authors |
| `ts-fsrs.mjs` | The memory model: FSRS, the open spaced-repetition scheduler, for review | 5.4.2 | npm package `ts-fsrs` (`dist/index.mjs`, the ES module build; its tarball's sha512 matched the registry's), https://github.com/open-spaced-repetition/ts-fsrs | MIT, copyright 2026 Open Spaced Repetition (text below) |

Licence texts: ISC at https://opensource.org/license/isc-license-txt, SIL OFL 1.1 at https://openfontlicense.org.

`ts-fsrs.mjs` is the package's built file as published, with one line taken off its end: the comment pointing at a source map that isn't copied. 5.4.2 is the last release with no dependencies (6.0 added one). Its licence:

```
MIT License

Copyright (c) 2026 Open Spaced Repetition

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The drawings (step buttons, medallions, the globe's look, the Disc hurricane) are this project's own, copied from `stage0/`. Motion uses the small timing kit in `js/ease.js`, copied from `stage0/scene/src/ease.js`.
