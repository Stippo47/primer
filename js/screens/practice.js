// Practice: Review and the Playground. Review's card starts a review of every fact met, every topic mixed
// (js/review.js); it shows the best combo so far, and says plainly when nothing is due, offering to review
// anyway. In the Playground each tool opens by itself with a panel of its settings to play with, built
// from the part's own description. Answer forms (Inputs) aren't tools: they get one quiet row under the
// tools, "Answer forms", which opens every form with its settings, so dragging can be tried on the phone.
import { esc, head } from '../ui.js';
import { icon, svg, snippet, crown } from '../art.js';
import * as parts from '../parts.js';
import * as feel from '../feel.js';
import * as data from '../data.js';
import { subst } from '../rules.js';

// The Review card's right side: its name, the best combo (a crown, no label), and Start; or, with nothing
// due, the words "Nothing due" and Review anyway; or, before any lesson, nothing to start.
function reviewSide() {
  const met = data.metFacts();
  const due = met.filter(x => x.due).length;
  const best = data.memoryNow().best;
  const chip = best ? `<div class="crownchip">${svg(24, 20, `<g transform="scale(0.8)">${crown()}</g>`)}<span>×${best}</span></div>` : '';
  if (!met.length) return `<p>Review</p><span class="soon">After a lesson</span><button class="btn" disabled data-sound="none">Start</button>`;
  if (!due) return `<p>Review</p>${chip}<span class="soon nothing">Nothing due</span><button class="btn anyway" data-go="review" data-anyway="1">Review anyway</button>`;
  return `<p>Review</p>${chip}<button class="btn" data-go="review">Start</button>`;
}

// Which lesson first puts a part on screen, for the "from" line under it.
function firstLessonWith(topics, name) {
  for (const t of topics) for (const l of t.lessons) {
    for (const s of l.steps) {
      const used = [s.figure && s.figure.part, s.play && s.play.part, s.kind === 'check' ? 'inputs' : null];
      if (used.map(parts.partOf).includes(name)) return l.title;   // a preset (the globe) counts as its part
    }
  }
  return null;
}

export async function practiceScreen(app) {
  const view = app.view;
  const fan = `<g transform="translate(16 30) rotate(-15 35 46)">${snippet('bolt')}</g>
    <g transform="translate(94 26) rotate(13 35 46)">${snippet('storm')}</g>
    <g transform="translate(51 14) rotate(-2 35 46) scale(1.1)">${snippet('leaf')}</g>`;
  view.innerHTML = `<section class="screen practice">${head('<span class="title">Practice</span>')}
    <div class="stage review"><div class="fan">${svg(190, 164, fan)}</div>
      <div class="side">${reviewSide()}</div></div>
    <p class="h2">Playground</p><div class="parts"></div>
    <button class="formsrow" data-part="inputs"><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="2" y="9" width="18" height="4" rx="2" fill="currentColor" opacity="0.45"/><circle cx="14" cy="11" r="5" fill="currentColor"/></svg>
      <span>Answer forms</span>${icon.right(16)}</button></section>`;
  view.querySelector('.formsrow').onclick = () => app.openPart('inputs');
  const start = view.querySelector('.review [data-go=review]');
  if (start) start.onclick = () => app.openReview({ anyway: !!start.dataset.anyway });
  const grid = view.querySelector('.parts');
  const names = await parts.listParts().catch(() => []);
  const descs = await Promise.all(names.map(n => parts.describe(n).catch(() => null)));
  if (app.view !== view || !view.querySelector('.practice')) return;
  // The Playground is for tools, like the globe as an atlas. A part that's only a way of answering says
  // "playground": false in its description and stays out of the list (lessons still use it).
  grid.innerHTML = names.map((n, i) => {
    const d = descs[i];
    if (!d || d.playground === false) return '';
    const from = firstLessonWith(app.topics, n);
    return `<button class="plate pcard" data-part="${esc(n)}"><div class="pic"><img src="${esc(parts.thumbUrl(n, d))}" alt=""></div>
      <div class="txt"><p>${esc(d.title)}</p>${from ? `<p class="muted">from ${esc(from)}</p>` : ''}</div></button>`;
  }).join('');
  grid.onclick = e => {
    const b = e.target.closest('[data-part]');
    if (b) app.openPart(b.dataset.part);
  };
}

// ---------------------------------------------------------------- one part, opened

// The settings worth a control here: choices, switches and short number ranges. Lists and places come
// from the description's example instead.
const simple = spec => spec.type === 'choice' || spec.type === 'bool' || (spec.type === 'number' && spec.max - spec.min <= 20);

export async function partScreen(app, name, back) {
  const view = app.view;
  document.documentElement.classList.add('bare');
  const desc = await parts.describe(name);
  const ex = desc.example || {};
  const isInputs = name === 'inputs';
  let chosen = isInputs ? { form: 'choice' } : { ...(ex.settings || {}) };
  let handle = null;

  view.innerHTML = `<section class="screen partview">
    ${head(`<button class="round" data-go="back" aria-label="Back">${icon.left(20)}</button><span class="title sm">${esc(isInputs ? "Answer forms" : desc.title)}</span>`)}
    <div class="${isInputs ? 'plate partstage inputs' : 'stage partstage'}"></div>
    <div class="tries"></div>
    <div class="plate panel"></div></section>`;
  const stage = view.querySelector('.partstage'), panel = view.querySelector('.panel'), tries = view.querySelector('.tries');

  const exampleFor = () => (isInputs ? ex[chosen.form] || {} : ex);
  async function remount() {
    if (handle) handle.remove();
    handle = null;
    stage.innerHTML = '';
    const settings = isInputs ? { ...(exampleFor().settings || {}), ...chosen } : chosen;
    handle = await parts.mount(name, stage, settings, { media: p => app.mediaUrl(p) });
    if (!isInputs) for (const c of ex.calls || []) handle.run(c);
    app.partNow = handle;
    drawPanel();
  }
  function drawPanel() {
    const rows = Object.entries(desc.settings).filter(([k, spec]) => simple(spec) && (!spec.forms || !isInputs || spec.forms.includes(chosen.form)));
    const val = k => (k in chosen ? chosen[k] : handle.settings[k]);
    // a choice offers what the chosen form has of it (byForm), less what's resting (hidden: Spot, until it's redone)
    const offered = spec => ((isInputs && spec.byForm && spec.byForm[chosen.form]) || spec.options).filter(o => !(spec.hidden || []).includes(o));
    panel.innerHTML = rows.map(([k, spec]) => {
      let ctl = '';
      if (spec.type === 'choice') ctl = `<div class="seg">${offered(spec).map(o => `<button class="${val(k) === o ? 'on' : ''}" data-set="${esc(k)}" data-v="${esc(o)}" data-sound="select">${esc(o)}</button>`).join('')}</div>`;
      if (spec.type === 'bool') ctl = `<button class="toggle" data-set="${esc(k)}" data-bool aria-pressed="${!!val(k)}" aria-label="${esc(k)}" data-sound="${val(k) ? 'off' : 'on'}"></button>`;
      if (spec.type === 'number') ctl = `<input type="range" min="${spec.min}" max="${spec.max}" step="${spec.step || 1}" value="${val(k)}" data-set="${esc(k)}" aria-label="${esc(k)}">`;
      // a setting marked wide (like the map's style) gets a line of its own, its choices across the width
      return `<div class="setrow${spec.wide || (spec.type === 'choice' && offered(spec).length > 3) ? ' wide' : ''}"><p>${esc(k)}</p>${ctl}</div>`;
    }).join('');
    const tryList = isInputs
      ? [{ label: 'Answer', call: ['reveal', '$answer'] }, { label: 'Again', call: ['reset'] }]
      : desc.try || [];
    tries.innerHTML = tryList.map((t, i) => `<button class="btn sm ghost" data-try="${i}">${esc(t.label)}</button>`).join('');
    tries.onclick = e => {
      const b = e.target.closest('[data-try]');
      if (!b || !handle) return;
      const call = subst(tryList[Number(b.dataset.try)].call, { answer: exampleFor().answer });
      // an answer form shows the truth as a lesson does: locked first, so nothing moves under it
      if (isInputs && call[0] === 'reveal') handle.run(['lock']);
      handle.run(call);
    };
  }
  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-set]');
    if (!b || b.tagName === 'INPUT') return;
    const k = b.dataset.set;
    chosen = { ...chosen, [k]: 'bool' in b.dataset ? b.getAttribute('aria-pressed') !== 'true' : b.dataset.v };
    remount();
  });
  panel.addEventListener('change', e => {
    const k = e.target.dataset.set;
    if (!k) return;
    chosen = { ...chosen, [k]: Number(e.target.value) };
    feel.sound('select');
    remount();
  });
  view.querySelector('[data-go=back]').onclick = () => {
    if (handle) handle.remove();
    app.partNow = null;
    document.documentElement.classList.remove('bare');
    back();
  };
  await remount();
}
