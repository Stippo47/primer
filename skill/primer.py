#!/usr/bin/env python3
"""The writer's side of Primer: list the parts, check a lesson, see whether it fits, send a topic, read progress.

Lessons live in the private data repo (primer-data); the app and its parts live in the public one. This script
reads the parts' descriptions from the app, and works on a local clone of the data repo with plain git.
See SKILL.md for the commands, and the app's docs/format.md for the files.
"""
import argparse
import getpass
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

HERE = pathlib.Path(__file__).resolve().parent
ATTRIBUTION = 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>'

LEVELS = {'glance': (1, 1), 'tour': (2, 4), 'solid': (5, 9), 'deep': (10, 15)}
COLOURS = {'orange', 'cyan', 'pink', 'yellow', 'purple', 'teal'}
MARKS = {'swirl', 'paw', 'bolt', 'flag', 'strings', 'drop', 'leaf', 'globe', 'book', 'star'}
KINDS = {'explain', 'check', 'play'}
SLUG = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
TOPIC_FIELDS = {'v', 'title', 'level', 'colour', 'mark', 'about', 'path'}
# The nodes on a topic's path. Played ones (lesson, test, exam) are a file each, <id>.json; the rest are
# the node alone. Review and animation are placeholders until stage 2.
NODE_KINDS = ('lesson', 'test', 'exam', 'chest', 'review', 'animation')
PLAYED = {'lesson', 'test', 'exam'}
NODE_FIELDS = {'kind', 'id', 'title', 'unit'}
QUESTIONS_AT_LEAST = {'test': 3, 'exam': 5}
LESSON_FIELDS = {'v', 'title', 'version', 'minutes', 'steps', 'sources'}
STEP_FIELDS = {
    'explain': {'id', 'kind', 'title', 'text', 'figure', 'src'},
    'check': {'id', 'kind', 'title', 'ask', 'figure', 'input', 'answer', 'within', 'close', 'right', 'why', 'misses', 'then', 'tries', 'src'},
    'play': {'id', 'kind', 'title', 'ask', 'play', 'goal', 'closeGoal', 'ready', 'right', 'why', 'misses', 'then', 'tries', 'src'},
}
SOURCE_FIELDS = {'id', 'by', 'title', 'url', 'year', 'checked', 'says'}
OPTION_WRITER_FIELDS = {'right', 'why', 'tempting'}
NO_TELLS = re.compile(r'\b(all|none|both|neither) of (the )?(above|these|them|those)\b', re.I)
TEXT_LIMIT = {'text': 320, 'ask': 220, 'title': 40, 'why': 260, 'right': 200}
STEPS_RANGE = (3, 15)
IMAGE_LONG_SIDE = 1600
IMAGE_QUALITY = 82
PICTURES = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
MEDIA_TYPES = PICTURES | {'.svg', '.m4a', '.mp3'}

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def die(message):
    print(message)
    sys.exit(1)


def now():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')


def load_json(path):
    try:
        return json.loads(pathlib.Path(path).read_text(encoding='utf-8'))
    except FileNotFoundError:
        die(f'{path} is not there.')
    except ValueError as e:
        die(f'{path} is not valid JSON: {e}')


def save_json(path, value):
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')


# ---------- where things are

def app_dir(given=None):
    """The app's folder, which holds the parts: --app, PRIMER_APP, the path install.py left, or this script's repo."""
    for c in [given, os.environ.get('PRIMER_APP'), (HERE / 'app-path.txt').read_text(encoding='utf-8').strip() if (HERE / 'app-path.txt').exists() else None, HERE.parent]:
        if c and (pathlib.Path(c) / 'parts' / 'parts.json').exists():
            return pathlib.Path(c)
    die('Can\'t find the app (its parts/ folder). Pass --app <folder of the primer repo>, or set PRIMER_APP.')


def data_dir(given=None):
    """The local clone of the data repo: --data, PRIMER_DATA, or ~/Dev/primer-data."""
    found = given or os.environ.get('PRIMER_DATA') or str(pathlib.Path.home() / 'Dev' / 'primer-data')
    p = pathlib.Path(found)
    if not (p / '.git').exists():
        die(f'{p} is not a clone of the data repo. Pass --data <folder>, or set PRIMER_DATA.')
    return p


class Kit:
    """The parts' descriptions, read from the app, and the names a globe knows."""

    def __init__(self, app):
        self.app = app
        names = load_json(app / 'parts' / 'parts.json')['parts']
        self.parts = {n: load_json(app / 'parts' / n / 'part.json') for n in names}
        self._countries = None

    @property
    def countries(self):
        if self._countries is None:
            f = self.app / 'vendor' / 'countries-110m.json'
            world = load_json(f) if f.exists() else {'objects': {'countries': {'geometries': []}}}
            self._countries = {g['properties']['name'] for g in world['objects']['countries']['geometries'] if g.get('properties')}
        return self._countries


# ---------- rules, exactly as js/rules.js

def rule_read(state, path):
    v = state
    for k in str(path).split('.') if path else []:
        if v is None:
            return None
        v = v.get(k) if isinstance(v, dict) else None
    return v


def _num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def _same(a, b):
    return json.dumps(a, sort_keys=False) == json.dumps(b, sort_keys=False)


def rule_holds(rule, state):
    if not isinstance(rule, dict):
        return False
    if isinstance(rule.get('all'), list):
        return all(rule_holds(r, state) for r in rule['all'])
    if isinstance(rule.get('any'), list):
        return any(rule_holds(r, state) for r in rule['any'])
    if 'not' in rule:
        return not rule_holds(rule['not'], state)
    v = rule_read(state, rule.get('read'))
    if 'exists' in rule:
        return (v is not None) == bool(rule['exists'])
    if v is None:
        return False
    if 'is' in rule:
        return _same(v, rule['is'])
    if 'in' in rule:
        return isinstance(rule['in'], list) and any(_same(v, x) for x in rule['in'])
    if 'between' in rule:
        n = _num(v)
        return n is not None and rule['between'][0] <= n <= rule['between'][1]
    if 'absBetween' in rule:
        n = _num(v)
        return n is not None and rule['absBetween'][0] <= abs(n) <= rule['absBetween'][1]
    if 'near' in rule:
        n = _num(v)
        return n is not None and abs(n - rule['near']) <= (rule.get('within') or 0) + 1e-9
    if 'same' in rule:
        return _same(v, rule['same'])
    if 'pairs' in rule:
        want = rule['pairs'] or {}
        return isinstance(v, dict) and len(want) == len(v) and all(v.get(k) == x for k, x in want.items())
    if 'inCircle' in rule:
        c = rule['inCircle']
        return isinstance(v, dict) and _num(v.get('x')) is not None and _num(v.get('y')) is not None and ((v['x'] - c['x']) ** 2 + (v['y'] - c['y']) ** 2) ** 0.5 <= c['r'] + 1e-9
    return False


def rule_subst(rule, vars_):
    if isinstance(rule, str) and rule.startswith('$'):
        return vars_.get(rule[1:], rule)
    if isinstance(rule, list):
        return [rule_subst(r, vars_) for r in rule]
    if isinstance(rule, dict):
        return {k: rule_subst(v, vars_) for k, v in rule.items()}
    return rule


OPS = {'is', 'in', 'between', 'absBetween', 'near', 'same', 'pairs', 'inCircle', 'exists'}


def rule_problems(rule, state_names, where):
    """What's wrong with a rule's shape. state_names: the first parts of paths the part's state has."""
    out = []
    if not isinstance(rule, dict):
        return [f'{where}: a rule is an object, like {{"read": "value", "is": "a"}}']
    for k in ('all', 'any'):
        if k in rule:
            if not isinstance(rule[k], list) or not rule[k]:
                return [f'{where}: "{k}" takes a list of rules']
            for i, r in enumerate(rule[k]):
                out += rule_problems(r, state_names, f'{where}.{k}[{i}]')
            return out
    if 'not' in rule:
        return rule_problems(rule['not'], state_names, f'{where}.not')
    ops = [k for k in rule if k in OPS]
    if 'read' not in rule:
        out.append(f'{where}: no "read" (which value of the state to test)')
    elif state_names is not None and str(rule['read']).split('.')[0] not in state_names:
        out.append(f'{where}: reads "{rule["read"]}", but the part\'s state has only {", ".join(sorted(state_names))}')
    if len(ops) != 1:
        out.append(f'{where}: needs exactly one test of {", ".join(sorted(OPS))}')
    for k in ('between', 'absBetween'):
        if k in rule and not (isinstance(rule[k], list) and len(rule[k]) == 2 and all(_num(x) is not None for x in rule[k]) and rule[k][0] <= rule[k][1]):
            out.append(f'{where}: "{k}" takes [low, high]')
    if 'near' in rule and (_num(rule['near']) is None or _num(rule.get('within', 0)) is None):
        out.append(f'{where}: "near" takes a number, with "within"')
    unknown = set(rule) - OPS - {'read', 'within'}
    if unknown:
        out.append(f'{where}: no such rule word: {", ".join(sorted(unknown))}')
    return out


# ---------- checking

class Report:
    def __init__(self):
        self.errors, self.warnings = [], []

    def err(self, where, msg):
        self.errors.append(f'{where}: {msg}')

    def warn(self, where, msg):
        self.warnings.append(f'{where}: {msg}')


def answer_of(step):
    if 'answer' in step:
        return step['answer']
    inp = step.get('input') or {}
    if inp.get('form') == 'choice':
        right = [o.get('id') for o in inp.get('options') or [] if isinstance(o, dict) and o.get('right')]
        if len(right) == 1:
            return right[0]
    return None


def rules_of(step, inputs_desc):
    """The goal and the close rule, as the phone works them out (js/lesson.js, rulesOf)."""
    if step.get('kind') == 'play':
        return step.get('goal'), step.get('closeGoal')
    form = (step.get('input') or {}).get('form')
    m = (inputs_desc.get('marking') or {}).get(form)
    if not m:
        return step.get('goal'), None
    within = step.get('within', 0) or 0
    vars_ = {'answer': answer_of(step), 'within': within, 'close': step['close'] if 'close' in step else within * 2.5}
    goal = step.get('goal') or rule_subst(m['rule'], vars_)
    close = rule_subst(m['close'], vars_) if m.get('close') and ('close' in step or within > 0) else None
    return goal, close


def mark(step, state, inputs_desc):
    goal, close = rules_of(step, inputs_desc)
    right = bool(goal) and rule_holds(goal, state)
    near = (not right) and bool(close) and rule_holds(close, state)
    return 'right' if right else 'close' if near else 'wrong'


def check_value(spec, v, where, rep, kit, base):
    """One setting or argument against its description."""
    t = spec.get('type')
    if t == 'choice':
        if v not in spec['options']:
            rep.err(where, f'"{v}" isn\'t one of {", ".join(map(str, spec["options"]))}')
    elif t == 'bool':
        if not isinstance(v, bool):
            rep.err(where, 'is true or false')
    elif t == 'number':
        if _num(v) is None:
            rep.err(where, 'is a number')
        elif ('min' in spec and v < spec['min']) or ('max' in spec and v > spec['max']):
            rep.err(where, f'{v} is outside {spec.get("min")} to {spec.get("max")}')
    elif t in ('text', 'media'):
        if not isinstance(v, str):
            rep.err(where, 'is words')
        elif spec.get('maxLength') and len(v) > spec['maxLength']:
            rep.warn(where, f'is {len(v)} characters; keep it under {spec["maxLength"]}')
        if t == 'media' and isinstance(v, str) and v and base is not None and not media_exists(v, base):
            rep.err(where, f'{v} isn\'t in the topic\'s folder')
    elif t == 'lonlat':
        if not (isinstance(v, list) and len(v) == 2 and all(_num(x) is not None for x in v) and -180 <= v[0] <= 180 and -90 <= v[1] <= 90):
            rep.err(where, 'is [longitude, latitude]')
    elif t == 'place':
        if isinstance(v, str):
            if v not in kit.countries:
                rep.err(where, f'"{v}" isn\'t a country the globe knows (names as in Natural Earth, like "United States of America")')
        else:
            check_value({'type': 'lonlat'}, v, where, rep, kit, base)
    elif t == 'colour':
        if not (isinstance(v, str) and (v in spec.get('colours', []) or re.fullmatch(r'#[0-9a-fA-F]{6}', v))):
            rep.err(where, f'"{v}" isn\'t a colour: one of {", ".join(spec.get("colours", []))}, or #rrggbb')
    elif t == 'list':
        if not isinstance(v, list):
            rep.err(where, 'is a list')
            return
        if 'minItems' in spec and len(v) < spec['minItems'] and v:
            rep.err(where, f'has {len(v)}; it needs at least {spec["minItems"]}')
        if 'maxItems' in spec and len(v) > spec['maxItems']:
            rep.err(where, f'has {len(v)}; at most {spec["maxItems"]}')
        of = spec.get('of')
        if isinstance(of, dict):
            ids = []
            for i, item in enumerate(v):
                if not isinstance(item, dict) or not all(isinstance(item.get(k), str) and item.get(k) for k in of):
                    rep.err(f'{where}[{i}]', f'needs {", ".join(of)}')
                    continue
                ids.append(item['id'])
                if spec.get('maxText') and len(item.get('text', '')) > spec['maxText']:
                    rep.warn(f'{where}[{i}]', f'is {len(item["text"])} characters; keep it under {spec["maxText"]}')
            if len(set(ids)) != len(ids):
                rep.err(where, 'has the same id twice')
        elif of == 'country':
            for x in v:
                check_value({'type': 'place'}, x, where, rep, kit, base)
        elif of == 'text':
            for i, x in enumerate(v):
                if not isinstance(x, str):
                    rep.err(f'{where}[{i}]', 'is words')
                elif spec.get('maxText') and len(x) > spec['maxText']:
                    rep.warn(f'{where}[{i}]', f'keep it under {spec["maxText"]} characters')


def media_exists(rel, base):
    if rel.startswith('topics/'):
        return (base.parent.parent / rel).exists()
    return (base / rel).exists()


def check_settings(desc, settings, where, rep, kit, base, form=None, writer_keys=()):
    if not isinstance(settings, dict):
        rep.err(where, 'settings are an object')
        return
    for k, v in settings.items():
        spec = desc['settings'].get(k)
        if not spec:
            rep.err(f'{where}.{k}', f'{desc["name"]} has no setting "{k}" (it has {", ".join(desc["settings"])})')
            continue
        if form and spec.get('forms') and form not in spec['forms']:
            rep.warn(f'{where}.{k}', f'isn\'t used by the {form} form')
        value = v
        if k in ('options', 'items', 'left', 'right') and isinstance(v, list):
            value = [{kk: vv for kk, vv in o.items() if kk not in writer_keys} if isinstance(o, dict) else o for o in v]
        check_value(spec, value, f'{where}.{k}', rep, kit, base)


def check_call(desc, call, where, rep, kit, base):
    if not isinstance(call, list) or not call or not isinstance(call[0], str):
        rep.err(where, 'a call is a list: ["name", arg, ...]')
        return
    spec = desc.get('calls', {}).get(call[0])
    if not spec:
        rep.err(where, f'{desc["name"]} has no call "{call[0]}" (it has {", ".join(desc.get("calls", {}))})')
        return
    args = call[1:]
    need = [a for a in spec['args'] if not a.get('optional')]
    if len(args) < len(need):
        rep.err(where, f'{call[0]} needs {", ".join(a["name"] for a in need)}')
    if len(args) > len(spec['args']):
        rep.err(where, f'{call[0]} takes at most {len(spec["args"])} argument(s)')
    for a, v in zip(spec['args'], args):
        if a['type'] == 'answer':
            continue
        check_value({**a, 'colours': desc.get('colours', [])}, v, f'{where} {call[0]}({a["name"]})', rep, kit, base)


def check_shown(shown, where, rep, kit, base):
    """A figure or a part on screen: { part, settings, calls } or { image, alt }."""
    if not isinstance(shown, dict):
        rep.err(where, 'is { "part": ..., "settings": ..., "calls": ... } or { "image": ... }')
        return None
    if 'image' in shown:
        if base is not None and not media_exists(shown['image'], base):
            rep.err(where, f'{shown["image"]} isn\'t in the topic\'s folder')
        if not shown.get('alt'):
            rep.warn(where, 'a picture wants "alt": a few words on what it shows')
        return None
    desc = kit.parts.get(shown.get('part'))
    if not desc:
        rep.err(where, f'no part "{shown.get("part")}" (there are {", ".join(kit.parts)})')
        return None
    check_settings(desc, shown.get('settings', {}), f'{where}.settings', rep, kit, base)
    for i, c in enumerate(shown.get('calls', [])):
        check_call(desc, c, f'{where}.calls[{i}]', rep, kit, base)
    return desc


def check_words(step, where, rep):
    for k, limit in TEXT_LIMIT.items():
        v = step.get(k)
        if isinstance(v, str) and len(v.replace('*', '')) > limit:
            rep.warn(f'{where}.{k}', f'is {len(v)} characters; keep it under {limit}')


def check_choice(step, where, rep):
    opts = (step.get('input') or {}).get('options') or []
    if len(opts) < 2:
        rep.err(where, 'a choice needs at least two options')
        return
    ans = answer_of(step)
    ids = [o.get('id') for o in opts if isinstance(o, dict)]
    if ans is None:
        rep.err(where, 'no right option: give "answer", or mark exactly one option "right": true')
    elif ans not in ids:
        rep.err(where, f'the answer "{ans}" isn\'t one of the options')
    for o in opts:
        if not isinstance(o, dict):
            continue
        text = o.get('text', '')
        if NO_TELLS.search(text):
            rep.err(f'{where} option {o.get("id")}', f'"{text}": no "all of the above" or "none of the above": they give the game away')
        if o.get('id') == ans:
            continue
        if not o.get('tempting'):
            rep.err(f'{where} option {o.get("id")}', 'a wrong answer needs "tempting": why someone would really pick it. If no one would, it\'s not worth offering')
        if not o.get('why'):
            rep.err(f'{where} option {o.get("id")}', 'a wrong answer needs "why": the one line shown to someone who picks it')
    lens = [len(o.get('text', '')) for o in opts if isinstance(o, dict)]
    if lens and max(lens) > 1.6 * min(lens) + 6:
        rep.err(where, f'the options\' lengths run from {min(lens)} to {max(lens)} characters: make them similar, so the longest doesn\'t give it away')
    if (step.get('input') or {}).get('shuffle') is False:
        rep.warn(where, 'shuffle is off: the right answer then always sits in the same place')


def check_answer_shape(step, inputs_desc, where, rep):
    inp = step.get('input') or {}
    form, ans = inp.get('form'), answer_of(step)
    errors_before = len(rep.errors)
    if form in ('slider', 'number'):
        if _num(ans) is None:
            rep.err(where, 'the answer is a number')
            return
        lo, hi = inp.get('min', 0), inp.get('max', 100)
        if not (min(lo, hi) <= ans <= max(lo, hi)):
            rep.err(where, f'the answer {ans} is off the scale ({lo} to {hi})')
        if form == 'slider' and not step.get('within'):
            rep.warn(where, 'a slider with "within" 0 is right only on the exact value: give it some room')
        if form == 'slider':
            # A slider starts at a real value (start, or the middle of its scale) and can be checked as it is,
            # so where it starts must not give the answer away.
            log = inp.get('scale') == 'log' and lo > 0 and hi > lo
            mid = (lo * hi) ** 0.5 if log else (lo + hi) / 2
            start = inp.get('start', mid)
            said = 'starts' if 'start' in inp else f'starts in the middle of its scale, at {mid:g}'
            if _num(start) is not None:
                if not (min(lo, hi) <= start <= max(lo, hi)):
                    rep.err(where, f'the slider\'s start, {start}, is off the scale ({lo} to {hi})')
                else:
                    state = {'value': start, 'answered': True}
                    got = mark(step, state, inputs_desc)
                    if got == 'right':
                        rep.err(where, f'the slider {said}, which is already marked right: it gives the answer away. Set "start" well away from it')
                    elif got == 'close':
                        rep.warn(where, f'the slider {said}, which is already marked close: set "start" farther from the answer')
    elif form == 'order':
        ids = [i.get('id') for i in inp.get('items') or []]
        if not (isinstance(ans, list) and sorted(map(str, ans)) == sorted(map(str, ids))):
            rep.err(where, 'the answer is every item\'s id, in the right order')
    elif form == 'match':
        left = {i.get('id') for i in inp.get('left') or []}
        right = {i.get('id') for i in inp.get('right') or []}
        if not (isinstance(ans, dict) and set(ans) == left and set(ans.values()) <= right and len(set(ans.values())) == len(ans)):
            rep.err(where, 'the answer pairs every left id with a different right id')
    elif form == 'spot':
        if not (isinstance(ans, dict) and all(_num(ans.get(k)) is not None and 0 <= ans[k] <= 1 for k in ('x', 'y', 'r'))):
            rep.err(where, 'the answer is { "x", "y", "r" }, each from 0 to 1')
    if len(rep.errors) == errors_before and ans is not None:
        # the answer itself must be marked right, or the step can't be passed
        state = {'value': {'x': ans['x'], 'y': ans['y']} if form == 'spot' else ans, 'answered': True}
        if mark(step, state, inputs_desc) != 'right':
            rep.err(where, 'giving the answer itself isn\'t marked right: the step can\'t be passed')


def check_tries(step, desc, inputs_desc, where, rep):
    tries = step.get('tries') or []
    marks = []
    for i, t in enumerate(tries):
        if not isinstance(t, dict) or 'state' not in t or t.get('marked') not in ('right', 'close', 'wrong'):
            rep.err(f'{where}.tries[{i}]', 'a try is { "state": {...}, "marked": "right" | "close" | "wrong" }')
            continue
        got = mark(step, t['state'], inputs_desc)
        marks.append(got)
        if got != t['marked']:
            rep.err(f'{where}.tries[{i}]', f'should be marked {t["marked"]}, but the goal marks it {got}: {json.dumps(t["state"], ensure_ascii=False)}')
    return marks


def check_lesson(lesson, where, rep, kit, base, node_kind='lesson'):
    """A lesson, test or exam file: the same shape, played step by step. node_kind says which it is on the path."""
    if not isinstance(lesson, dict):
        rep.err(where, 'a lesson is an object')
        return
    for k in set(lesson) - LESSON_FIELDS:
        rep.err(where, f'no field "{k}" in a lesson')
    if lesson.get('v') != 1:
        rep.err(where, '"v" is 1')
    if not lesson.get('title'):
        rep.err(where, 'no title')
    sources = lesson.get('sources') or []
    if not sources:
        rep.err(where, 'no sources: every lesson says where its facts come from')
    source_ids = set()
    for i, s in enumerate(sources):
        if not isinstance(s, dict) or not s.get('id') or not (s.get('title') or s.get('by')):
            rep.err(f'{where}.sources[{i}]', 'a source has an id, and a title or who it\'s by')
            continue
        source_ids.add(s['id'])
        for k in set(s) - SOURCE_FIELDS:
            rep.warn(f'{where}.sources[{i}]', f'no field "{k}" in a source')
        if not s.get('checked'):
            rep.warn(f'{where}.sources[{i}]', '"checked": when it was read, or "recalled" if it wasn\'t re-read')
    steps = lesson.get('steps')
    if not isinstance(steps, list) or not steps:
        rep.err(where, 'no steps')
        return
    if not STEPS_RANGE[0] <= len(steps) <= STEPS_RANGE[1]:
        rep.warn(where, f'{len(steps)} steps: a {node_kind} is usually {STEPS_RANGE[0]} to {STEPS_RANGE[1]}')
    inputs_desc = kit.parts.get('inputs', {})
    seen, cited, forms = set(), set(), []
    for n, step in enumerate(steps):
        sid = step.get('id') if isinstance(step, dict) else None
        w = f'{where} step {n + 1}' + (f' ({sid})' if sid else '')
        if not isinstance(step, dict):
            rep.err(w, 'a step is an object')
            continue
        if not sid or not SLUG.match(str(sid)):
            rep.err(w, 'needs an "id" of lower case words joined by hyphens')
        elif sid in seen:
            rep.err(w, 'the same id as an earlier step')
        seen.add(sid)
        kind = step.get('kind')
        if kind not in KINDS:
            rep.err(w, f'"kind" is one of {", ".join(sorted(KINDS))}')
            continue
        for k in set(step) - STEP_FIELDS[kind]:
            rep.err(w, f'no field "{k}" on a {kind} step')
        if not step.get('title'):
            rep.warn(w, 'no "title": progress names the step by it')
        check_words(step, w, rep)
        src = step.get('src') or []
        for s in src:
            if s not in source_ids:
                rep.err(w, f'cites "{s}", which isn\'t in the sources')
            cited.add(s)
        words = ' '.join(str(step.get(k, '')) for k in ('text', 'ask', 'right', 'why'))
        if not src and re.search(r'\d', words):
            rep.warn(w, 'has numbers but cites no source ("src")')
        if kind == 'explain':
            if not step.get('text'):
                rep.err(w, 'an explain step needs "text"')
            if 'figure' in step:
                check_shown(step['figure'], f'{w}.figure', rep, kit, base)
            continue
        if not step.get('ask'):
            rep.err(w, f'a {kind} step needs "ask"')
        for i, m in enumerate(step.get('misses') or []):
            if not isinstance(m, dict) or 'when' not in m or not m.get('why'):
                rep.err(f'{w}.misses[{i}]', 'a miss is { "when": rule, "why": "..." }')
        if kind == 'check':
            fig_desc = check_shown(step['figure'], f'{w}.figure', rep, kit, base) if 'figure' in step else None
            inp = step.get('input')
            if not isinstance(inp, dict) or inp.get('form') not in inputs_desc['settings']['form']['options']:
                rep.err(w, f'"input" is the Inputs part\'s settings, with "form" one of {", ".join(inputs_desc["settings"]["form"]["options"])}')
                continue
            forms.append(inp['form'])
            check_settings(inputs_desc, inp, f'{w}.input', rep, kit, base, form=inp['form'], writer_keys=OPTION_WRITER_FIELDS)
            names = set(inputs_desc.get('state', {}))
            for i, m in enumerate(step.get('misses') or []):
                if isinstance(m, dict) and 'when' in m:
                    for p in rule_problems(m['when'], names, f'{w}.misses[{i}].when'):
                        rep.err(w, p)
            if inp['form'] == 'choice':
                check_choice(step, w, rep)
                if step.get('misses'):
                    rep.warn(w, 'on a choice, each wrong option\'s own "why" is shown; "misses" is never used')
            else:
                check_answer_shape(step, inputs_desc, w, rep)
                if not step.get('why') and not step.get('misses'):
                    rep.warn(w, 'no "why" or "misses": a wrong answer would be shown nothing to learn from')
            if step.get('tries'):
                check_tries(step, None, inputs_desc, w, rep)
            if step.get('then'):
                if not fig_desc:
                    rep.err(w, '"then" runs on the figure, and this step has no part as its figure')
                else:
                    for i, c in enumerate(step['then']):
                        check_call(fig_desc, c, f'{w}.then[{i}]', rep, kit, base)
        if kind == 'play':
            desc = check_shown(step.get('play'), f'{w}.play', rep, kit, base)
            if not desc:
                continue
            names = set(desc.get('state', {}))
            if not step.get('goal'):
                rep.err(w, 'a play step needs a "goal": a rule over the part\'s state')
                continue
            for k in ('goal', 'closeGoal', 'ready'):
                if k in step:
                    for p in rule_problems(step[k], names, f'{w}.{k}'):
                        rep.err(w, p)
            for i, m in enumerate(step.get('misses') or []):
                if isinstance(m, dict) and 'when' in m:
                    for p in rule_problems(m['when'], names, f'{w}.misses[{i}].when'):
                        rep.err(w, p)
            for i, c in enumerate(step.get('then') or []):
                check_call(desc, c, f'{w}.then[{i}]', rep, kit, base)
            if not step.get('tries'):
                rep.err(w, 'a play step needs "tries": plausible inputs and what they should be marked, a realistic wrong one among them. A goal that can\'t be failed teaches nothing')
            else:
                marks = check_tries(step, desc, inputs_desc, w, rep)
                if marks and 'wrong' not in marks:
                    rep.err(w, 'none of its tries is wrong: give a plausible wrong input, so the step is shown to be possible to fail')
                if marks and 'right' not in marks:
                    rep.warn(w, 'none of its tries is right: give one, so the step is shown to be possible to pass')
            if not step.get('why') and not step.get('misses'):
                rep.warn(w, 'no "why" or "misses": a wrong answer would be shown nothing to learn from')
    for s in source_ids - cited:
        rep.warn(where, f'the source "{s}" isn\'t cited by any step')
    if forms and all(f == 'choice' for f in forms) and not any(isinstance(s, dict) and s.get('kind') == 'play' for s in steps):
        rep.warn(where, 'every question is a choice: a slider, a number, an order or a placement leaves more room to be realistically wrong')
    if node_kind in QUESTIONS_AT_LEAST:
        asked = [s for s in steps if isinstance(s, dict) and s.get('kind') in ('check', 'play')]
        explains = [s.get('id') for s in steps if isinstance(s, dict) and s.get('kind') == 'explain']
        if not asked:
            rep.err(where, f'a {node_kind} asks questions, and this one has none')
        elif len(asked) < QUESTIONS_AT_LEAST[node_kind]:
            rep.warn(where, f'{len(asked)} question(s): a {node_kind} usually has at least {QUESTIONS_AT_LEAST[node_kind]}')
        if explains:
            rep.warn(where, f'a {node_kind} is questions on what came before; explain steps ({", ".join(map(str, explains))}) belong in a lesson')


def check_topic(folder, rep, kit):
    t = load_json(folder / 'topic.json')
    where = f'{folder.name}/topic.json'
    if not SLUG.match(folder.name):
        rep.err(where, f'the folder name "{folder.name}" is the topic\'s id: lower case words joined by hyphens')
    for k in set(t) - TOPIC_FIELDS - {'lessons'}:
        rep.err(where, f'no field "{k}" in a topic')
    if t.get('v') != 1:
        rep.err(where, '"v" is 1')
    if not t.get('title'):
        rep.err(where, 'no title')
    if t.get('level') not in LEVELS:
        rep.err(where, f'"level" is one of {", ".join(LEVELS)}')
    if t.get('colour') not in COLOURS:
        rep.err(where, f'"colour" is one of {", ".join(sorted(COLOURS))}')
    if t.get('mark') not in MARKS:
        rep.err(where, f'"mark" is one of {", ".join(sorted(MARKS))}')
    if 'lessons' in t:
        rep.err(where, '"lessons" became "path": the nodes in order, like [{"kind": "lesson", "id": "warm-water"}, {"kind": "chest", "id": "first-chest"}]')
    path = t.get('path')
    if not isinstance(path, list) or not path:
        if 'lessons' not in t:
            rep.err(where, 'no "path": the nodes in order, each {"kind": ..., "id": ...}')
        return t
    seen, done_before = set(), []
    for n, node in enumerate(path):
        w = f'{where} path[{n}]'
        if not isinstance(node, dict):
            rep.err(w, 'a node is {"kind": ..., "id": ...}')
            continue
        kind, nid = node.get('kind'), node.get('id')
        w += f' ({nid})' if nid else ''
        if kind not in NODE_KINDS:
            rep.err(w, f'"kind" is one of {", ".join(NODE_KINDS)}')
            continue
        if not nid or not SLUG.match(str(nid)):
            rep.err(w, 'needs an "id" of lower case words joined by hyphens')
            continue
        if nid in seen or nid == 'topic':
            rep.err(w, 'the same id as an earlier node' if nid in seen else '"topic" is taken by topic.json')
        seen.add(nid)
        for k in set(node) - NODE_FIELDS:
            rep.err(w, f'no field "{k}" on a node')
        for k in ('title', 'unit'):
            if k in node and (not isinstance(node[k], str) or not node[k].strip()):
                rep.err(w, f'"{k}" is words')
            elif isinstance(node.get(k), str) and len(node[k]) > TEXT_LIMIT['title']:
                rep.warn(w, f'"{k}" is {len(node[k])} characters; keep it under {TEXT_LIMIT["title"]}')
        f = folder / f'{nid}.json'
        if kind in PLAYED:
            if 'title' in node:
                rep.warn(w, f'a {kind}\'s title is the one in {nid}.json; this one isn\'t shown')
            if not f.exists():
                rep.err(w, f'a {kind} is a file, and {nid}.json isn\'t there')
            else:
                check_lesson(load_json(f), f'{folder.name}/{nid}.json', rep, kit, folder, kind)
            if kind in ('test', 'exam') and not any(k == 'lesson' for k in done_before):
                rep.err(w, f'a {kind} draws on the lessons before it, and there are none before this one')
        else:
            if f.exists():
                rep.warn(w, f'a {kind} has no file, so {nid}.json is never read')
            if kind == 'review' and not any(k in PLAYED for k in done_before):
                rep.err(w, 'a review goes over what came before it, and nothing played comes before this one')
            if kind == 'chest' and not done_before:
                rep.warn(w, 'a chest is a reward for reaching it: it\'s first on the path, so it rewards nothing')
            if kind == 'chest' and done_before and done_before[-1] == 'chest':
                rep.warn(w, 'two chests in a row')
            if kind == 'animation' and 'title' not in node:
                rep.warn(w, 'an animation wants a "title": it\'s all the path can show of it until stage 2')
        done_before.append(kind)
    lessons = [nd.get('id') for nd in path if isinstance(nd, dict) and nd.get('kind') == 'lesson']
    lo, hi = LEVELS.get(t.get('level'), (1, 99))
    if not lessons:
        rep.err(where, 'no lessons on the path')
    elif not lo <= len(lessons) <= hi:
        rep.warn(where, f'{len(lessons)} lesson(s) for {t.get("level")}, which is usually {lo} to {hi}')
    extra = {p.stem for p in folder.glob('*.json')} - seen - {'topic'}
    for x in sorted(extra):
        rep.warn(where, f'{x}.json is in the folder but not on the path, so it won\'t be shown')
    return t


def played_ids(topic):
    """The ids of a topic's nodes that are a file each (lessons, tests and exams), in path order."""
    return [n['id'] for n in topic.get('path') or [] if isinstance(n, dict) and n.get('kind') in PLAYED and n.get('id')]


def path_words(topic):
    """The path in a few words, for a commit message: 2 lessons, a chest and a test."""
    counts = {}
    for n in topic.get('path') or []:
        if isinstance(n, dict) and n.get('kind') in NODE_KINDS:
            counts[n['kind']] = counts.get(n['kind'], 0) + 1
    parts = [f'{c} {k}{"s" if c != 1 else ""}' if c != 1 or k == 'lesson' else f'a{"n" if k[0] in "aeiou" else ""} {k}' for k, c in sorted(counts.items(), key=lambda kc: NODE_KINDS.index(kc[0]))]
    return parts[0] if len(parts) == 1 else ', '.join(parts[:-1]) + ' and ' + parts[-1]


def resolve_target(target, data=None):
    """A topic folder, a lesson file, or a topic id in the data clone."""
    p = pathlib.Path(target)
    if p.is_dir() and (p / 'topic.json').exists():
        return 'topic', p
    if p.is_file():
        return 'lesson', p
    if data and (data / 'topics' / target / 'topic.json').exists():
        return 'topic', data / 'topics' / target
    die(f'{target} isn\'t a topic folder (with a topic.json), a lesson file, or a topic in the data repo.')


def run_check(targets, kit, data=None):
    rep = Report()
    for target in targets:
        kind, p = resolve_target(target, data)
        if kind == 'topic':
            check_topic(p, rep, kit)
        else:
            node_kind = 'lesson'
            if (p.parent / 'topic.json').exists():
                topic = load_json(p.parent / 'topic.json')
                node_kind = next((n.get('kind') for n in topic.get('path') or [] if isinstance(n, dict) and n.get('id') == p.stem), 'lesson')
            check_lesson(load_json(p), p.name, rep, kit, p.parent, node_kind)
    return rep


def print_report(rep):
    for e in rep.errors:
        print(f'  error: {e}')
    for w in rep.warnings:
        print(f'  warning: {w}')
    if not rep.errors and not rep.warnings:
        print('  All good.')
    elif not rep.errors:
        print(f'  No errors, {len(rep.warnings)} warning(s).')
    else:
        print(f'  {len(rep.errors)} error(s), {len(rep.warnings)} warning(s).')


# ---------- commands

def cmd_parts(a):
    kit = Kit(app_dir(a.app))
    if a.json:
        print(json.dumps(kit.parts, ensure_ascii=False, indent=1))
        return
    for name, d in kit.parts.items():
        print(f'{name}: {d["title"]}')
        print(f'  {d["about"]}')
        print('  settings:')
        for k, s in d['settings'].items():
            rng = f' {", ".join(map(str, s["options"]))}' if s['type'] == 'choice' else f' {s.get("min")} to {s.get("max")}' if s['type'] == 'number' else ''
            forms = f' (forms: {", ".join(s["forms"])})' if s.get('forms') else ''
            print(f'    {k} ({s["type"]}{rng}; default {json.dumps(s.get("default"), ensure_ascii=False)}){forms}: {s.get("about", "")}')
        print('  calls:')
        for k, c in d.get('calls', {}).items():
            args = ', '.join(f'{x["name"]}{"?" if x.get("optional") else ""}: {x["type"]}' for x in c['args'])
            print(f'    {k}({args}): {c.get("about", "")}')
        if d.get('events'):
            print('  events: ' + '; '.join(f'{k} {e.get("gives", "")}' for k, e in d['events'].items()))
        print('  state: ' + '; '.join(f'{k}: {s.get("about", s.get("type", ""))}' for k, s in d.get('state', {}).items()))
        if d.get('marking'):
            print('  marking: ' + '; '.join(f'{k}: {json.dumps(m["rule"], ensure_ascii=False)}' for k, m in d['marking'].items() if k != 'about'))
        print(f'  needs: {d.get("needs", {}).get("weight", "")}')
        print()


def cmd_check(a):
    kit = Kit(app_dir(a.app))
    data = pathlib.Path(a.data) if a.data else None
    rep = run_check(a.targets, kit, data)
    print_report(rep)
    sys.exit(1 if rep.errors else 0)


def fit_steps(lesson_file, topic_dir, a, app):
    node = shutil.which('node')
    if not node:
        die('fit needs Node 22 or newer on PATH, to drive a headless browser.')
    script = HERE / 'fit.mjs'
    args = [node, str(script), '--app', str(app), '--lesson', str(lesson_file), '--topic', str(topic_dir)]
    if a.browser:
        args += ['--browser', a.browser]
    if a.shots:
        args += ['--shots', a.shots]
    if a.debug_port:
        args += ['--debug-port', str(a.debug_port)]
    r = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode:
        die(f'fit could not draw the lesson:\n{(r.stderr or r.stdout).strip()[-1500:]}')
    return json.loads(r.stdout.strip().splitlines()[-1])


def cmd_fit(a):
    app = app_dir(a.app)
    kind, p = resolve_target(a.target, pathlib.Path(a.data) if a.data else None)
    lessons = [(p / f'{lid}.json', p) for lid in played_ids(load_json(p / 'topic.json'))] if kind == 'topic' else [(p, p.parent)]
    out, worst = {}, 0
    for f, topic_dir in lessons:
        res = fit_steps(f, topic_dir, a, app)
        out[f.stem] = res
        if a.json:
            continue
        print(f'{f.stem}:')
        for s in res['steps']:
            print(f'  {s["step"]:<18} {s["verdict"]:<8} {s["words"]}')
            worst = max(worst, {'fits': 0, 'tight': 1, 'scrolls': 2}[s['verdict']])
    if a.json:
        print(json.dumps(out, ensure_ascii=False))
    else:
        print('  (drawn in headless Edge on the smallest iPhone, 375 x 667, and on an iPhone 11, 414 x 896)')
    sys.exit(0)


# ---------- sending

def git(data, *args, check=True):
    r = subprocess.run(['git', *args], cwd=data, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if check and r.returncode:
        die(f'git {" ".join(args)} failed:\n{r.stderr.strip() or r.stdout.strip()}')
    return r


def shrink_picture(source, target):
    """Pictures go up at most IMAGE_LONG_SIDE pixels on the long side. A drawing (SVG) goes as it is."""
    target.parent.mkdir(parents=True, exist_ok=True)
    if source.suffix.lower() not in PICTURES - {'.gif'}:
        shutil.copyfile(source, target)
        return target
    try:
        from PIL import Image
    except ImportError:
        shutil.copyfile(source, target)
        print(f'  warning: Pillow isn\'t installed, so {source.name} went up full size.')
        return target
    with Image.open(source) as im:
        if max(im.size) <= IMAGE_LONG_SIDE:
            shutil.copyfile(source, target)
            return target
        im.thumbnail((IMAGE_LONG_SIDE, IMAGE_LONG_SIDE))
        if source.suffix.lower() in ('.jpg', '.jpeg'):
            im.convert('RGB').save(target, 'JPEG', quality=IMAGE_QUALITY, optimize=True)
        else:
            im.save(target, optimize=True)
    return target


def write_index(data):
    topics = []
    old = load_json(data / 'index.json') if (data / 'index.json').exists() else {'topics': []}
    order = [t['id'] for t in old.get('topics', [])]
    folders = sorted((data / 'topics').glob('*/topic.json')) if (data / 'topics').exists() else []
    ids = [f.parent.name for f in folders]
    for tid in sorted(ids, key=lambda x: (order.index(x) if x in order else len(order), x)):
        t = load_json(data / 'topics' / tid / 'topic.json')
        lessons = sum(1 for n in t.get('path') or [] if isinstance(n, dict) and n.get('kind') == 'lesson') if 'path' in t else len(t.get('lessons', []))
        topics.append({'id': tid, 'title': t.get('title'), 'level': t.get('level'), 'lessons': lessons})
    if topics != old.get('topics'):  # an index that hasn't changed isn't touched, so sending again sends nothing
        save_json(data / 'index.json', {'v': 1, 'updated': now(), 'topics': topics})


def publish(data, message, paths, push=True):
    """Commits only these paths, then pushes. Progress can land at any moment, so a refused push pulls and tries once more."""
    names = [os.path.relpath(p, data).replace('\\', '/') for p in paths]
    git(data, 'add', '--all', '--', *names)
    if not git(data, 'diff', '--cached', '--name-only', '--', *names).stdout.strip():
        print('Nothing changed, so nothing was sent.')
        return False
    user = getpass.getuser()
    if user and len(user) > 2 and user.lower() in git(data, 'diff', '--cached', '--', *names).stdout.lower():
        git(data, 'reset', '-q', '--', *names)
        die('Stopped: the change holds the name of this computer\'s user, which must not go into a repo. Nothing was committed.')
    git(data, 'commit', '-q', '-m', f'{message}\n\n{ATTRIBUTION}', '--', *names)
    if push:
        if git(data, 'push', '-q', 'origin', 'HEAD', check=False).returncode:
            git(data, 'pull', '-q', '--rebase', '--autostash')
            git(data, 'push', '-q', 'origin', 'HEAD')
    print(f'Sent: {message}')
    return True


def cmd_send(a):
    kit = Kit(app_dir(a.app))
    data = data_dir(a.data)
    src = pathlib.Path(a.topic)
    if not (src / 'topic.json').exists():
        die(f'{src} isn\'t a topic folder: it has no topic.json.')
    rep = Report()
    topic = check_topic(src, rep, kit)
    print_report(rep)
    if rep.errors:
        die('Not sent: fix the errors first.')
    if git(data, 'pull', '-q', '--ff-only', check=False).returncode:
        print('  warning: couldn\'t update the clone from GitHub first; sending what\'s here.')
    tid = src.name
    dest = data / 'topics' / tid
    played = played_ids(topic)
    if dest.resolve() != src.resolve():
        keep = {'topic.json', *(f'{lid}.json' for lid in played)}
        dest.mkdir(parents=True, exist_ok=True)
        for old in dest.glob('*.json'):
            if old.name not in keep:
                old.unlink()  # a lesson taken off the path goes from the repo too
        for name in keep:
            shutil.copyfile(src / name, dest / name)
        used = set()
        for lid in played:
            text = (src / f'{lid}.json').read_text(encoding='utf-8')
            used |= set(re.findall(r'"(media/[^"]+)"', text))
        for rel in sorted(used):
            s = src / rel
            if s.exists() and s.suffix.lower() in MEDIA_TYPES:
                shrink_picture(s, dest / rel)
        weight = sum(f.stat().st_size for f in (dest / 'media').rglob('*') if f.is_file()) if (dest / 'media').exists() else 0
        if weight:
            print(f'  media: {weight / 1024:.0f} KB')
    write_index(data)
    message = a.message or f'Topic: {topic["title"]} ({path_words(topic)})'
    publish(data, message, [dest, data / 'index.json'], push=not a.no_push)


# ---------- reading progress

def read_progress(data, since=None):
    events, seen, files = [], set(), []
    for f in sorted((data / 'progress').glob('*.json')) if (data / 'progress').exists() else []:
        if f.name.startswith('connect-check'):
            continue
        try:
            batch = json.loads(f.read_text(encoding='utf-8'))
        except ValueError:
            print(f'  warning: {f.name} can\'t be read')
            continue
        files.append(f)
        for e in batch.get('events', []):
            if e.get('eid') in seen:
                continue
            seen.add(e.get('eid'))
            e['_device'] = batch.get('device')
            events.append(e)
    events.sort(key=lambda e: e.get('at', ''))
    if since:
        events = [e for e in events if e.get('at', '') > since]
    return events, files


def show_value(v):
    if isinstance(v, dict) and 'tapped' in v:
        t = v.get('tapped') or {}
        where = f'{abs(t.get("lat", 0)):.1f}°{"N" if t.get("lat", 0) >= 0 else "S"} {abs(t.get("lon", 0)):.1f}°{"E" if t.get("lon", 0) >= 0 else "W"}'
        return f'tapped {where}{" on " + t["country"] if t.get("country") else " (sea)" if t.get("land") is False else ""}' + (f', selected {v["selected"]}' if v.get('selected') else '')
    return json.dumps(v, ensure_ascii=False)


def cmd_progress(a):
    data = data_dir(a.data)
    if git(data, 'pull', '-q', '--ff-only', check=False).returncode:
        print('  warning: couldn\'t update from GitHub, so this is what the clone already has.')
    read = load_json(data / 'read.json') if (data / 'read.json').exists() else {}
    since = a.since or (None if a.all else read.get('at'))
    events, files = read_progress(data, since)
    if a.topic:
        events = [e for e in events if e.get('topic') == a.topic]
    if a.json:
        print(json.dumps(events, ensure_ascii=False, indent=1))
    elif not events:
        print(f'Nothing new{" since " + since if since else ""}.')
    else:
        print(f'{len(events)} event(s){" since " + since if since else ""}:')
        by_lesson, opened = {}, {}
        for e in events:
            if e.get('type') == 'open':  # a chest opened, or a review or animation visited: no steps
                opened.setdefault((e.get('topic'), e.get('node'), e.get('kind')), []).append(e)
                continue
            by_lesson.setdefault((e.get('topic'), e.get('lesson')), []).append(e)
        for (topic, node, kind), evs in opened.items():
            print(f'\n{topic} › {node} ({kind}): opened {len(evs)} time(s), first at {evs[0].get("at", "?")}')
        for (topic, lesson), evs in by_lesson.items():
            title = lesson
            lf = data / 'topics' / str(topic) / f'{lesson}.json'
            steps = {}
            if lf.exists():
                L = load_json(lf)
                title = L.get('title', lesson)
                steps = {s.get('id'): s for s in L.get('steps', [])}
            versions = sorted({e.get('version') for e in evs if e.get('version') is not None})
            print(f'\n{topic} › {title}' + (f' (version {", ".join(map(str, versions))})' if versions else ''))
            starts = sum(1 for e in evs if e['type'] == 'start')
            finishes = [e for e in evs if e['type'] == 'finish']
            leaves = [e for e in evs if e['type'] == 'leave']
            line = f'  {starts} run(s) started, {len(finishes)} finished'
            if finishes:
                line += f'; last finish {finishes[-1].get("right")} of {finishes[-1].get("of")} right'
            if leaves:
                line += f'; left early at {", ".join(e.get("step", "?") for e in leaves)}'
            print(line)
            for sid in [s for s in steps] or sorted({e.get('step') for e in evs if e.get('step')}):
                tries = [e for e in evs if e['type'] == 'attempt' and e.get('step') == sid]
                if not tries:
                    continue
                st = steps.get(sid, {})
                marks = ['right' if t.get('right') else 'close' if t.get('close') else 'wrong' for t in tries]
                print(f'  {sid} ({st.get("title", "")}): {", ".join(marks)}')
                for t, m in zip(tries, marks):
                    if m != 'right':
                        print(f'    {m}: {show_value(t.get("value"))}' + (f'  shown: "{t["why"]}"' if t.get('why') else ''))
    if a.mark_read:
        save_json(data / 'read.json', {'v': 1, 'at': now(), 'files': [f'progress/{f.name}' for f in files]})
        publish(data, 'Progress read', [data / 'read.json'], push=not a.no_push)


def main():
    p = argparse.ArgumentParser(prog='primer', description='The writer\'s side of Primer. See SKILL.md.')
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument('--app', help='the app\'s folder (the primer repo), for the parts')
    common.add_argument('--data', help='the local clone of primer-data')
    sub = p.add_subparsers(dest='cmd', required=True)
    plain = sub.add_parser
    sub.add_parser = lambda *x, **k: plain(*x, parents=[common], **k)
    s = sub.add_parser('parts',help='every part, with its settings, calls, events and state')
    s.add_argument('--json', action='store_true')
    s.set_defaults(fn=cmd_parts)
    s = sub.add_parser('check', help='check topics or lessons against the format and the parts')
    s.add_argument('targets', nargs='+', help='topic folders, lesson files, or topic ids in the data clone')
    s.set_defaults(fn=cmd_check)
    s = sub.add_parser('fit', help='draw each step on the smallest iPhone and say whether it fits')
    s.add_argument('target')
    s.add_argument('--json', action='store_true')
    s.add_argument('--shots', help='a folder for a picture of each step')
    s.add_argument('--browser', help='Edge or Chrome, if it isn\'t found by itself')
    s.add_argument('--debug-port', type=int)
    s.set_defaults(fn=cmd_fit)
    s = sub.add_parser('send', help='check a topic, shrink its pictures, put it in the data clone, commit and push')
    s.add_argument('topic', help='the topic\'s folder')
    s.add_argument('--message')
    s.add_argument('--no-push', action='store_true', help='commit, but don\'t push')
    s.set_defaults(fn=cmd_send)
    s = sub.add_parser('progress', help='what came back from the phone')
    s.add_argument('--topic')
    s.add_argument('--since', help='an ISO time; the default is since the last --mark-read')
    s.add_argument('--all', action='store_true', help='everything, not just what\'s new')
    s.add_argument('--json', action='store_true')
    s.add_argument('--mark-read', action='store_true', help='and record it as read, which the phone shows')
    s.add_argument('--no-push', action='store_true')
    s.set_defaults(fn=cmd_progress)
    a = p.parse_args()
    a.fn(a)


if __name__ == '__main__':
    main()
