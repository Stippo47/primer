// The kit of parts. Each part is a folder in parts/ with a description (part.json) and one module; a
// preset is a part under another name with some defaults changed (parts.json). This file reads the
// descriptions, fills in settings from them, checks calls against them and mounts parts.
// The `primer` skill reads the very same descriptions, so the writer, the Playground and the tests can
// never drift apart.
import { track } from './gesture.js';
import * as feel from './feel.js';

const BASE = new URL('../parts/', import.meta.url);
const descs = new Map();
let kitP = null, presetsNow = {};

// parts.json: the parts, by folder name, and the presets (a part under another name, with some of its
// defaults changed, like the globe: the map with projection globe).
function kit() {
  if (!kitP) {
    kitP = fetch(new URL('parts.json', BASE)).then(r => r.json()).then(j => { presetsNow = j.presets || {}; return j; }).catch(e => { kitP = null; throw e; });
  }
  return kitP;
}

export function listParts() {
  return kit().then(j => j.parts);
}

// The part a name stands for: itself, or the part a preset is made from. Known once the kit is listed.
export const partOf = name => (presetsNow[name] && presetsNow[name].of) || name;

// A preset's description: the part's own, under the preset's name, with the preset's defaults. Everything
// else (settings, calls, events, state) is the part's, so the two can never drift apart.
export function presetOf(base, name, preset) {
  const settings = {};
  for (const [k, spec] of Object.entries(base.settings || {})) {
    settings[k] = k in (preset.settings || {}) ? { ...spec, default: preset.settings[k] } : spec;
  }
  return { ...base, name, title: preset.title || base.title, about: preset.about || base.about, settings, of: base.name };
}

export function describe(name) {
  if (!descs.has(name)) {
    descs.set(name, kit().catch(() => ({})).then(j => {
      const preset = (j.presets || {})[name];
      if (preset) return describe(preset.of).then(base => presetOf(base, name, preset));
      return fetch(new URL(`${name}/part.json`, BASE)).then(r => {
        if (!r.ok) throw new Error(`no part called ${name}`);
        return r.json();
      });
    }).catch(e => { descs.delete(name); throw e; }));
  }
  return descs.get(name);
}

export const thumbUrl = (name, desc) => new URL(`${desc.of || name}/${desc.thumb || 'thumb.svg'}`, BASE).href;

const isNum = v => typeof v === 'number' && Number.isFinite(v);

// One setting's value checked against its description. Returns [value to use, problem or null].
function settleOne(name, spec, v) {
  if (v === undefined) return [spec.default, null];
  const bad = why => [spec.default, `${name}: ${why}, so the default is used`];
  switch (spec.type) {
    case 'choice': return spec.options.includes(v) ? [v, null] : bad(`"${v}" isn't one of ${spec.options.join(', ')}`);
    case 'bool': return typeof v === 'boolean' ? [v, null] : bad('not true or false');
    case 'number': {
      if (!isNum(v)) return bad('not a number');
      if ((isNum(spec.min) && v < spec.min) || (isNum(spec.max) && v > spec.max)) return [Math.min(spec.max ?? v, Math.max(spec.min ?? v, v)), `${name}: ${v} is outside ${spec.min} to ${spec.max}`];
      return [v, null];
    }
    case 'text': case 'media': return typeof v === 'string' ? [v, null] : bad('not words');
    case 'lonlat': return Array.isArray(v) && v.length === 2 && v.every(isNum) ? [v, null] : bad('not [longitude, latitude]');
    case 'list': return Array.isArray(v) ? [v, null] : bad('not a list');
    default: return [v, null];
  }
}

// Fills in every setting from the description, and says what was wrong with the ones given.
export function settle(desc, given = {}) {
  const settings = {}, problems = [];
  for (const [name, spec] of Object.entries(desc.settings || {})) {
    const [v, problem] = settleOne(name, spec, given[name]);
    settings[name] = v;
    if (problem) problems.push(problem);
  }
  for (const name of Object.keys(given)) if (!(name in (desc.settings || {}))) problems.push(`${name}: ${desc.name} has no such setting`);
  return { settings, problems };
}

// Whether a call exists and has enough arguments. The skill's check goes much further; this is the phone's guard.
export function callProblem(desc, call) {
  const [name, ...args] = call;
  const spec = (desc.calls || {})[name];
  if (!spec) return `${desc.name} has no call ${name}`;
  const need = spec.args.filter(a => !a.optional).length;
  if (args.length < need) return `${name} needs ${need} argument${need === 1 ? '' : 's'}`;
  return null;
}

// Mounts a part into el. ctx brings what a part may use from the app: the feel, finger tracking, and a
// way to turn a media path into an address. Returns the part's handle, with run(call) added.
export async function mount(name, el, given = {}, { media } = {}) {
  const desc = await describe(name);
  const mod = await import(new URL(`${desc.of || name}/${desc.module}`, BASE).href);
  const { settings, problems } = settle(desc, given);
  for (const p of problems) console.warn(`part ${p}`);
  const ctx = { feel: { sound: feel.sound, tick: feel.tick, pop: feel.pop, spring: feel.spring }, track, media: media || (p => p) };
  const handle = await mod.mount(el, settings, ctx);
  handle.name = name;
  handle.desc = desc;
  handle.settings = settings;
  handle.run = call => {
    const problem = callProblem(desc, call);
    if (problem) { console.warn(`part ${problem}`); return undefined; }
    return handle.calls[call[0]](...call.slice(1));
  };
  return handle;
}
