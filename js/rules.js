// Marking rules: a small language, written as plain JSON in lesson files and in parts' descriptions,
// that says whether a part's state counts as right. The `primer` skill evaluates exactly the same rules
// in Python (skill/primer.py, rule_holds), so a lesson's "plausible wrong input" is checked on the PC
// the same way the phone will mark it. The rules are listed in docs/format.md.
//
//   { "read": "tapped.lat", "absBetween": [5, 20] }      read a value from the state, then test it
//   is, in, between, absBetween, near + within, same, pairs, inCircle, exists
//   { "all": [rule, ...] }  { "any": [rule, ...] }  { "not": rule }
//
// Strings starting with "$" are filled in from `vars` first (subst), which is how a part's description
// turns a Check step's "answer" into a rule.

export function read(state, path) {
  if (!path) return state;
  let v = state;
  for (const k of String(path).split('.')) {
    if (v === null || v === undefined) return undefined;
    v = v[k];
  }
  return v;
}

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function holds(rule, state) {
  if (!rule || typeof rule !== 'object') return false;
  if (Array.isArray(rule.all)) return rule.all.every(r => holds(r, state));
  if (Array.isArray(rule.any)) return rule.any.some(r => holds(r, state));
  if (rule.not) return !holds(rule.not, state);
  const v = read(state, rule.read);
  if ('exists' in rule) return (v !== undefined && v !== null) === !!rule.exists;
  if (v === undefined || v === null) return false;
  if ('is' in rule) return same(v, rule.is);
  if ('in' in rule) return Array.isArray(rule.in) && rule.in.some(x => same(v, x));
  if ('between' in rule) { const n = num(v); return n !== null && n >= rule.between[0] && n <= rule.between[1]; }
  if ('absBetween' in rule) { const n = num(v); return n !== null && Math.abs(n) >= rule.absBetween[0] && Math.abs(n) <= rule.absBetween[1]; }
  if ('near' in rule) { const n = num(v); return n !== null && Math.abs(n - rule.near) <= (rule.within ?? 0) + 1e-9; }
  if ('same' in rule) return same(v, rule.same);
  if ('pairs' in rule) {
    const want = rule.pairs || {};
    return typeof v === 'object' && Object.keys(want).length === Object.keys(v).length && Object.entries(want).every(([k, x]) => v[k] === x);
  }
  if ('inCircle' in rule) {
    const c = rule.inCircle;
    return num(v.x) !== null && num(v.y) !== null && Math.hypot(v.x - c.x, v.y - c.y) <= c.r + 1e-9;
  }
  return false;
}

// Fills "$name" strings in a rule from vars. A missing var leaves the string as it is, which then fails.
export function subst(rule, vars) {
  if (typeof rule === 'string' && rule.startsWith('$')) return rule.slice(1) in vars ? vars[rule.slice(1)] : rule;
  if (Array.isArray(rule)) return rule.map(r => subst(r, vars));
  if (rule && typeof rule === 'object') return Object.fromEntries(Object.entries(rule).map(([k, v]) => [k, subst(v, vars)]));
  return rule;
}
