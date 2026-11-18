// Profile: what you know, topic by topic (blue when well remembered, grey as it slips, a warning mark on
// low ones, no word for it), and the settings: Voice, Effects and Music, text size, the key connection,
// what's waiting to send, the version, and whether the phone has promised to keep the data.
import { esc, head, sheet, when } from '../ui.js';
import { icon, svg, medallion, hazard, MARK } from '../art.js';
import * as data from '../data.js';
import * as feel from '../feel.js';
import { NARRATORS } from '../scene.js';

export const LOW = 50;
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
      <div class="wn">${k.tried && k.pct < LOW ? svg(22, 22, hazard()) : ''}</div></button>`;
  }).join('');
  const toggle = (key, label) => `<div class="srow"><p>${label}</p><button class="toggle" data-pref="${key}" aria-pressed="${!!prefs[key]}" aria-label="${label}" data-sound="${prefs[key] ? 'off' : 'on'}"></button></div>`;
  // Each subject has its own narrator, named by its topics; one chosen here speaks for the whole subject.
  const subjects = [...new Map(app.topics.filter(t => t.subject).map(t => [t.subject, t])).values()];
  const narrators = subjects.map(t => `<div class="srow"><p>${esc(t.subject)}</p><button class="btn sm ghost" data-narrator="${esc(t.subject)}" data-sound="select">${esc(NARRATORS[app.narratorFor(t)] || app.narratorFor(t))}</button></div>`).join('');
  const trouble = app.store.troubleNow();
  view.innerHTML = `<section class="screen profile">${head('<span class="title">Profile</span>')}
    <div class="tiles"><div class="plate">${book}<p class="sky-t" id="lessonsdone">${data.lessonsDone(app.topics)}</p></div><div class="plate">${tick}<p style="color:#7df0cf">${rightCount}</p></div></div>
    ${app.topics.length ? `<p class="over">Knowledge</p><div class="plate know">${rows}</div>` : ''}
    <p class="over">Settings</p>
    <div class="plate settings">
      ${toggle('voice', 'Voice')}${toggle('captions', 'Captions')}${toggle('effects', 'Effects')}${toggle('music', 'Music')}
      <div class="srow"><p>Text size</p><div class="seg" role="group" aria-label="Text size">${['s', 'm', 'l'].map((s, i) => `<button class="${prefs.text === s ? 'on' : ''}" data-size="${s}" data-sound="select" style="font-size:${[11, 13.5, 16][i]}px" aria-label="${['Small', 'Middle', 'Large'][i]} text">A</button>`).join('')}</div></div>
    </div>
    ${narrators ? `<p class="over">Narrators</p><div class="plate settings" id="narrators">${narrators}</div>` : ''}
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
    <p class="fine">Primer ${esc(app.VERSION)}. Map shapes from Natural Earth (public domain). Nunito, SIL Open Font Licence.</p>
  </section>`;
  app.store.persisted().then(yes => {
    const line = view.querySelector('#storageline');
    if (!line) return;
    line.textContent = yes === null ? "This phone doesn't say whether it will keep Primer's data."
      : yes ? 'This phone has promised to keep what Primer saves.'
        : "This phone hasn't promised to keep what Primer saves. It can clear it if space runs low; every answer also goes up once sent.";
  });
  view.onclick = async e => {
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

// The four narrators for a subject. Its topics name one; choosing another speaks for every scene in it.
// Clips are made in all four on the PC, so a choice plays offline at once.
function pickNarrator(app, topic) {
  if (!topic) return;
  const now = app.narratorFor(topic), own = topic.narrator || '';
  const s = sheet(app.root, `<p style="font-size:20px">${esc(topic.subject)}</p><p class="fine" style="padding-top:4px">Who narrates its animations.</p>
    <div class="plate settings">${Object.entries(NARRATORS).map(([id, name]) => `<button class="srow nrow" data-pick="${esc(id)}" data-sound="select" aria-pressed="${id === now}" style="width:100%">
      <p>${esc(name)}</p><span class="small">${id === own ? 'its topics\' own' : ''}</span><span class="tickmark">${id === now ? icon.check(18) : ''}</span></button>`).join('')}</div>`);
  s.el.addEventListener('click', e => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    const chosen = { ...(app.prefs.narrators || {}) };
    if (b.dataset.pick === own) delete chosen[topic.subject]; else chosen[topic.subject] = b.dataset.pick;
    app.setPref('narrators', chosen);
    s.close();
    profileScreen(app);
  });
}

function topicDetail(app, topic) {
  const k = data.knowledge(topic), col = knowColour(k.pct);
  const calendar = svg(26, 26, `<rect x="2" y="5.5" width="22" height="19" rx="5" fill="#1b8fd1"/><rect x="2" y="4" width="22" height="19" rx="5" fill="#dfe5ff"/><path d="M2 9a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v2H2z" fill="#49c6ff"/><rect x="7" y="1" width="3" height="6" rx="1.5" fill="#fff"/><rect x="16" y="1" width="3" height="6" rx="1.5" fill="#fff"/><rect x="6" y="14" width="4" height="4" rx="1.2" fill="#7f88c8"/><rect x="11.5" y="14" width="4" height="4" rx="1.2" fill="#7f88c8"/>`);
  const ticked = svg(26, 26, `<circle cx="13" cy="14.5" r="11" fill="#127a85"/><circle cx="13" cy="13" r="11" fill="#2bc4a4"/><path d="M8 13.5l3.6 3.6L18.5 9.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
  const fact = (pic, big, small) => `<div class="fact">${pic}<div><p>${esc(big)}</p><p class="muted">${esc(small)}</p></div></div>`;
  const s = sheet(app.root, `
    <div style="display:flex;align-items:center;gap:12px">${medallion(topic, 46)}<p style="font-size:23px;flex:1">${esc(topic.title)}</p>
      ${k.tried && k.pct < LOW ? svg(26, 24, `<g transform="scale(1.15)">${hazard()}</g>`) : ''}<p style="font-size:26px;color:${col}">${k.pct}%</p></div>
    <div class="facts">${fact(calendar, k.lastAt ? when(k.lastAt) : 'Not yet', 'last studied')}${fact(ticked, `${k.right} of ${k.total}`, 'right last time')}</div>
    <div class="dots">${k.dots.map(v => `<i style="background:${knowColour(40 + v * 55)};opacity:${v === 0 ? 0.55 : 1}"></i>`).join('')}</div>
    <button class="btn" data-go="learn" style="margin-top:18px">${esc(topic.title)}</button>`);
  s.el.querySelector('[data-go=learn]').onclick = () => { s.close(); app.setPref('topic', topic.id); app.go('learn'); };
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
