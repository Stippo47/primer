// The read-along text part: words that light up as they are said. One part for every spoken text: an
// animation's captions, a scene step's captions, and a lesson step's words and feedback when Voice reads them.
//
// It draws a text as a span per word (keeping *stressed* words, drawn gold, and line breaks), and lights the
// words said so far. When the words come from a voice clip, each is lit at the time the aligner found it
// said; when nothing is said aloud (Voice off, or no clip), a reading clock spreads the words over the time
// they take to read. Where the spoken words differ from the written ones (`say`: "27 °C" read as
// "twenty-seven degrees Celsius"), the written words are matched to the spoken ones, and those with no
// match share the time of the words between their neighbours'. Calm, not karaoke: words not yet said are a
// softer tone, said words are full white, the colour eases between them, and nothing moves.
//
// The words of a line, shared with the skill: skill/primer.py (said_of, split_words, norm_word, find_words)
// splits and compares them the same way.

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const READING = { lead: 0.35, perWord: 0.34, least: 1.8 }; // the reading clock, in seconds

// What is said aloud: `say` if given, else the text.
export const saidOf = line => (typeof line.say === 'string' && line.say.trim() ? line.say : line.text) || '';
export const splitWords = s => String(s || '').split(/\s+/).filter(Boolean);
export const normWord = w => String(w).replace(/[’‘]/g, "'").replace(/\*/g, '').toLowerCase()
  .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

// Where an action's words are in what's said: the index of the first of them (or the last, for the end of a
// stretch). "$start" and "$end" are the line's ends; "rise#2" is the second "rise". -1 if they aren't there.
export function findWords(said, at, { last = false } = {}) {
  if (at === '$start') return 'start';
  if (at === '$end') return 'end';
  const m = String(at).match(/^(.*?)(?:#(\d+))?$/);
  const want = splitWords(m[1]).map(normWord).filter(Boolean);
  const nth = Number(m[2] || 1);
  const ws = splitWords(said).map(normWord);
  if (!want.length) return -1;
  let seen = 0;
  for (let i = 0; i + want.length <= ws.length; i++) {
    if (want.every((w, k) => ws[i + k] === w) && ++seen === nth) return last ? i + want.length - 1 : i;
  }
  return -1;
}

// A reading clock for words with no clip: spread over the time they take to read. { dur, words: [[w, s, e]] }
export function readingTimes(said) {
  const ws = splitWords(said);
  const dur = Math.max(READING.least, READING.lead + ws.length * READING.perWord);
  const total = ws.reduce((n, w) => n + w.length + 1, 0) || 1;
  let before = 0;
  const words = ws.map(w => {
    const s = READING.lead * 0.5 + (dur - READING.lead) * (before / total);
    before += w.length + 1;
    return [w, s, READING.lead * 0.5 + (dur - READING.lead) * (before / total)];
  });
  return { dur, words };
}

// A text as words, the way it's drawn: each with whether it's stressed. Stars mark stress and aren't shown.
export function wordsOf(text) {
  const out = [];
  let key = false;
  for (const raw of splitWords(text)) {
    if (raw.startsWith('*')) key = true;
    out.push({ w: raw.replace(/\*/g, ''), key });
    if (/\*[^\p{L}\p{N}*]*$/u.test(raw)) key = false;
  }
  return out;
}

// The markup for a text: a span per word (.w), stressed runs inside one .key span, line breaks kept.
export function markup(text) {
  const parts = String(text ?? '').split(/(\s+)/);
  let html = '', inKey = false, key = false, pend = '';
  for (const p of parts) {
    if (!p) continue;
    if (/^\s+$/.test(p)) { pend += p; continue; }
    if (p.startsWith('*')) key = true;
    const isKey = key;
    if (/\*[^\p{L}\p{N}*]*$/u.test(p)) key = false;
    if (inKey && !isKey) { html += '</span>'; inKey = false; }
    if (html) html += pend.includes('\n') ? '<br>'.repeat((pend.match(/\n/g) || []).length) : ' ';
    pend = '';
    if (isKey && !inKey) { html += '<span class="key">'; inKey = true; }
    html += `<span class="w">${esc(p.replace(/\*/g, ''))}</span>`;
  }
  if (inKey) html += '</span>';
  return html;
}

// The time of each written word, from the spoken words' times ([[word, start, end]]): matched in order where
// they're the same word, and the rest given the time between their neighbours, by length.
export function align(written, spoken) {
  const n = written.length, m = spoken.length;
  if (!n) return [];
  if (!m) return written.map(() => [0, 0]);
  const A = written.map(normWord), B = spoken.map(x => normWord(x[0]));
  // the longest run of words the two share, in order
  const L = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] && A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const match = new Array(n).fill(-1);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (A[i] && A[i] === B[j]) { match[i++] = j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  const out = new Array(n);
  for (let i = 0; i < n;) {
    if (match[i] >= 0) { const s = spoken[match[i]]; out[i] = [s[1], s[2]]; i++; continue; }
    let k = i;
    while (k < n && match[k] < 0) k++;
    const before = i > 0 ? match[i - 1] : -1, after = k < n ? match[k] : m;
    const from = after > before + 1 ? spoken[before + 1][1] : before >= 0 ? spoken[before][2] : spoken[0][1];
    let to = after > before + 1 ? spoken[after - 1][2] : after < m ? spoken[after][1] : spoken[m - 1][2];
    if (to < from) to = from;
    const lens = written.slice(i, k).map(w => w.length + 1), all = lens.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    for (let q = i; q < k; q++) {
      const s = from + ((to - from) * acc) / all;
      acc += lens[q - i];
      out[q] = [s, from + ((to - from) * acc) / all];
    }
    i = k;
  }
  return out;
}

// A caption in pieces (round four: "less lines at a time"): the words of a line split into pages of at most
// `lines` lines each, cut where a phrase ends. fits(i, j) says whether words i..j (inclusive) fit in that
// many lines. A page ends at a sentence's end once it has a few words; at a comma, a colon or a dash once it
// is past half full; before a joining word (and, but, so...) when it must; and anywhere only if one phrase is
// too long for a page. Returns [[first, last], ...].
const JOINS = new Set(['and', 'but', 'so', 'or', 'because', 'which', 'that', 'where', 'when', 'while', 'as', 'then', 'until', 'with', 'into', 'from', 'like']);
export function pagesOf(words, fits, { full = n => n } = {}) {
  const out = [];
  const ends = w => /[.!?]["”’)]*$/.test(w), pause = w => /[,;:]["”’)]*$/.test(w) || /[—–]$/.test(w);
  let i = 0;
  while (i < words.length) {
    let j = i;
    while (j + 1 < words.length && fits(i, j + 1)) j++;
    if (j + 1 >= words.length) { out.push([i, j]); break; }
    // the page is as full as it can be at j: cut at the best phrase end inside it
    let cut = -1;
    for (let k = j; k > i + 1 && cut < 0; k--) if (ends(words[k])) cut = k;
    if (cut < 0) for (let k = j; k > i && cut < 0; k--) if (pause(words[k]) && full(k - i + 1) >= full(j - i + 1) * 0.45) cut = k;
    if (cut < 0) for (let k = j; k > i + 1 && cut < 0; k--) if (JOINS.has(normWord(words[k]))) cut = k - 1;
    if (cut < 0) cut = j;
    out.push([i, cut]);
    i = cut + 1;
  }
  // a sentence's end inside a page that has room before it still ends the page there when what follows is a
  // phrase of its own: one thought a page reads calmer
  const split = [];
  for (const [a, b] of out) {
    let s = a;
    for (let k = a + 2; k < b - 1; k++) if (ends(words[k])) { split.push([s, k]); s = k + 1; }
    split.push([s, b]);
  }
  return split;
}

export class ReadAlong {
  // el: where the words go (its contents are replaced). It gets the class `ra`; while words are being said
  // it has `reading`, and each said word has `said`. pages: a number of lines (a caption): the words are
  // shown a page at a time, at most that many lines, each page in turn as its first word is said.
  constructor(el, text = '', { pages = 0 } = {}) {
    this.el = el;
    this.pageLines = Math.max(0, Number(pages) || 0);
    el.classList.add('ra');
    this.set(text);
  }

  set(text) {
    this.text = String(text ?? '');
    this.words = wordsOf(this.text).map(x => x.w);
    this.times = null;
    this.lit = -1;
    this.el.classList.remove('reading');
    if (this.pageLines) {
      this.pages = this.paginate();
      this.page = -1;
      this.showPage(0);
      return;
    }
    this.el.innerHTML = markup(this.text);
    this.spans = [...this.el.querySelectorAll('.w')];
  }

  // The caption's pages, measured with its own font across its own width.
  paginate() {
    const words = this.words;
    if (!words.length) return [[0, -1]];
    const cs = getComputedStyle(this.el), g = (ReadAlong.ctx = ReadAlong.ctx || document.createElement('canvas').getContext('2d'));
    g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const box = this.el.parentElement || this.el;
    const width = Math.max(120, Math.min(parseFloat(cs.maxWidth) || Infinity, box.clientWidth || 340) - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0));
    const space = g.measureText(' ').width, wid = words.map(w => g.measureText(w).width);
    // whether words i..j wrap into no more than the page's lines (greedy, as the browser wraps), with a little room
    const fits = (i, j) => {
      let lines = 1, run = 0;
      for (let k = i; k <= j; k++) {
        const add = (run ? space : 0) + wid[k];
        if (run && run + add > width * 0.97) { lines++; run = wid[k]; } else run += add;
        if (lines > this.pageLines) return false;
      }
      return true;
    };
    return pagesOf(words, fits, { full: n => n });
  }

  // Shows page p: its words only, each still lit or not by the voice.
  showPage(p) {
    if (!this.pageLines || p === this.page) return;
    this.page = p;
    const [a, b] = this.pages[Math.max(0, Math.min(this.pages.length - 1, p))];
    // the page's own words, keeping the stressed ones (the whole text's stars, cut to this page)
    const marks = wordsOf(this.text).slice(a, b + 1);
    let html = '', inKey = false;
    marks.forEach((m, k) => {
      if (inKey && !m.key) { html += '</span>'; inKey = false; }
      if (k) html += ' ';
      if (m.key && !inKey) { html += '<span class="key">'; inKey = true; }
      html += `<span class="w">${esc(m.w)}</span>`;
    });
    if (inKey) html += '</span>';
    this.el.innerHTML = html;
    this.spans = [...this.el.querySelectorAll('.w')];
    this.first = a;
    this.el.dataset.page = String(p);
    for (let i = 0; i < this.spans.length; i++) this.spans[i].classList.toggle('said', a + i <= this.lit);
  }

  // The page that word k (the last said; -1 before any) is on.
  pageOf(k) {
    if (!this.pages) return 0;
    const at = Math.max(0, k);
    for (let p = 0; p < this.pages.length; p++) if (at <= this.pages[p][1]) return p;
    return this.pages.length - 1;
  }

  // Times for the words from what is said: spoken words [[w, s, e]] (a clip's, or a reading clock's).
  follow(spoken) {
    this.times = align(this.words, spoken || []);
    this.lit = -1;
    return this;
  }

  // Lights every word said by time t (seconds), the rest a softer tone. In pages, the page turns as its first
  // word is said.
  paint(t) {
    if (!this.times) return;
    this.el.classList.add('reading');
    let k = -1;
    while (k + 1 < this.times.length && this.times[k + 1][0] <= t + 0.04) k++;
    if (k === this.lit) return;
    this.lit = k;
    if (this.pageLines) {
      this.showPage(this.pageOf(k));
      for (let i = 0; i < this.spans.length; i++) this.spans[i].classList.toggle('said', this.first + i <= k);
      return;
    }
    for (let i = 0; i < this.spans.length; i++) this.spans[i].classList.toggle('said', i <= k);
  }

  // Every word plain again: the reading is over, or was stopped. A caption in pages keeps its last page.
  finish() {
    this.el.classList.remove('reading');
    if (this.pageLines && this.lit >= 0) this.showPage(this.pageOf(this.words.length - 1));
    for (const s of this.spans) s.classList.remove('said');
    this.lit = -1;
  }

  // For the tests: how many words are lit, of how many; in pages, which page shows, of how many.
  state() {
    if (this.pageLines) return { lit: this.lit + 1, of: this.words.length, reading: this.el.classList.contains('reading'), page: this.page, pages: this.pages.length };
    return { lit: this.lit + 1, of: this.spans.length, reading: this.el.classList.contains('reading') };
  }
}
