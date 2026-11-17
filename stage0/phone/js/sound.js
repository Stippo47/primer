// The two ways a web page can make sound, each started straight from a tap, each reporting what
// the browser says happened. Whether anything was actually heard is asked on screen.
//
// Both functions do their starting work before their first `await`, so the browser still counts
// it as part of the tap. Neither can hang: every wait has a time limit.

const wait = ms => new Promise(r => setTimeout(r, ms));
const within = (promise, ms) => Promise.race([
  promise.then(() => 'ok', e => `refused (${(e && e.name) || 'error'})`),
  wait(ms).then(() => 'no answer'),
]);
const round2 = n => Math.round(n * 100) / 100;

// ---------- (a) a plain <audio> element

// way 'usual': the <audio> element that has been in the page since it opened.
// way 'fresh': a brand new element, made at the moment of the tap.
export async function playClip(way) {
  const page = document.getElementById('clip');
  const el = way === 'fresh' ? new Audio(page.getAttribute('src')) : page;
  const rep = { way, readyBefore: el.readyState };
  let ended = false;
  el.addEventListener('ended', () => { ended = true; }, { once: true });
  const began = performance.now();
  let started;
  try {
    el.muted = false;
    el.volume = 1;
    if (el.readyState > 0) el.currentTime = 0;
    started = el.play();
  } catch (e) {
    rep.play = `threw (${e.name})`;
    return rep;
  }
  rep.play = started && started.then ? await within(started, 2500) : 'no promise';
  await wait(Math.max(0, 1300 - (performance.now() - began)));
  rep.position = round2(el.currentTime);       // seconds into the clip, 1.3 s after the tap
  rep.moved = el.currentTime > 0.2 || ended;
  rep.paused = el.paused;
  rep.ended = ended;
  rep.ready = el.readyState;
  rep.network = el.networkState;
  rep.length = Number.isFinite(el.duration) ? round2(el.duration) : null;
  rep.error = el.error ? el.error.code : 0;
  return rep;
}

// ---------- (b) a Web Audio tone

let ctx = null;

// Present on iPhones from iOS 16.4: lets a page say what kind of sound it is making.
export const hasAudioSession = () => 'audioSession' in navigator;

// way 'usual': one sound engine for the whole visit, as an app would keep it.
// way 'fresh': throw the engine away and make a new one.
// way 'media': a new engine, after telling the phone the sound is media (like music) and not an
//              effect. This is the documented way round the silent switch.
export async function playTone(way) {
  const rep = { way };
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { rep.error = 'no AudioContext'; return rep; }
  if (hasAudioSession()) rep.sessionBefore = navigator.audioSession.type;
  try {
    if (way === 'media' && hasAudioSession()) navigator.audioSession.type = 'playback';
    if (way !== 'usual' && ctx) { ctx.close().catch(() => {}); ctx = null; }
    rep.made = !ctx;
    if (!ctx) ctx = new AC();
    rep.stateBefore = ctx.state;
    const resumed = ctx.resume();
    const t0 = ctx.currentTime;
    ring(ctx, t0 + 0.04);
    rep.resume = await within(resumed, 1500);
    rep.stateAfter = ctx.state;
    await wait(800);
    rep.clock = round2(ctx.currentTime - t0);   // how far the engine's own clock got
    rep.moved = ctx.currentTime - t0 > 0.2;
    rep.stateEnd = ctx.state;
    rep.rate = ctx.sampleRate;
    if (hasAudioSession()) rep.session = navigator.audioSession.type;
  } catch (e) {
    rep.error = `threw (${e.name})`;
  }
  if (way === 'media' && hasAudioSession()) {
    await wait(900);
    try { navigator.audioSession.type = 'auto'; } catch { /* stays as it was */ }
  }
  return rep;
}

// Two soft notes a fifth apart, each a sine that swells quickly and fades slowly.
function ring(c, at) {
  const out = c.createGain();
  out.gain.value = 0.9;
  out.connect(c.destination);
  for (const [freq, delay, level] of [[587.33, 0, 0.5], [880, 0.16, 0.4]]) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at + delay);
    gain.gain.exponentialRampToValueAtTime(level, at + delay + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + delay + 1.5);
    osc.connect(gain).connect(out);
    osc.start(at + delay);
    osc.stop(at + delay + 1.6);
  }
}
