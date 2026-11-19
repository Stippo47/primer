// Profile: what you know, topic by topic (blue when well remembered, grey as it slips, a warning mark on
// low ones, no word for it), and the settings: Voice, Captions, Animation sounds (an animation's own sound
// effects, on unless turned off), Effects (the press sounds), Music, text size, the narrators, the key connection,
// what's waiting to send, the version, and whether the phone has promised to keep the data. A topic's
// figure is how much of what's been asked in it you'd recall now, from the memory model (data.knowledge).
import { esc, head, sheet, when } from '../ui.js';
import { icon, svg, medallion, hazard, MARK } from '../art.js';
import { tierClass, tierCrown } from '../combo.js';
import * as data from '../data.js';
import * as feel from '../feel.js';
import { NARRATORS } from '../scene.js';

// Under this a topic gets the warning mark. From the memory model it's 70: FSRS aims to review a fact when its
// recall falls to 90%, and its forgetting has a long tail (a fact learned well still reads 60% months on),
// so 70 is well slipped. A topic without facts keeps the old figure's 50.
export const LOW = 50, LOW_MEMORY = 70;
const low = k => k.tried && k.pct < (k.facts ? LOW_MEMORY : LOW);
// well remembered is blue; forgotten is grey
export function knowColour(pct) {
  const t = Math.min(1, Math.max(0, (95 - pct) / 55));
  const a = [73, 198, 255], b = [124, 129, 160];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}

function sendingWords(st) {
  const parts = [];
  if (st.waiting) parts.push(`${st.waiting} waiting to send.`);
  else if (st.connected) parts.push('Nothing waiting.');
  if (st.sentAt) parts.push(`${st.sentCount} sent so far, the last at ${new Date(st.sentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\.$/, '')}.`);
  if (st.readAt) parts.push(`Last read on the PC ${new Date(st.readAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`);
  return parts.join(' ');
}

export function profileScreen(app) {
  const view = app.view;
  const st = app.sync.status();
  const prefs = app.prefs;
  const book = svg(30, 28, `<g transform="translate(15 15)"><g transform="translate(0 2)">${MARK.explain('#1b8fd1', '#1b8fd1')}</g>${MARK.explain('#6fd6ff', '#1b2250')}</g>`);
  const tick = svg(28, 28, `<circle cx="14" cy="15.5" r="12" fill="#127a85"/><circle cx="14" cy="14" r="12" fill="#2bc4a4"/><path d="M8.5 14.5l4 4L20 10" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`);
  const rightCount = app.topics.reduce((n, t) => n + data.knowledge(t).right, 0);
  const rows = app.topics.map(t => {
    const k = data.knowledge(t), col = knowColour(k.pct);
    return `<button class="krow" data-topic="${esc(t.id)}" data-sound="select">${medallion(t, 28)}<p class="nm">${esc(t.title)}</p>
      <div class="kb"><b style="width:${k.pct}%;background:${col}"></b></div><p class="pc" style="color:${col}">${k.pct}%</p>
      <div class="wn">${low(k) ? svg(22, 22, hazard()) : ''}</div></button>`;
  }).join('');
  // dflt: what a switch is when it has never been touched (Animation sounds start on)
  const toggle = (key, label, dflt = false) => {
    const on = prefs[key] === undefined ? dflt : !!prefs[key];
    return `<div class="srow"><p>${label}</p><button class="toggle" data-pref="${key}" aria-pressed="${on}" aria-label="${label}" data-sound="${on ? 'off' : 'on'}"></button></div>`;
  };
  // Each subject has its own narrator, named by its topics; one chosen here speaks for the whole subject.
  const subjects = [...new Map(app.topics.filter(t => t.subject).map(t => [t.subject, t])).values()];
  const narrators = subjects.map(t => `<div class="srow"><p>${esc(t.subject)}</p><button class="btn sm ghost" data-narrator="${esc(t.subject)}" data-sound="select">${esc(NARRATORS[app.narratorFor(t)] || app.narratorFor(t))}</button></div>`).join('');
  const trouble = app.store.troubleNow();
  const best = data.memoryNow().best;
  view.innerHTML = `<section class="screen profile">${head('<span class="title">Profile</span>')}
    <div class="tiles"><div class="plate">${book}<p class="sky-t" id="lessonsdone">${data.lessonsDone(app.topics)}</p></div><div class="plate">${tick}<p style="color:#7df0cf">${rightCount}</p></div>
      <div class="plate ${tierClass(best)}" id="bestcombo">${svg(33, 27, `<g transform="scale(1.1)">${tierCrown(best)}</g>`)}<p class="tierink">×${best}</p></div></div>
    ${app.topics.length ? `<p class="over">Knowledge</p><div class="plate know">${rows}</div>` : ''}
    <p class="over">Settings</p>
    <div class="plate settings">
      ${toggle('voice', 'Voice')}${toggle('captions', 'Captions')}${toggle('animSounds', 'Animation sounds', true)}${toggle('effects', 'Effects')}${toggle('music', 'Music')}
      <div class="srow"><p>Text size</p><div class="seg" role="group" aria-label="Text size">${['s', 'm', 'l'].map((s, i) => `<button class="${prefs.text === s ? 'on' : ''}" data-size="${s}" data-sound="select" style="font-size:${[11, 13.5, 16][i]}px" aria-label="${['Small', 'Middle', 'Large'][i]} text">A</button>`).join('')}</div></div>
    </div>
    ${narrators ? `<p class="over">Narrators</p><div class="plate settings" id="narrators">${narrators}<p class="fine" id="narratornote" hidden></p></div>` : ''}
    <p class="over">Sending</p>
    <div class="plate settings">
      <div class="srow"><p>${icon.key(18).replace('<svg ', '<svg style="display:inline;vertical-align:-3px;margin-right:6px;color:#6fd6ff" ')}${st.connected ? `Connected to ${esc(app.sync.REPO)}` : 'Not connected'}</p>
        <button class="btn sm${st.connected ? ' ghost' : ''}" data-go="${st.connected ? 'disconnect' : 'connect'}">${st.connected ? 'Disconnect' : 'Connect'}</button></div>
      <p class="fine" id="sendtext">${esc(sendingWords(st)) || 'Answers are kept here until you connect.'}</p>
      ${trouble ? `<p class="fine problem" id="saveproblem">${esc(app.troubleWords(trouble))}</p>` : ''}
      ${st.problem ? `<p class="fine problem" id="sendproblem">${esc(st.problem)}</p>` : ''}
      ${!st.problem && st.lastTry ? `<p class="fine" id="lasttry">${esc(st.lastTry)}</p>` : ''}
      ${st.pullProblem ? `<p class="fine problem">${esc(st.pullProblem)}</p>` : ''}
      ${st.connected ? `<div class="rowbtns"><button class="btn sm" data-go="send">${icon.send(18)}Send now</button><button class="btn sm ghost" data-go="pull">Check for lessons</button></div><p class="fine" id="sendresult" hidden></p>` : ''}
    </div>
    <p class="fine" id="storageline"></p>
    <p class="fine" id="version">Primer ${esc(app.VERSION)}. Map shapes from Natural Earth (public domain). Nunito, SIL Open Font Licence.</p>
  </section>`;
  app.store.persisted().then(yes => {
    const line = view.querySelector('#storageline');
    if (!line) return;
    line.textContent = yes === null ? "This phone doesn't say whether it will keep Primer's data."
      : yes ? 'This phone has promised to keep what Primer saves.'
        : "This phone hasn't promised to keep what Primer saves. It can clear it if space runs low; every answer also goes up once sent.";
  });
  view.onclick = async e => {
    if (e.target.closest('#version')) { versionTapped(app); return; }
    const t = e.target.closest('[data-pref]');
    if (t) {
      const on = t.getAttribute('aria-pressed') !== 'true';
      t.setAttribute('aria-pressed', String(on));
      t.dataset.sound = on ? 'off' : 'on';
      app.setPref(t.dataset.pref, on);
      return;
    }
    const s = e.target.closest('.seg [data-size]');
    if (s) { app.setPref('text', s.dataset.size); profileScreen(app); return; }
    const n = e.target.closest('[data-narrator]');
    if (n) { pickNarrator(app, subjects.find(t => t.subject === n.dataset.narrator)); return; }
    const row = e.target.closest('[data-topic]');
    if (row) { topicDetail(app, app.topics.find(x => x.id === row.dataset.topic)); return; }
    const go = e.target.closest('[data-go]');
    if (!go) return;
    if (go.dataset.go === 'connect') app.showConnect();
    if (go.dataset.go === 'disconnect') { await app.sync.disconnect(); profileScreen(app); }
    if (go.dataset.go === 'send' || go.dataset.go === 'pull') {
      const out = view.querySelector('#sendresult');
      out.hidden = false;
      out.textContent = go.dataset.go === 'send' ? 'Sending…' : 'Checking…';
      const r = go.dataset.go === 'send' ? await app.sync.flush() : await app.pullNow().then(() => ({ message: app.sync.status().pullProblem || 'Checked. You have the latest lessons.' }));
      if (app.tab !== 'profile' || app.view.querySelector('.profile') === null) return;
      profileScreen(app);
      const again = view.querySelector('#sendresult');
      if (again) { again.hidden = false; again.textContent = r.message; }
      const last = view.querySelector('#lasttry');
      if (last) last.remove();
    }
  };
}

// The four narrators for a subject. Its topics name one; choosing another speaks for everything in it.
// Clips are made in all four on the PC, but only the one in use is kept on the phone: a new choice's clips
// come down then, and it says so. Until every one of them is down (no signal, or partway), the old narrator
// goes on narrating, and the note says that plainly; then the new one takes over and the old one's clips go.
// Each narrator's sample ("Hello, I'm Heart…", js/sync.js samples) is always on the phone: it plays when a
// narrator is chosen, and from the small play button beside each, so a voice can be heard before choosing.
const PLAY = '<svg width="16" height="16" viewBox="0 0 28 28" aria-hidden="true"><path d="M9.5 6.2v15.6a1 1 0 0 0 1.5.9l12.4-7.8a1 1 0 0 0 0-1.8L11 5.3a1 1 0 0 0-1.5.9z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
let sampleNow = null;
// Plays a narrator's sample, if it's on the phone, stopping any other: called inside the tap, with the
// sample's address already known, so the phone lets it sound.
export function playSample(app, urls, id) {
  const url = urls[id] && urls[id].url;
  if (sampleNow) { try { sampleNow.pause(); } catch { /* done */ } }
  sampleNow = null;
  (app.heardSamples || (app.heardSamples = [])).push({ id, played: !!url });
  if (!url) return false;
  const a = new Audio(url);
  sampleNow = a;
  try { const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch { return false; }
  return true;
}

async function pickNarrator(app, topic) {
  if (!topic) return;
  const urls = await app.sync.samples().catch(() => ({}));
  const now = app.narratorFor(topic), own = topic.narrator || '';
  const s = sheet(app.root, `<p style="font-size:20px">${esc(topic.subject)}</p><p class="fine" style="padding-top:4px">Who narrates its animations, lessons and reviews. Tap ${PLAY.replace('<svg ', '<svg style="display:inline;vertical-align:-3px" ')} to hear one.</p>
    <div class="plate settings">${Object.entries(NARRATORS).map(([id, name]) => `<div class="srow nrow">
      <button class="npick" data-pick="${esc(id)}" data-sound="select" aria-pressed="${id === now}"><p>${esc(name)}</p><span class="small">${id === own ? 'its topics\' own' : ''}</span><span class="tickmark">${id === now ? icon.check(18) : ''}</span></button>
      <button class="round nplay${urls[id] ? '' : ' mute'}" data-hear="${esc(id)}" data-sound="none" aria-label="Hear ${esc(name)}"${urls[id] ? '' : ' disabled'}>${PLAY}</button></div>`).join('')}</div>`);
  s.el.addEventListener('click', e => {
    const h = e.target.closest('[data-hear]');
    if (h) { playSample(app, urls, h.dataset.hear); return; }
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    playSample(app, urls, b.dataset.pick);
    const chosen = { ...(app.prefs.narrators || {}) };
    if (b.dataset.pick === own) delete chosen[topic.subject]; else chosen[topic.subject] = b.dataset.pick;
    const changed = b.dataset.pick !== now;
    app.setPref('narrators', chosen);
    s.close();
    profileScreen(app);
    if (changed) fetchVoice(app, topic.subject, NARRATORS[b.dataset.pick] || b.dataset.pick);
  });
}

// A hidden panel for when the screen looks wrong on the phone (a band along the bottom): the version tapped
// five times in a row shows what the phone reports about its screen (js/app.js, screenFacts), to screenshot.
let versionTaps = [];
function versionTapped(app) {
  const now = Date.now();
  versionTaps = versionTaps.filter(t => now - t < 2500).concat(now);
  if (versionTaps.length < 5) return;
  versionTaps = [];
  screenPanel(app);
}
export function screenPanel(app) {
  const f = app.screenFacts();
  const row = (k, v) => `<div class="drow"><p>${esc(k)}</p><p>${esc(v)}</p></div>`;
  const vv = f.visualViewport ? `${f.visualViewport.height} (top ${f.visualViewport.offsetTop}, scale ${f.visualViewport.scale})` : 'none';
  const box = f.app ? `${f.app.top} to ${f.app.bottom} (${f.app.height})` : 'none';
  sheet(app.root, `<p style="font-size:20px">The screen, as the phone reports it</p>
    <p class="fine" style="padding-top:4px">Screenshot this if a band shows at the bottom.</p>
    <div class="plate settings diag" id="screenpanel">
      ${row('innerHeight', `${f.innerHeight} (width ${f.innerWidth})`)}${row('outerHeight', f.outerHeight)}${row('screen.height', `${f.screenHeight} (avail ${f.availHeight}, width ${f.screenWidth})`)}
      ${row('visualViewport height', vv)}${row('document height', `${f.documentHeight} (scroll ${f.scrollHeight}, body ${f.bodyHeight})`)}${row('app box', box)}
      ${row('safe area top / bottom', `${f.insets.top} / ${f.insets.bottom}`)}${row('safe area left / right', `${f.insets.left} / ${f.insets.right}`)}
      ${row('standalone', `${f.standalone} (display-mode ${f.displayMode || 'none'})`)}${row('devicePixelRatio', f.devicePixelRatio)}
      ${row('version', app.VERSION)}
    </div>
    <p class="fine" style="padding-top:8px;word-break:break-all">${esc(f.ua)}</p>`);
}

// The new narrator's clips coming down, said under the Narrators.
async function fetchVoice(app, subject, name) {
  const say = words => {
    const el = app.view.querySelector('#narratornote');
    if (!el) return;
    el.hidden = false;
    el.textContent = words;
  };
  say(`Bringing ${name}'s voice down…`);
  const r = await app.fetchVoice(subject, name);
  say(r.words);
}

// A topic's details: when it was last studied, how many of its facts are due again (or, for a topic
// without facts, how many of its questions were right last time), a dot for each fact (its colour its
// recall; dim if never asked), and a review of just this topic.
function topicDetail(app, topic) {
  const k = data.knowledge(topic), col = knowColour(k.pct);
  const calendar = svg(26, 26, `<rect x="2" y="5.5" width="22" height="19" rx="5" fill="#1b8fd1"/><rect x="2" y="4" width="22" height="19" rx="5" fill="#dfe5ff"/><path d="M2 9a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v2H2z" fill="#49c6ff"/><rect x="7" y="1" width="3" height="6" rx="1.5" fill="#fff"/><rect x="16" y="1" width="3" height="6" rx="1.5" fill="#fff"/><rect x="6" y="14" width="4" height="4" rx="1.2" fill="#7f88c8"/><rect x="11.5" y="14" width="4" height="4" rx="1.2" fill="#7f88c8"/>`);
  const ticked = svg(26, 26, `<circle cx="13" cy="14.5" r="11" fill="#127a85"/><circle cx="13" cy="13" r="11" fill="#2bc4a4"/><path d="M8 13.5l3.6 3.6L18.5 9.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
  const clockPic = svg(26, 26, `<circle cx="13" cy="14.5" r="11" fill="#1b8fd1"/><circle cx="13" cy="13" r="11" fill="#dfe5ff"/><circle cx="13" cy="13" r="8.4" fill="#49c6ff"/><path d="M13 8v5.4l3.4 2.2" fill="none" stroke="#0e1436" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`);
  const fact = (pic, big, small) => `<div class="fact">${pic}<div><p>${esc(big)}</p><p class="muted">${esc(small)}</p></div></div>`;
  const second = k.facts ? fact(clockPic, `${k.due} of ${k.learned} facts`, 'due again') : fact(ticked, `${k.right} of ${k.total}`, 'right last time');
  // a fact never asked is a dim dot; an asked one is coloured by how well it's remembered
  const dot = v => (v === null || v === undefined ? '<i class="unasked"></i>' : `<i style="background:${knowColour(40 + v * 55)};opacity:${v === 0 ? 0.55 : 1}"></i>`);
  const canReview = k.facts && k.learned > 0;
  const s = sheet(app.root, `
    <div style="display:flex;align-items:center;gap:12px">${medallion(topic, 46)}<p style="font-size:23px;flex:1">${esc(topic.title)}</p>
      ${low(k) ? svg(26, 24, `<g transform="scale(1.15)">${hazard()}</g>`) : ''}<p style="font-size:26px;color:${col}">${k.pct}%</p></div>
    <div class="facts">${fact(calendar, k.lastAt ? when(k.lastAt) : 'Not yet', 'last studied')}${second}</div>
    <div class="dots">${k.dots.map(dot).join('')}</div>
    ${canReview ? `<button class="btn" data-go="review" style="margin-top:18px">Review ${esc(topic.title)}</button><button class="linkrow" data-go="learn">Its path${icon.right(14)}</button>`
    : `<button class="btn" data-go="learn" style="margin-top:18px">${esc(topic.title)}</button>`}`);
  s.el.querySelector('[data-go=learn]').onclick = () => { s.close(); app.setPref('topic', topic.id); app.go('learn'); };
  const r = s.el.querySelector('[data-go=review]');
  if (r) r.onclick = () => { s.close(); app.openReview({ scope: topic }); };
}

export function connectScreen(app, back) {
  const view = app.view;
  document.documentElement.classList.add('bare');
  view.innerHTML = `<section class="screen connect">
    ${head(`<button class="round" data-go="back" aria-label="Back">${icon.left(20)}</button><span class="title sm">Connect</span>`)}
    ${app.mustInstall ? `<div class="install"><b>Do this from the Home Screen icon.</b> A key pasted here in Safari won't carry over to the app. Add Primer to your Home Screen first, then open it from there.</div>` : ''}
    <p class="fine" style="font-size:14px;color:#dde4ff">This lets the phone fetch lessons and send your answers. The key only reaches ${esc(app.sync.REPO)}. It takes about a minute, once.</p>
    <ol class="steps">
      <li><a class="btn sm" href="${esc(app.sync.tokenPage())}" target="_blank" rel="noopener">${icon.key(18)}Open GitHub's key page</a></li>
      <li>Sign in if it asks. Everything is filled in except one thing: under <b>Repository access</b>, tap <b>Only select repositories</b> and pick <b>${esc(app.sync.REPO)}</b>.</li>
      <li>Tap <b>Generate token</b>, then copy it.</li>
      <li>Come back here and paste it below.</li>
    </ol>
    <textarea id="key" class="keybox" rows="3" placeholder="Paste the key here" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea>
    <button class="btn" id="check">Check it and connect</button>
    <p class="result" id="result"></p>
  </section>`;
  const leave = () => { document.documentElement.classList.remove('bare'); back(); };
  view.querySelector('[data-go=back]').onclick = leave;
  const box = view.querySelector('#key'), out = view.querySelector('#result'), btn = view.querySelector('#check');
  btn.onclick = async () => {
    btn.disabled = true;
    out.className = 'result';
    out.textContent = 'Checking…';
    const r = await app.sync.connect(box.value);
    btn.disabled = false;
    if (!r.keepText) box.value = '';
    out.className = `result ${r.ok ? 'good' : 'bad'}`;
    out.textContent = r.message;
    feel.sound(r.ok ? 'right' : 'wrong');
    if (r.ok) setTimeout(() => { if (view.querySelector('.connect')) leave(); }, 1600);
  };
}
