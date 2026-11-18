// Inputs: every way of answering a question. One part, many forms, each a module in forms/ that's only
// what's its own; everything else is shared here and in kit.js:
//   one way of answering   a form reports its answer with f.set(value, answered), and the lesson hears
//                          `change`; state() is { value, answered } for every form
//   one way of checking    the lesson marks the value with the rule part.json's `marking` gives the form
//                          (js/rules.js on the phone, the same rules in the writer's `primer check`)
//   one way of showing     reveal(answer) shows the truth beside the answer given; mark(kind) colours the
//   the truth              answer given, for the forms that have one value to colour
//   one way of stopping    lock() once it's checked, reset() to try again
// A form is mount(f) -> { reveal, mark?, reset }, with f the form's kit: its root, settings (S), the app's
// feel and finger tracking (ctx), set(), value(), locked(), media() and cleanup(). Making a new form is a
// new file in forms/, a line in FORMS below and its settings and marking in part.json.
//
// It knows nothing about any lesson: it shows what its settings say and reports its state. It's an answer
// form, not a tool, so the Playground lists it apart, under the tools ("playground": false in part.json).
//
// mount(el, settings, ctx) -> { calls, state, on, remove }.
import { BASE_CSS, clone } from './kit.js';
import { clockInfo } from './clock.js';
import * as choice from './forms/choice.js';
import * as slider from './forms/slider.js';
import * as dial from './forms/dial.js';
import * as number from './forms/number.js';
import * as pile from './forms/pile.js';
import * as order from './forms/order.js';
import * as string from './forms/string.js';
import * as sort from './forms/sort.js';
import * as snap from './forms/snap.js';
import * as match from './forms/match.js';
import * as spot from './forms/spot.js';

export const FORMS = { choice, slider, dial, number, pile, order, string, sort, snap, match, spot };

function injectCss() {
  if (document.getElementById('part-inputs-css')) return;
  const s = document.createElement('style');
  s.id = 'part-inputs-css';
  s.textContent = BASE_CSS + Object.values(FORMS).map(m => m.css || '').join('\n');
  document.head.append(s);
}

export function mount(el, settings, ctx = {}) {
  injectCss();
  const feel = ctx.feel || { sound() {}, tick() {}, pop() {}, spring() {} };
  const S = settings;
  const form = FORMS[S.form] ? S.form : 'choice';
  const root = document.createElement('div');
  root.className = `pi form-${form}`;
  el.append(root);
  const fns = new Set();
  const cleanups = [];
  let value = null, answered = false, locked = false;
  const f = {
    root, S, ctx, feel,
    media: p => (ctx.media ? ctx.media(p) : p),
    set(v, done) {
      value = v;
      answered = done;
      for (const fn of fns) fn({ value: clone(value), answered });
    },
    value: () => value,
    locked: () => locked,
    cleanup: fn => cleanups.push(fn),
  };
  const api = FORMS[form].mount(f);
  return {
    calls: {
      reveal: answer => api.reveal(answer),
      lock: () => { locked = true; root.classList.add('locked'); },
      reset: () => { locked = false; root.classList.remove('locked'); api.reset(); },
      // How the lesson marked it, for the forms that colour the one answer given (slider, dial, number, pile).
      mark: kind => api.mark && api.mark(kind),
    },
    state: () => ({ value: clone(value), answered }),
    on: (name, fn) => { if (name === 'change') { fns.add(fn); return () => fns.delete(fn); } return () => {}; },
    // For the tests: the form, what it says of itself (its look, its direction, its picture) and the clock.
    debug: () => ({ form, ...(api.debug ? api.debug() : {}), clock: clockInfo() }),
    remove: () => { for (const c of cleanups) try { c(); } catch { /* already gone */ } fns.clear(); root.remove(); },
  };
}
