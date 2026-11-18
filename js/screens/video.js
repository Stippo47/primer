// An animation on the path, played like a video: the scene fills the screen (no header, no tab bar, no
// Continue), its controls come up on a tap, and at the end it stops on the last picture with Watch again
// and Next. It's saved and sent as a lesson of one step (docs/format.md): `start` when it opens, `seen` and
// `finish` the first time its end is reached, `leave` if it's closed before then.
import { esc } from '../ui.js';
import { Scene, DEFAULT_NARRATOR } from '../scene.js';

// app: the app object. topic, node: the topic and its animation node (node.file is its scene, as a lesson
// of one scene step). next: the node after it on the path, if any. record(event), media(path),
// voice: { on(), set(on), narrator }, captions: { on(), set(on) }. onLeave(), onNext().
export async function playVideo(app, topic, node, { next = null, record, media, voice = {}, captions = {}, onLeave, onNext }) {
  const view = app.view;
  const lesson = node.file;
  const step = lesson.steps[0];
  const ids = { topic: topic.id, lesson: lesson.id, version: lesson.version || 1 };
  document.documentElement.classList.add('bare');
  view.innerHTML = `<section class="video" aria-label="${esc(lesson.title)}"><div class="vscene"></div></section>`;
  record({ type: 'start', ...ids, step: step.id });
  let ended = false, gone = false;
  const out = { scene: null, kind: 'animation', node, lesson };
  const leave = how => {
    if (gone) return;
    gone = true;
    if (how === 'closed' && !ended) record({ type: 'leave', ...ids, step: step.id });
    out.remove();
    if (how === 'next') onNext(); else onLeave();
  };
  out.remove = () => {
    gone = true;
    if (out.scene) out.scene.remove();
    view.innerHTML = '';
    document.documentElement.classList.remove('bare');
  };
  out.leave = leave;
  const scene = new Scene(view.querySelector('.vscene'), step, {
    ended: () => {
      if (ended) return;
      ended = true;
      record({ type: 'seen', ...ids, step: step.id });
      record({ type: 'finish', ...ids, right: 0, of: 0 });
    },
    close: () => leave('closed'),
    next: () => leave(next ? 'next' : 'closed'),
  }, {
    mode: 'video',
    timing: step.timing || null,
    narrator: voice.narrator || topic.narrator || DEFAULT_NARRATOR,
    fallback: topic.narrator || DEFAULT_NARRATOR,
    voice: () => (voice.on ? voice.on() : true),
    setVoice: on => voice.set && voice.set(on),
    captions: () => (captions.on ? captions.on() : true),
    setCaptions: on => captions.set && captions.set(on),
    media,
    nextLabel: next ? 'Next' : 'Done',
  });
  out.scene = scene;
  await scene.open();
  if (!gone) view.dispatchEvent(new CustomEvent('stepshown', { detail: { i: 0, id: step.id } }));
  return out;
}
