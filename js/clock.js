// The app's clock: the time every event is stamped with and every memory is reckoned at. It is the phone's
// own time; the tests move it on (shift) to see days pass in seconds, and since events are stamped by the
// same clock, memory rebuilt from them later comes out exactly as it was lived.
let offset = 0;
export const now = () => Date.now() + offset;
export const iso = () => new Date(now()).toISOString();
export const shift = ms => { offset = Number(ms) || 0; return offset; };
export const DAY = 86400000;
