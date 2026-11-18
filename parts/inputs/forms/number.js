// Number: an exact number, in one of four looks (`look`), each a file in number/:
//   keys     typed on the form's own keypad (the phone's keyboard never covers the button); nothing is
//            answered until something is typed
//   wheels   a drum for each digit, rolled by finger or by its arrows
//   tape     a ruler slid under a needle, dragged or flicked
//   abacus   a rod of beads for each digit
// Every look reads the same settings (min, max, step, unit; start, for the three that always hold a
// number), answers with the same number and is checked, marked and shown the truth the same way: the true
// number as a gold chip under it. A new look is a file in number/, a line in LOOKS and an option in
// part.json's `look`.
import * as keys from '../number/keys.js';
import * as wheels from '../number/wheels.js';
import * as tape from '../number/tape.js';
import * as abacus from '../number/abacus.js';
import { css as common } from '../number/common.js';

export const LOOKS = { keys, wheels, tape, abacus };
// What `look` "auto" is on a number: the keypad, until another look is chosen as the usual one.
export const USUAL = 'keys';

export const css = [common, ...Object.values(LOOKS).map(l => l.css)].join('\n');

export function mount(f) {
  const name = LOOKS[f.S.look] ? f.S.look : USUAL;
  f.root.classList.add(`look-${name}`);
  const api = LOOKS[name].mount(f);
  return { ...api, debug: () => ({ look: name, ...(api.debug ? api.debug() : {}) }) };
}
