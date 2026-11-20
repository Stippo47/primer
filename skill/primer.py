#!/usr/bin/env python3
"""The writer's side of Primer: list the parts, check a lesson, see whether it fits, voice its scenes, send a
topic, read progress.

Lessons live in the private data repo (primer-data); the app and its parts live in the public one. This script
reads the parts' descriptions from the app, and works on a local clone of the data repo with plain git.
See SKILL.md for the commands, and the app's docs/format.md for the files.
"""
import argparse
import getpass
import hashlib
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
KINDS = {'explain', 'check', 'play', 'scene'}
SLUG = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
TOPIC_FIELDS = {'v', 'title', 'level', 'colour', 'mark', 'about', 'path', 'subject', 'narrator'}
# The nodes on a topic's path. Played ones (lesson, test, exam) are a file each, <id>.json, and so is an
# animation: a scene. Without its file an animation is a placeholder. A chest and a review are the node alone.
NODE_KINDS = ('lesson', 'test', 'exam', 'chest', 'review', 'animation')
PLAYED = {'lesson', 'test', 'exam'}
NODE_FIELDS = {'kind', 'id', 'title', 'unit'}
QUESTIONS_AT_LEAST = {'test': 3, 'exam': 5}
LESSON_FIELDS = {'v', 'title', 'version', 'minutes', 'steps', 'sources', 'facts', 'families', 'draw'}
STEP_FIELDS = {
    'explain': {'id', 'kind', 'title', 'text', 'say', 'figure', 'src', 'fact'},
    'check': {'id', 'kind', 'title', 'ask', 'say', 'figure', 'input', 'answer', 'within', 'close', 'right', 'why', 'misses', 'then', 'tries', 'src', 'fact'},
    'play': {'id', 'kind', 'title', 'ask', 'say', 'play', 'goal', 'closeGoal', 'ready', 'right', 'why', 'misses', 'then', 'tries', 'src', 'fact'},
    'scene': {'id', 'kind', 'title', 'parts', 'lines', 'src', 'shot'},
}
# Facts (docs/format.md, "Facts"): what a lesson says is worth knowing afterward, each with two or more asks.
FACT_FIELDS = {'id', 'text', 'src', 'asks'}
FAMILY_FIELDS = {'id', 'about', 'rows', 'fact', 'asks'}
FACT_TEXT_LIMIT = 180
DRAW_FROM = ('unit', 'topic')
# The words of a step that are read aloud, with Voice on: its text or its question, and whichever line of
# feedback is shown after an answer. `say` on a step gives any of them its own spoken wording.
SPOKEN_FIELDS = {'explain': ('text',), 'check': ('ask', 'right', 'why'), 'play': ('ask', 'right', 'why')}
# Scenes: an animation's file, or a scene step in a lesson (docs/format.md, "A scene"). An animation plays
# through like a video: nothing in it waits for an answer.
SCENE_FILE_FIELDS = {'v', 'title', 'version', 'minutes', 'parts', 'lines', 'sources', 'shot'}
LINE_FIELDS = {'id', 'text', 'say', 'do', 'hold'}
ACTION_FIELDS = {'call', 'at', 'from', 'to', 'sound', 'ease', 'range'}
# A stretch's ease (js/ease.js, EASES): soft eases in and out, the default; the motion families measured in the
# second study (camera, transition, furniture, process, accumulate) by name.
EASES = ('soft', 'linear', 'in', 'out', 'camera', 'transition', 'furniture', 'process', 'accumulate')
LINE_LIMIT = 200          # characters in a caption
LINES_RANGE = (2, 30)     # a scene step in a lesson
ANIMATION_LINES = (2, 60) # an animation on the path, which can run four minutes or so (ruled 2026-11-18, 2026-11-19)
SYMBOLS = re.compile(r'[°%/&+=<>@#~^]')   # read aloud in ways no one can be sure of: say how, with "say"

# The four narrators kept from stage 0, each made by the engine that has it. Nobody's voice is copied:
# Kokoro's voices ship with it, and Chatterbox A is Chatterbox's built-in voice with no reference recording.
NARRATORS = {
    'heart': {'name': 'Heart', 'engine': 'kokoro', 'voice': 'af_heart'},
    'george': {'name': 'George', 'engine': 'kokoro', 'voice': 'bm_george'},
    'bella': {'name': 'Bella', 'engine': 'kokoro', 'voice': 'af_bella'},
    'chatterbox-a': {'name': 'Chatterbox A', 'engine': 'chatterbox', 'voice': 'default', 'settings': {'exaggeration': 0.5, 'cfg_weight': 0.5, 'temperature': 0.8}},
}
DEFAULT_NARRATOR = 'heart'
ENVIRONMENTS = {'kokoro': 'kokoro', 'chatterbox': 'chatterbox', 'hear': 'check'}   # engine -> its Python environment's folder
VOICE_PIPELINE = 2        # raise to remake every clip
# How a clip is encoded: about -13 LUFS integrated, true peaks under -1 dB. The limiter works on the sound
# made four times finer (so it catches the peaks between samples) with a gentle 3 ms look-ahead and 60 ms
# release; at 96 kbps the AAC encoder adds almost nothing on top (at 64 kbps it added up to 2 dB).
ENCODE = {'lufs': -13.0, 'peak': -1.0, 'ceiling': -1.5, 'floor': 20.0, 'gap': 1.2, 'rate': 24000, 'bitrate': '96k'}
MAX_TAKES = 4
LONG_TAIL = 1.0           # seconds of sound after the last word heard that make a take wrong
SOURCE_FIELDS = {'id', 'by', 'title', 'url', 'year', 'checked', 'says'}
OPTION_WRITER_FIELDS = {'right', 'why', 'tempting', 'say'}
NO_TELLS = re.compile(r'\b(all|none|both|neither) of (the )?(above|these|them|those)\b', re.I)
TEXT_LIMIT = {'text': 320, 'ask': 220, 'title': 40, 'why': 260, 'right': 200}
STEPS_RANGE = (3, 15)
IMAGE_LONG_SIDE = 1600
IMAGE_QUALITY = 82
PICTURES = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
MEDIA_TYPES = PICTURES | {'.svg', '.m4a', '.mp3'}
# The answer forms, by how they answer (parts/inputs/part.json has their settings and marking).
NUMBER_FORMS = ('slider', 'dial', 'number', 'pile')
STARTS = {'slider': 'middle', 'dial': 'middle', 'pile': 'fewest', 'number': 'zero'}  # these start at a real value, and can be checked as they are
NUMBER_HOLDS = ('wheels', 'tape', 'abacus')  # a number's looks that always hold a value (keys start empty)
PAIR_FORMS = ('string', 'snap', 'match')
PILE_MOST = 60
LIST_SETTINGS = ('options', 'items', 'left', 'right', 'bins')

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


def preset_of(base, name, preset):
    """A preset's description, exactly as js/parts.js makes it: the part's own, under the preset's name, with
    the preset's defaults. Its settings, calls, events and state are the part's."""
    settings = {k: ({**spec, 'default': preset['settings'][k]} if k in preset.get('settings', {}) else spec) for k, spec in base.get('settings', {}).items()}
    return {**base, 'name': name, 'title': preset.get('title') or base.get('title'), 'about': preset.get('about') or base.get('about'), 'settings': settings, 'of': base['name']}


class Kit:
    """The parts' descriptions, read from the app (presets made from their parts), and the names a map knows."""

    def __init__(self, app):
        self.app = app
        listed = load_json(app / 'parts' / 'parts.json')
        self.parts = {n: load_json(app / 'parts' / n / 'part.json') for n in listed['parts']}
        self.presets = listed.get('presets') or {}
        for name, preset in self.presets.items():
            if preset.get('of') in self.parts:
                self.parts[name] = preset_of(self.parts[preset['of']], name, preset)
        self._countries = None
        # what a scene can do besides its parts' calls: its shots (shot.cut, shot.split, shot.inset) and sounds
        self.scene = listed.get('scene') or {'calls': {}, 'sounds': {}}
        self.shot = {'name': 'shot', 'title': 'Shots', 'about': self.scene.get('about', ''), 'settings': {}, 'calls': self.scene.get('calls', {})}
        f = app / 'parts' / 'map' / 'places.json'
        self.places = (load_json(f).get('places') or {}) if f.exists() else {}

    @property
    def sounds(self):
        return self.scene.get('sounds') or {}

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
    elif t == 'country':
        if v not in kit.countries:
            rep.err(where, f'"{v}" isn\'t a country the map knows (names as in Natural Earth, like "United States of America")')
    elif t in ('place', 'name'):
        if isinstance(v, str):
            if v not in kit.countries and v not in kit.places:
                rep.err(where, f'"{v}" isn\'t a country the map knows (names as in Natural Earth, like "United States of America"), or an ocean, sea or continent it names ({", ".join(kit.places)})')
        elif t == 'name':
            rep.err(where, 'is a place\'s name: a country, or an ocean, sea or continent')
        else:
            check_value({'type': 'lonlat'}, v, where, rep, kit, base)
    elif t == 'place-or-level':
        if _num(v) is not None:
            check_value({'type': 'number', **{k: spec[k] for k in ('min', 'max') if k in spec}}, v, where, rep, kit, base)
        else:
            check_value({'type': 'place'}, v, where, rep, kit, base)
    elif t == 'table':
        check_table(spec, v, where, rep, kit)
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
            optional = spec.get('optional') or {}
            for i, item in enumerate(v):
                if not isinstance(item, dict) or not all(isinstance(item.get(k), str) and item.get(k) for k in of):
                    rep.err(f'{where}[{i}]', f'needs {", ".join(of)}')
                    continue
                ids.append(item['id'])
                if spec.get('maxText') and len(item.get('text', '')) > spec['maxText']:
                    rep.warn(f'{where}[{i}]', f'is {len(item["text"])} characters; keep it under {spec["maxText"]}')
                for k in sorted(set(item) - set(of) - set(optional)):
                    rep.err(f'{where}[{i}]', f'no field "{k}" here' + (f' (it may have {", ".join(optional)})' if optional else ''))
                for k, t in optional.items():
                    if k in item:
                        check_value({'type': t}, item[k], f'{where}[{i}].{k}', rep, kit, base)
            if len(set(ids)) != len(ids):
                rep.err(where, 'has the same id twice')
        elif of in ('country', 'place'):
            for i, x in enumerate(v):
                check_value({'type': of}, x, f'{where}[{i}]' if of == 'place' else where, rep, kit, base)
        elif of == 'number':
            for i, x in enumerate(v):
                if _num(x) is None:
                    rep.err(f'{where}[{i}]', 'is a number')
        elif of == 'text':
            for i, x in enumerate(v):
                if not isinstance(x, str):
                    rep.err(f'{where}[{i}]', 'is words')
                elif spec.get('maxText') and len(x) > spec['maxText']:
                    rep.warn(f'{where}[{i}]', f'keep it under {spec["maxText"]} characters')


def check_table(spec, v, where, rep, kit):
    """A table to colour a map by: { country: value } or [[from, to, value], ...] for bands of latitude.
    A value is a number (coloured along a ramp) or a colour."""
    colours = spec.get('colours', [])

    def value_ok(x, w):
        if _num(x) is None and not (isinstance(x, str) and (x in colours or re.fullmatch(r'#[0-9a-fA-F]{6}', x))):
            rep.err(w, f'{json.dumps(x, ensure_ascii=False)} is neither a number nor a colour (one of {", ".join(colours)}, or #rrggbb)')
    if isinstance(v, dict):
        if not v:
            rep.err(where, 'the table is empty')
        for name, x in v.items():
            if name not in kit.countries:
                rep.err(where, f'"{name}" isn\'t a country the map knows (names as in Natural Earth, like "United States of America")')
            value_ok(x, f'{where}["{name}"]')
    elif isinstance(v, list):
        if not v:
            rep.err(where, 'the table is empty')
        for i, row in enumerate(v):
            w = f'{where}[{i}]'
            if not (isinstance(row, list) and len(row) == 3 and all(_num(x) is not None and -90 <= x <= 90 for x in row[:2]) and row[0] != row[1]):
                rep.err(w, 'a band is [from, to, value]: two different latitudes from -90 to 90 (south negative), and its value')
                continue
            value_ok(row[2], w)
    else:
        rep.err(where, 'a table is { "Country": value, ... } for countries, or [[from, to, value], ...] for bands of latitude')


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
        elif form and spec.get('byForm') and form in spec['byForm'] and v not in spec['byForm'][form]:
            rep.err(f'{where}.{k}', f'"{v}" isn\'t one the {form} form has: {", ".join(spec["byForm"][form])}')
            continue
        value = v
        if k in LIST_SETTINGS and isinstance(v, list):
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
        if a['type'] in ('answer', 'part'):
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
    if form in NUMBER_FORMS:
        if _num(ans) is None:
            rep.err(where, 'the answer is a number')
            return
        lo, hi = inp.get('min', 0), inp.get('max', 100)
        if form == 'pile':
            if not all(_num(x) is not None and x == int(x) and 0 <= x <= PILE_MOST for x in (lo, hi)):
                rep.err(where, f'a pile holds whole counts from 0 to {PILE_MOST}: give "min" and "max" as whole numbers in that range')
            if ans != int(ans):
                rep.err(where, 'a pile\'s answer is a whole count')
            if inp.get('thingImage') and 'thing' in inp:
                rep.warn(where, '"thingImage" is piled, so "thing" is never shown')
        if not (min(lo, hi) <= ans <= max(lo, hi)):
            rep.err(where, f'the answer {ans} is off the scale ({lo} to {hi})')
        if form in ('slider', 'dial') and not step.get('within'):
            rep.warn(where, f'a {form} with "within" 0 is right only on the exact value: give it some room')
        holds = form != 'number' or inp.get('look') in NUMBER_HOLDS
        if form == 'number' and 'start' in inp and not holds:
            rep.warn(where, 'a number\'s keys start empty, so "start" is never used: it\'s for wheels, tape and abacus')
        if form in STARTS and holds:
            # These start at a real value (start, or the middle of the scale; a pile at its fewest; a number's
            # wheels, tape or abacus at 0) and can be checked as they are, so where they start must not give
            # the answer away.
            log = form in ('slider', 'dial') and inp.get('scale') == 'log' and lo > 0 and hi > lo
            mid = (lo * hi) ** 0.5 if log else (lo + hi) / 2
            low, high = min(lo, hi), max(lo, hi)
            first = mid if STARTS[form] == 'middle' else max(0, low) if STARTS[form] == 'fewest' else (0 if low <= 0 <= high else low)
            start = inp.get('start', first)
            said = 'starts' if 'start' in inp else (f'starts in the middle of its scale, at {mid:g}' if STARTS[form] == 'middle' else f'starts at its fewest, {first:g}' if STARTS[form] == 'fewest' else f'starts at {first:g}')
            if _num(start) is not None:
                if not (min(lo, hi) <= start <= max(lo, hi)):
                    rep.err(where, f'the {form}\'s start, {start}, is off the scale ({lo} to {hi})')
                else:
                    state = {'value': start, 'answered': True}
                    got = mark(step, state, inputs_desc)
                    if got == 'right':
                        rep.err(where, f'the {form} {said}, which is already marked right: it gives the answer away. Set "start" well away from it')
                    elif got == 'close':
                        rep.warn(where, f'the {form} {said}, which is already marked close: set "start" farther from the answer')
    elif form == 'order':
        ids = [i.get('id') for i in inp.get('items') or []]
        if not (isinstance(ans, list) and sorted(map(str, ans)) == sorted(map(str, ids))):
            rep.err(where, 'the answer is every item\'s id, in the right order')
    elif form in PAIR_FORMS:
        left = {i.get('id') for i in inp.get('left') or [] if isinstance(i, dict)}
        right = {i.get('id') for i in inp.get('right') or [] if isinstance(i, dict)}
        if not (isinstance(ans, dict) and set(ans) == left and set(ans.values()) <= right and len(set(ans.values())) == len(ans)):
            rep.err(where, 'the answer pairs every left id with a different right id')
        if form == 'snap' and len(inp.get('left') or []) != len(inp.get('right') or []):
            rep.err(where, 'a snap has as many pieces ("right") as cards ("left"): every piece clicks into one card')
        if form == 'match':
            rep.warn(where, 'match still plays, but String is the newer way to pair things: "form": "string" takes the same left, right and answer')
    elif form == 'sort':
        items = {i.get('id') for i in inp.get('items') or [] if isinstance(i, dict)}
        bins = {i.get('id') for i in inp.get('bins') or [] if isinstance(i, dict)}
        if not (isinstance(ans, dict) and set(ans) == items and set(ans.values()) <= bins):
            rep.err(where, 'the answer puts every item in one of the bins: { itemId: binId } for every item')
        elif bins - set(ans.values()):
            rep.warn(where, f'nothing belongs in {", ".join(sorted(bins - set(ans.values())))}: a bin that stays empty is a hint')
    elif form == 'spot':
        if not (isinstance(ans, dict) and all(_num(ans.get(k)) is not None and 0 <= ans[k] <= 1 for k in ('x', 'y', 'r'))):
            rep.err(where, 'the answer is { "x", "y", "r" }, each from 0 to 1')
    if form in ((inputs_desc.get('settings') or {}).get('form') or {}).get('hidden', []):
        rep.warn(where, f'{form} is being redone and isn\'t offered for new lessons: it still plays here, but use another form')
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


# ---------- scenes: words, exactly as js/scene.js

def said_of(line):
    say = line.get('say')
    return say if isinstance(say, str) and say.strip() else (line.get('text') or '')


def split_words(s):
    return str(s or '').split()


def norm_word(w):
    w = str(w).replace('’', "'").replace('‘', "'").replace('*', '').lower()
    return re.sub(r'^[\W_]+|[\W_]+$', '', w)


def find_words(said, at, last=False):
    """The index of the first word of `at` in what's said (the last, with last=True); 'start' or 'end' for
    "$start" and "$end"; -1 if the words aren't there. "rise#2" is the second "rise"."""
    if at == '$start':
        return 'start'
    if at == '$end':
        return 'end'
    m = re.match(r'^(.*?)(?:#(\d+))?$', str(at), re.S)
    want = [x for x in map(norm_word, split_words(m.group(1))) if x]
    nth = int(m.group(2) or 1)
    ws = [norm_word(w) for w in split_words(said)]
    if not want:
        return -1
    seen = 0
    for i in range(len(ws) - len(want) + 1):
        if ws[i:i + len(want)] == want:
            seen += 1
            if seen == nth:
                return i + len(want) - 1 if last else i
    return -1


def split_call(call, part_names):
    head = str(call[0])
    if '.' in head and head.index('.') > 0:
        part, name = head.split('.', 1)
        return part, name, call[1:]
    return (part_names[0] if len(part_names) == 1 else None), head, call[1:]


def check_scene(scene, where, rep, kit, base, voice=None, narrator=None, most=LINES_RANGE):
    """A scene: an animation's file, or a scene step. voice: its timing file, if it has been voiced. most: how
    many lines it usually has (an animation can run longer than a scene step)."""
    parts_ = scene.get('parts')
    descs = {}
    if not isinstance(parts_, dict) or not parts_:
        rep.err(where, '"parts" names the parts on screen: {"globe": {"part": "globe", "settings": {...}}}')
        parts_ = {}
    for name, spec in parts_.items():
        if not re.fullmatch(r'[a-z][a-z0-9-]*', name):
            rep.err(f'{where}.parts.{name}', 'a part\'s name in a scene is lower case letters (it goes before the dot in "globe.spinTo")')
        if isinstance(spec, dict) and 'image' in spec:
            rep.err(f'{where}.parts.{name}', 'a scene\'s parts are parts that take calls; a picture belongs in an explain step')
            continue
        d = check_shown(spec, f'{where}.parts.{name}', rep, kit, base)
        if d:
            descs[name] = d
    names = list(parts_)
    lines = scene.get('lines')
    if not isinstance(lines, list) or not lines:
        rep.err(where, '"lines" is the script: a list of lines, each { "id", "text", "do": [...] }')
        return
    if not most[0] <= len(lines) <= most[1]:
        rep.warn(where, f'{len(lines)} lines: a scene is usually {most[0]} to {most[1]}; split a long one in two')
    seen = set()
    for n, line in enumerate(lines):
        lid = line.get('id') if isinstance(line, dict) else None
        w = f'{where} line {n + 1}' + (f' ({lid})' if lid else '')
        if not isinstance(line, dict):
            rep.err(w, 'a line is an object')
            continue
        if not lid or not SLUG.match(str(lid)):
            rep.err(w, 'needs an "id" of lower case words joined by hyphens (its clip is named by it)')
        elif lid in seen:
            rep.err(w, 'the same id as an earlier line')
        seen.add(lid)
        for k in set(line) - LINE_FIELDS:
            if k == 'wait':
                rep.err(w, 'no "wait": a scene plays through like a video, with nothing to answer. Ask it in the lesson that follows')
            else:
                rep.err(w, f'no field "{k}" on a line')
        text = line.get('text')
        if not isinstance(text, str) or not text.strip():
            rep.err(w, 'a line needs "text": what is said, shown as its caption')
            continue
        said = said_of(line)
        if len(text.replace('*', '')) > LINE_LIMIT:
            rep.warn(w, f'is {len(text)} characters; a caption reads best under {LINE_LIMIT}: split it into two lines')
        if 'say' in line and not (isinstance(line['say'], str) and line['say'].strip()):
            rep.err(w, '"say" is the words as read aloud')
        if 'say' not in line and SYMBOLS.search(text):
            rep.warn(w, f'has {", ".join(sorted(set(SYMBOLS.findall(text))))}: give "say", the line as it should be read aloud ("27 degrees Celsius"), so the voice doesn\'t guess')
        if 'say' in line and len(split_words(line['say'])) and abs(len(split_words(line['say'])) - len(split_words(text))) > len(split_words(text)):
            rep.warn(w, '"say" and "text" are very different: the caption should be what is said')
        if 'hold' in line and (_num(line['hold']) is None or not 0 <= line['hold'] <= 5):
            rep.err(w, '"hold" is extra seconds after the line, 0 to 5')
        for i, act in enumerate(line.get('do') or []):
            aw = f'{w} do[{i}]'
            sound_only = isinstance(act, dict) and 'call' not in act and isinstance(act.get('sound'), str)
            if not isinstance(act, dict) or (not sound_only and (not isinstance(act.get('call'), list) or not act['call'])):
                rep.err(aw, 'an action is { "at": "word", "call": ["name", arg, ...] }, or a sound alone: { "at": "word", "sound": "whoosh" }')
                continue
            for k in set(act) - ACTION_FIELDS:
                rep.err(aw, f'no field "{k}" on an action ({", ".join(sorted(ACTION_FIELDS))})')
            span = 'from' in act or 'to' in act
            if span and 'at' in act:
                rep.err(aw, 'an action happens "at" a word, or runs "from" one word "to" another, not both')
            for k in ('at', 'from', 'to'):
                if k in act:
                    got = find_words(said, act[k], last=(k == 'to'))
                    if got == -1:
                        rep.err(aw, f'"{k}": "{act[k]}" isn\'t in what\'s said: "{said}"')
            if 'sound' in act and act['sound'] != 'none' and act['sound'] not in kit.sounds:
                rep.err(aw, f'"sound": "{act["sound"]}" isn\'t a sound the kit has ({", ".join(kit.sounds)}, or "none")')
            if sound_only and span:
                rep.err(aw, 'a sound on its own happens "at" a word')
            for k in ('ease', 'range'):
                if k in act and not span:
                    rep.err(aw, f'"{k}" shapes a stretch: it goes with "from" and "to"')
            if 'ease' in act and act['ease'] not in EASES:
                rep.err(aw, f'"ease" is one of {", ".join(EASES)} (soft unless given)')
            if 'range' in act and not (isinstance(act['range'], list) and len(act['range']) == 2 and all(_num(x) is not None and 0 <= x <= 1 for x in act['range'])):
                rep.err(aw, '"range" is [from, to], each 0 to 1: the share of the way "$p" runs across, for carrying something on across lines')
            if not sound_only:
                check_scene_call(act['call'], aw, rep, kit, base, descs, names, span)
    shot = scene.get('shot')
    if shot is not None:
        if not (isinstance(shot, list) and shot and isinstance(shot[0], str)):
            rep.err(f'{where}.shot', 'the opening shot is a shot call without "shot.": ["cut", "globe"], ["split", "globe", "section"]')
        else:
            check_scene_call([f'shot.{shot[0]}', *shot[1:]], f'{where}.shot', rep, kit, base, descs, names, False)
    warn_places(scene, where, rep, kit, descs)
    if voice is not None:
        warn_voice([x for x in lines if isinstance(x, dict) and x.get('id') and isinstance(x.get('text'), str)], voice, narrator, where, rep,
                   'play from their captions')


def place_words(name):
    """How a named place is usually said: "Atlantic Ocean" as "Atlantic", "Caribbean Sea" as "Caribbean", "Gulf of
    Mexico" and the continents in full."""
    for tail in (' Ocean', ' Sea'):
        if name.endswith(tail) and len(name.split()) == 2:
            return name[:-len(tail)]
    return name


def warn_places(scene, where, rep, kit, descs):
    """A scene with a map that names an ocean, sea or continent should write its name on the map while it matters
    (the map's label call; ruled 2026-11-18: if the ocean matters it shows up labelled)."""
    maps = [n for n, d in descs.items() if 'label' in (d.get('calls') or {})]
    if not maps:
        return
    labelled = set()
    for line in scene.get('lines') or []:
        for act in (line.get('do') or []) if isinstance(line, dict) else []:
            c = act.get('call') if isinstance(act, dict) else None
            if isinstance(c, list) and c and str(c[0]).split('.')[-1] == 'label' and len(c) > 1:
                labelled.add(c[1])
    for line in scene.get('lines') or []:
        if not isinstance(line, dict) or not isinstance(line.get('text'), str):
            continue
        text = ' ' + re.sub(r'[^\w\s-]', ' ', line['text'].replace('*', '')).lower() + ' '
        for name in kit.places:
            if f' {place_words(name).lower()} ' in text and name not in labelled:
                rep.warn(f'{where} line {line.get("id")}', f'names {name}: write it on the map while it matters ({maps[0]}.label "{name}")')


def warn_voice(lines, voice, narrator, where, rep, until):
    """Warnings for lines not voiced yet in the topic's narrator, changed since they were, or still heard wrong.
    `until` says how they play meanwhile."""
    unvoiced, changed = [], []
    for line in lines:
        lid, said = line['id'], said_of(line)
        mine = ((voice.get('lines') or {}).get(lid) or {}).get(narrator or DEFAULT_NARRATOR)
        if not mine:
            unvoiced.append(lid)
        elif str(mine.get('said', '')).replace('*', '') != said.replace('*', ''):
            changed.append(lid)
        elif mine.get('check') == 'flag':
            rep.warn(f'{where} line {lid}', f'its clip was heard as "{mine.get("heard")}": listen to it, or reword the line and voice it again')
    def listed(ids):
        return ", ".join(ids) if len(ids) <= 12 else f'{", ".join(ids[:8])} and {len(ids) - 8} more'
    if unvoiced and len(unvoiced) == len(lines):
        rep.warn(where, f'isn\'t voiced yet ({listed(unvoiced) if len(unvoiced) <= 12 else f"{len(unvoiced)} lines"}): run primer voice. Until then they {until}')
    elif unvoiced:
        rep.warn(where, f'has lines that aren\'t voiced yet ({listed(unvoiced)}): run primer voice. Until then they {until}')
    if changed:
        rep.warn(where, f'lines changed since they were voiced ({listed(changed)}): run primer voice. Until then they {until}')


def step_say(step, field):
    """A step's own spoken wording for one of its fields: `say` as a string is its text or question; as an
    object, it is keyed by field."""
    say = step.get('say')
    if isinstance(say, str):
        return say if field == SPOKEN_FIELDS.get(step.get('kind'), ('',))[0] else None
    return say.get(field) if isinstance(say, dict) else None


def spoken_lines(lesson):
    """What a lesson, test or exam reads aloud, as lines like a scene's ({ id, text, say }): its steps in order,
    then every ask of the facts it declares (its own, then its families', {field}s filled in). An id is
    <base>.<what>: text or ask (shown as the step opens), right, why, miss-<n> (the nth of its misses, from 1)
    and option-<id> (a wrong choice's why): each line of feedback, read once it's shown. A step's base is its
    id; an ask's is <fact>.<ask>, the same wherever it's asked (a lesson, a drawn test, review). The phone finds
    them by the same ids (js/narration.js, stepLines; js/lesson.js, mark)."""
    out = []
    if not isinstance(lesson, dict):
        return out
    for s in lesson.get('steps') or []:
        if isinstance(s, dict) and isinstance(s.get('id'), str):
            out += step_lines(s, s['id'])
    for f in facts_of_lesson(lesson):
        for a in f.get('asks') or []:
            if isinstance(a, dict) and isinstance(a.get('id'), str) and a.get('kind') in ('check', 'play'):
                out += step_lines(a, f'{f["id"]}.{a["id"]}')
    return out


def step_lines(s, sid):
    """The lines one step or ask reads aloud, under the base id `sid`."""
    out = []
    if s.get('kind') in SPOKEN_FIELDS:
        for field in SPOKEN_FIELDS[s['kind']]:
            if isinstance(s.get(field), str) and s[field].strip():
                out.append({'id': f'{sid}.{field}', 'text': s[field], **({'say': step_say(s, field)} if step_say(s, field) else {})})
        for n, m in enumerate(s.get('misses') or [], 1):
            if isinstance(m, dict) and isinstance(m.get('why'), str) and m['why'].strip():
                out.append({'id': f'{sid}.miss-{n}', 'text': m['why'], **({'say': m['say']} if isinstance(m.get('say'), str) else {})})
        if s['kind'] == 'check' and (s.get('input') or {}).get('form') == 'choice':
            for o in (s['input'].get('options') or []):
                if isinstance(o, dict) and isinstance(o.get('why'), str) and o['why'].strip() and o.get('id'):
                    out.append({'id': f'{sid}.option-{o["id"]}', 'text': o['why'], **({'say': o['say']} if isinstance(o.get('say'), str) else {})})
    return out


def check_spoken(lesson, where, rep, base, key, narrator):
    """A lesson's spoken words: each `say` is words, symbols are read as the writer says, and it's voiced."""
    lines = spoken_lines(lesson)
    said = [(f'{where} step {s.get("id")}', s) for s in lesson.get('steps') or [] if isinstance(s, dict)]
    said += [(f'{where} fact {f["id"]} ask {a.get("id")}', a) for f in facts_of_lesson(lesson) for a in f.get('asks') or [] if isinstance(a, dict)]
    for w, s in said:
        if 'say' not in s:
            continue
        say, fields = s['say'], SPOKEN_FIELDS.get(s.get('kind'), ())
        if isinstance(say, str):
            if not say.strip():
                rep.err(w, '"say" is the words as read aloud')
        elif isinstance(say, dict):
            for k, v in say.items():
                if k not in fields:
                    rep.err(w, f'"say" speaks for {", ".join(fields) or "nothing on this step"}; not "{k}"')
                elif not (isinstance(v, str) and v.strip()):
                    rep.err(w, f'"say.{k}" is the words as read aloud')
                elif not s.get(k):
                    rep.err(w, f'"say.{k}" speaks for "{k}", which this step hasn\'t got')
        else:
            rep.err(w, '"say" is the step\'s words as read aloud, or { "ask": ..., "right": ..., "why": ... }')
    for line in lines:
        text = line['text']
        if 'say' not in line and SYMBOLS.search(text):
            rep.warn(f'{where} {line["id"]}', f'has {", ".join(sorted(set(SYMBOLS.findall(text))))}: give "say", the words as they should be read aloud ("27 degrees Celsius"), so the voice doesn\'t guess')
    if lines and base is not None:
        warn_voice(lines, scene_voice(base, key) or {}, narrator, where, rep, 'show silently, as text')


def check_scene_call(call, where, rep, kit, base, descs, names, span):
    part, name, args = split_call(call, names)
    if part == 'shot':
        if len(names) < 2 and name != 'title':
            rep.err(where, 'a shot chooses between parts: this scene has only one')
            return None
        desc = kit.shot
        spec = (desc.get('calls') or {}).get(name)
        if not spec:
            rep.err(where, f'no shot "{name}" (there are {", ".join(desc.get("calls") or {})})')
            return None
        for a, v in zip(spec['args'], args):
            if a['type'] == 'part' and v not in names and not (a.get('none') and v == 'none'):
                rep.err(where, f'{name}: "{v}" isn\'t a part of this scene ({", ".join(names)}{", or none" if a.get("none") else ""})')
        if name == 'split' and len(args) >= 2 and args[0] == args[1]:
            rep.err(where, 'a split shows two different parts')
        check_call(desc, [name, *['globe' if a['type'] == 'part' else v for a, v in zip(spec['args'], args)], *args[len(spec['args']):]], where, rep, kit, base)
        return desc
    if part is None:
        rep.err(where, f'this scene has {len(names)} parts: name the one, like "{names[0] if names else "globe"}.{name}"')
        return None
    if part not in descs:
        if part not in names:
            rep.err(where, f'no part "{part}" in this scene (it has {", ".join(names)})')
        return None
    desc = descs[part]
    has_p = any(a == '$p' for a in args)
    if span and not has_p:
        rep.err(where, 'an action that runs "from" a word "to" another drives a call with "$p" in its arguments: how far through it is, 0 to 1')
    if not span and has_p:
        rep.err(where, '"$p" (how far through, 0 to 1) only makes sense in an action that runs "from" a word "to" another')
    spec = desc.get('calls', {}).get(name)
    if spec and has_p:
        for a, v in zip(spec['args'], args):
            if v == '$p' and a['type'] != 'number':
                rep.err(where, f'"$p" is a number from 0 to 1, but {name}\'s {a["name"]} is {a["type"]}')
    check_call(desc, [name, *[0.5 if a == '$p' else a for a in args]], where, rep, kit, base)
    return desc


def scene_voice(base, key):
    f = base / 'voice' / f'{key}.json' if base is not None else None
    if f is None:
        return None
    try:
        return json.loads(f.read_text(encoding='utf-8'))
    except (FileNotFoundError, ValueError):
        return {}


def check_scene_file(scene, where, rep, kit, base, key, narrator=None):
    if not isinstance(scene, dict):
        rep.err(where, 'a scene is an object')
        return
    for k in set(scene) - SCENE_FILE_FIELDS:
        rep.err(where, f'no field "{k}" in a scene ({", ".join(sorted(SCENE_FILE_FIELDS))})')
    if scene.get('v') != 1:
        rep.err(where, '"v" is 1')
    if not scene.get('title'):
        rep.err(where, 'no title: the path shows it')
    if not scene.get('sources'):
        rep.err(where, 'no sources: a scene says where its facts come from, as a lesson does')
    for i, s in enumerate(scene.get('sources') or []):
        if not isinstance(s, dict) or not s.get('id') or not (s.get('title') or s.get('by')):
            rep.err(f'{where}.sources[{i}]', 'a source has an id, and a title or who it\'s by')
        elif not s.get('checked'):
            rep.warn(f'{where}.sources[{i}]', '"checked": when it was read, or "recalled" if it wasn\'t re-read')
    check_scene(scene, where, rep, kit, base, scene_voice(base, key), narrator, ANIMATION_LINES)


def check_step(step, w, rep, kit, base, ctx, ask=False):
    """One check, play, explain or scene step, or a fact's ask (a check or play step, with tries required).
    ctx: the lesson's source ids, the ids cited so far, the forms used, the facts the topic knows, and its narrator."""
    inputs_desc = kit.parts.get('inputs', {})
    kind = step.get('kind')
    allowed = ({'check', 'play'} if ask else KINDS)
    if kind not in allowed:
        rep.err(w, f'"kind" is one of {", ".join(sorted(allowed))}' + (': an ask is a question' if ask else ''))
        return
    fields = (STEP_FIELDS[kind] - {'fact'}) if ask else STEP_FIELDS[kind]
    for k in set(step) - fields:
        rep.err(w, f'no field "{k}" on {"an ask" if ask else f"a {kind} step"}')
    if not ask and not step.get('title'):
        rep.warn(w, 'no "title": progress names the step by it')
    check_words(step, w, rep)
    src = step.get('src') or []
    for s in src:
        if s not in ctx['sources']:
            rep.err(w, f'cites "{s}", which isn\'t in the sources')
        ctx['cited'].add(s)
    if not ask and 'fact' in step and kind != 'scene':
        given = step['fact']
        if not (isinstance(given, str) or (isinstance(given, list) and given and all(isinstance(x, str) for x in given))):
            rep.err(w, '"fact" is the id of the fact the step teaches, or a list of them')
        for f in step_facts(step):
            if ctx['facts'] is not None and f not in ctx['facts']:
                rep.err(w, f'names the fact "{f}", which no lesson of the topic declares' + (f' (they declare {", ".join(sorted(ctx["facts"]))})' if ctx['facts'] else ''))
    words = ' '.join(str(step.get(k, '')) for k in ('text', 'ask', 'right', 'why'))
    if kind == 'scene':
        words += ' '.join(str(x.get('text', '')) for x in step.get('lines') or [] if isinstance(x, dict))
    if not src and not ask and re.search(r'\d', words):
        rep.warn(w, 'has numbers but cites no source ("src")')
    if kind == 'scene':
        key = f'{ctx["node"]}.{step.get("id")}'
        check_scene(step, w, rep, kit, base, scene_voice(base, key), ctx['narrator'])
        return
    if kind == 'explain':
        if not step.get('text'):
            rep.err(w, 'an explain step needs "text"')
        if 'figure' in step:
            check_shown(step['figure'], f'{w}.figure', rep, kit, base)
        return
    if not step.get('ask'):
        rep.err(w, f'{"an ask" if ask else f"a {kind} step"} needs "ask": its question')
    for i, m in enumerate(step.get('misses') or []):
        if not isinstance(m, dict) or 'when' not in m or not m.get('why'):
            rep.err(f'{w}.misses[{i}]', 'a miss is { "when": rule, "why": "..." }')
    if kind == 'check':
        fig_desc = check_shown(step['figure'], f'{w}.figure', rep, kit, base) if 'figure' in step else None
        inp = step.get('input')
        if not isinstance(inp, dict) or inp.get('form') not in inputs_desc['settings']['form']['options']:
            rep.err(w, f'"input" is the Inputs part\'s settings, with "form" one of {", ".join(inputs_desc["settings"]["form"]["options"])}')
            return
        if not ask:
            ctx['forms'].append(inp['form'])
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
            if ask and not step.get('tries'):
                rep.err(w, 'an ask needs "tries", as a play step does: what someone might really give and how it\'s marked, a realistic wrong one among them')
        if step.get('tries'):
            marks = check_tries(step, None, inputs_desc, w, rep)
            if ask and inp['form'] != 'choice' and marks and 'wrong' not in marks:
                rep.err(w, 'none of its tries is wrong: give a plausible wrong answer, so it\'s shown to be possible to get wrong')
        if step.get('then'):
            if not fig_desc:
                rep.err(w, '"then" runs on the figure, and this step has no part as its figure')
            else:
                for i, c in enumerate(step['then']):
                    check_call(fig_desc, c, f'{w}.then[{i}]', rep, kit, base)
    if kind == 'play':
        desc = check_shown(step.get('play'), f'{w}.play', rep, kit, base)
        if not desc:
            return
        names = set(desc.get('state', {}))
        if not step.get('goal'):
            rep.err(w, f'{"an ask" if ask else "a play step"} on a part needs a "goal": a rule over the part\'s state')
            return
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
            rep.err(w, f'{"an ask" if ask else "a play step"} needs "tries": plausible inputs and what they should be marked, a realistic wrong one among them. A goal that can\'t be failed teaches nothing')
        else:
            marks = check_tries(step, desc, inputs_desc, w, rep)
            if marks and 'wrong' not in marks:
                rep.err(w, 'none of its tries is wrong: give a plausible wrong input, so the step is shown to be possible to fail')
            if marks and 'right' not in marks:
                rep.warn(w, 'none of its tries is right: give one, so the step is shown to be possible to pass')
        if not step.get('why') and not step.get('misses'):
            rep.warn(w, 'no "why" or "misses": a wrong answer would be shown nothing to learn from')


def check_lesson(lesson, where, rep, kit, base, node_kind='lesson', node_id=None, narrator=None, known_facts=None):
    """A lesson, test or exam file: the same shape, played step by step. node_kind says which it is on the path.
    A lesson also declares its facts (and families of them); known_facts: every fact id the topic declares, for
    the steps that name one (None: not known, so not checked)."""
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
    only_draws = lesson.get('draw') is not None and not lesson.get('steps')
    if not sources and not only_draws:
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
    draw = lesson.get('draw')
    if draw is not None:
        if node_kind not in ('test', 'exam'):
            rep.err(where, f'"draw" is for a test or an exam, which can draw its questions from the facts of the lessons before it; a {node_kind} lists its steps')
        elif not isinstance(draw, dict) or draw.get('from') not in DRAW_FROM or (_num(draw.get('count')) is None or not 1 <= draw['count'] <= 40 or draw['count'] != int(draw['count'])):
            rep.err(where, f'"draw" is {{ "from": "unit" or "topic", "count": how many, 1 to 40 }}')
        else:
            for k in set(draw) - {'from', 'count'}:
                rep.err(where, f'no field "{k}" in "draw" (from, count)')
    for k in ('facts', 'families'):
        if k in lesson and node_kind != 'lesson':
            rep.err(where, f'"{k}" belong in a lesson: a {node_kind} asks about the facts its lessons declare')
    steps = lesson.get('steps')
    if steps is None and draw is not None:
        steps = []
    if not isinstance(steps, list) or (not steps and draw is None):
        rep.err(where, 'no steps')
        return
    if steps and not STEPS_RANGE[0] <= len(steps) <= STEPS_RANGE[1] and draw is None:
        rep.warn(where, f'{len(steps)} steps: a {node_kind} is usually {STEPS_RANGE[0]} to {STEPS_RANGE[1]}')
    declared = {f['id'] for f in facts_of_lesson(lesson)} if node_kind == 'lesson' else set()
    ctx = {'sources': source_ids, 'cited': set(), 'forms': [], 'node': node_id or pathlib.Path(str(where)).stem, 'narrator': narrator,
           'facts': (known_facts | declared) if known_facts is not None else (declared or None)}
    seen = set()
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
        check_step(step, w, rep, kit, base, ctx)
    if node_kind == 'lesson':
        check_facts(lesson, where, rep, kit, base, ctx)
    check_spoken(lesson, where, rep, base, ctx['node'], narrator)
    for s in source_ids - ctx['cited'] if not only_draws else []:
        rep.warn(where, f'the source "{s}" isn\'t cited by any step or fact')
    if ctx['forms'] and all(f == 'choice' for f in ctx['forms']) and not any(isinstance(s, dict) and s.get('kind') == 'play' for s in steps):
        rep.warn(where, 'every question is a choice: a slider, a number, an order or a placement leaves more room to be realistically wrong')
    if node_kind in QUESTIONS_AT_LEAST:
        asked = [s for s in steps if isinstance(s, dict) and s.get('kind') in ('check', 'play')]
        explains = [s.get('id') for s in steps if isinstance(s, dict) and s.get('kind') == 'explain']
        count = len(asked) + (int(draw['count']) if isinstance(draw, dict) and _num(draw.get('count')) is not None else 0)
        if not count:
            rep.err(where, f'a {node_kind} asks questions, and this one has none')
        elif count < QUESTIONS_AT_LEAST[node_kind]:
            rep.warn(where, f'{count} question(s): a {node_kind} usually has at least {QUESTIONS_AT_LEAST[node_kind]}')
        if explains:
            rep.warn(where, f'a {node_kind} is questions on what came before; explain steps ({", ".join(map(str, explains))}) belong in a lesson')


# ---------- facts: what a lesson says is worth knowing afterward, and the ways of asking each

def js_str(v):
    """A value as JavaScript's String() writes it, so a family's words come out the same as on the phone."""
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if v is None:
        return 'null'
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    if isinstance(v, list):
        return ','.join(js_str(x) for x in v)
    if isinstance(v, dict):
        return '[object Object]'
    return str(v)


def fnv1a(s):
    """FNV-1a, 32 bits, over UTF-8: the same number as js/facts.js's hash."""
    h = 0x811c9dc5
    for b in str(s).encode('utf-8'):
        h ^= b
        h = (h * 0x01000193) & 0xffffffff
    return h


_ONLY = re.compile(r'^\{([A-Za-z0-9_.-]+)\}$')
_ANY = re.compile(r'\{([A-Za-z0-9_.-]+)\}')


def fill(tpl, vars_):
    """Exactly as js/facts.js: "{field}" in a string is the row's value; a string that is only "{field}" takes the
    value as it is (a number stays a number)."""
    if isinstance(tpl, str):
        m = _ONLY.match(tpl)
        if m and m.group(1) in vars_:
            return vars_[m.group(1)]
        return _ANY.sub(lambda mm: js_str(vars_[mm.group(1)]) if mm.group(1) in vars_ else mm.group(0), tpl)
    if isinstance(tpl, list):
        return [fill(x, vars_) for x in tpl]
    if isinstance(tpl, dict):
        return {k: fill(v, vars_) for k, v in tpl.items()}
    return tpl


def _vars(row, other=None):
    v = dict(row)
    for k, x in (other or {}).items():
        v[f'other.{k}'] = x
    return v


def family_options(spec, row, rows, fact_id):
    """A choice's options from a column of the table, exactly as js/facts.js (familyOptions) makes them."""
    frm, count, near, unlike = spec.get('from'), spec.get('count', 3), spec.get('near'), spec.get('unlike')
    others = [r for r in rows if r.get('id') != row.get('id') and frm in r and r.get(frm) != row.get(frm) and (not unlike or r.get(unlike) != row.get(unlike))]
    others.sort(key=lambda r: (fnv1a(f'{fact_id}|{r.get("id")}'), str(r.get('id'))))
    seen, uniq = set(), []
    for r in others:
        k = json.dumps(r.get(frm), sort_keys=True)
        if k not in seen:
            seen.add(k)
            uniq.append(r)
    if near and near in row:
        uniq = [r for r in uniq if r.get(near) == row.get(near)] + [r for r in uniq if r.get(near) != row.get(near)]
    wrong = [{'id': r['id'], 'text': js_str(r.get(frm)), 'why': fill(spec.get('why') or '', _vars(row, r)), 'tempting': fill(spec.get('tempting') or '', _vars(row, r))}
             for r in uniq[:max(1, (count if isinstance(count, int) else 3) - 1)]]
    return [{'id': row.get('id'), 'text': js_str(row.get(frm)), 'right': True}, *wrong]


def family_fact(fam, row):
    fid = f'{fam.get("id")}-{row.get("id")}'
    v = _vars(row)
    asks = []
    for shape in fam.get('asks') or []:
        if not isinstance(shape, dict):
            continue
        inp = shape.get('input')
        if isinstance(inp, dict) and isinstance(inp.get('options'), dict):
            inp = {**inp, 'options': family_options(inp['options'], row, fam.get('rows') or [], fid)}
        ask = fill({k: x for k, x in shape.items() if k != 'input'}, v)
        if inp:
            ask['input'] = fill(inp, v)
        asks.append(ask)
    return {**fill(fam.get('fact') or {}, v), 'id': fid, 'asks': asks, 'family': fam.get('id'), 'row': row.get('id')}


def expand_family(fam):
    rows = fam.get('rows') if isinstance(fam, dict) and isinstance(fam.get('rows'), list) else []
    return [family_fact(fam, r) for r in rows if isinstance(r, dict) and isinstance(r.get('id'), str)]


def facts_of_lesson(lesson):
    """Every fact a lesson declares: its own, then each family's, in order."""
    own = [f for f in lesson.get('facts') or [] if isinstance(f, dict) and isinstance(f.get('id'), str)] if isinstance(lesson.get('facts'), list) else []
    made = [f for fam in lesson.get('families') or [] for f in expand_family(fam)] if isinstance(lesson.get('families'), list) else []
    return own + made


def step_facts(step):
    f = step.get('fact') if isinstance(step, dict) else None
    return [f] if isinstance(f, str) else [x for x in f if isinstance(x, str)] if isinstance(f, list) else []


def way_of(step):
    """How a step or ask asks: a check's answer form, or a play's part (as js/facts.js, wayOf)."""
    if step.get('kind') == 'check':
        return (step.get('input') or {}).get('form') or 'check'
    if step.get('kind') == 'play':
        return f'play:{(step.get("play") or {}).get("part", "")}'
    return step.get('kind')


_NUMBER = re.compile(r'(?<![\w.])-?\d+(?:\.\d+)?(?![\w.])')


def _norm_words(s):
    return ' ' + re.sub(r'[^a-z0-9°%]+', ' ', str(s).replace('*', '').lower()).strip() + ' '


def give_aways(ask, kit):
    """Ways an ask gives its own answer away: the question names the right option; it says the number it asks
    for; it lists an order's items in their right order; a figure marks the very place a play step wants."""
    out = []
    question = ask.get('ask') or ''
    shown = [question] + [str(c[-1]) for c in ((ask.get('figure') or {}).get('calls') or []) + ((ask.get('play') or {}).get('calls') or [])
                          if isinstance(c, list) and c and c[0] in ('point', 'marker') and isinstance(c[-1], str)]
    words = ' '.join(_norm_words(x) for x in shown)
    inp = ask.get('input') or {}
    form, ans = inp.get('form'), answer_of(ask)
    if ask.get('kind') == 'check' and form == 'choice':
        right = next((o for o in inp.get('options') or [] if isinstance(o, dict) and o.get('id') == ans), None)
        text = _norm_words(right.get('text', '')) if right else ''
        if right and len(text.strip()) >= 3 and text in words and not any(_norm_words(o.get('text', '')) in words for o in inp.get('options') or [] if isinstance(o, dict) and o is not right):
            out.append(f'the question says the right option, "{right.get("text")}"')
    if ask.get('kind') == 'check' and form in NUMBER_FORMS and _num(ans) is not None:
        for x in shown:
            for m in _NUMBER.findall(str(x).replace('*', '')):
                if abs(float(m) - ans) < 1e-9:
                    out.append(f'it says the number it asks for, {js_str(ans)}')
                    break
    if ask.get('kind') == 'check' and form == 'order' and isinstance(ans, list) and len(ans) > 1:
        texts = {i.get('id'): _norm_words(i.get('text', '')) for i in inp.get('items') or [] if isinstance(i, dict)}
        at = [words.find(texts.get(i, '\0')) for i in ans]
        if all(p >= 0 for p in at) and at == sorted(at):
            out.append('the question lists the items in their right order')
    if ask.get('kind') == 'play' and ask.get('goal'):
        for c in (ask.get('play') or {}).get('calls') or []:
            if not (isinstance(c, list) and len(c) >= 2 and c[0] in ('point', 'marker', 'highlight')):
                continue
            places = c[1] if c[0] == 'highlight' else [c[1]]
            for p in places if isinstance(places, list) else [places]:
                state = None
                if isinstance(p, list) and len(p) == 2 and all(_num(x) is not None for x in p):
                    state = {'tapped': {'lon': p[0], 'lat': p[1], 'land': False, 'country': None}}
                elif isinstance(p, str):
                    state = {'selected': p, 'tapped': {'country': p, 'land': True}}
                if state and rule_holds(ask['goal'], state):
                    out.append(f'its part shows a {c[0]} right where the goal is ({json.dumps(p, ensure_ascii=False)})')
                    break
    return out


def check_facts(lesson, where, rep, kit, base, ctx):
    """A lesson's facts and families: each fact sourced, with two or more ways of asking it, each a check or play
    step that can be got wrong and doesn't give itself away."""
    if 'facts' in lesson and not isinstance(lesson['facts'], list):
        rep.err(where, '"facts" is a list: { "id", "text", "src", "asks": [...] }')
    if 'families' in lesson and not isinstance(lesson['families'], list):
        rep.err(where, '"families" is a list: { "id", "rows": [...], "fact": {...}, "asks": [...] }')
    for i, fam in enumerate(lesson.get('families') or [] if isinstance(lesson.get('families'), list) else []):
        w = f'{where} family {i + 1}' + (f' ({fam.get("id")})' if isinstance(fam, dict) and fam.get('id') else '')
        if not isinstance(fam, dict):
            rep.err(w, 'a family is an object')
            continue
        for k in set(fam) - FAMILY_FIELDS:
            rep.err(w, f'no field "{k}" in a family ({", ".join(sorted(FAMILY_FIELDS))})')
        if not fam.get('id') or not SLUG.match(str(fam['id'])):
            rep.err(w, 'needs an "id" of lower case words joined by hyphens: each fact\'s id is it and the row\'s')
        rows = fam.get('rows')
        if not isinstance(rows, list) or len(rows) < 2:
            rep.err(w, '"rows" is the table: two or more rows, each { "id", and its fields }')
            rows = []
        ids = [r.get('id') for r in rows if isinstance(r, dict)]
        for j, r in enumerate(rows):
            if not isinstance(r, dict) or not isinstance(r.get('id'), str) or not SLUG.match(r['id']):
                rep.err(f'{w} row {j + 1}', 'a row is an object with an "id" of lower case words joined by hyphens')
        if len(set(ids)) != len(ids):
            rep.err(w, 'two rows have the same id')
        if not isinstance(fam.get('fact'), dict) or not fam['fact'].get('text'):
            rep.err(w, '"fact" is the shape of each row\'s fact: { "text": "... {field} ...", "src": [...] }')
        if not isinstance(fam.get('asks'), list) or not fam['asks']:
            rep.err(w, '"asks" are the question shapes, each an ask with {field}s to fill from a row')
        fields = set().union(*[set(r) for r in rows if isinstance(r, dict)]) if rows else set()
        for name in sorted(set(_ANY.findall(json.dumps([fam.get('fact'), fam.get('asks')], ensure_ascii=False)))):
            base_name = name[6:] if name.startswith('other.') else name
            if base_name not in fields:
                rep.err(w, f'"{{{name}}}" names a field the rows don\'t have ({", ".join(sorted(fields))})')
        for k, shape in enumerate(fam.get('asks') or []):
            opts = ((shape or {}).get('input') or {}).get('options') if isinstance(shape, dict) else None
            if isinstance(opts, dict):
                for kk in set(opts) - {'from', 'count', 'near', 'unlike', 'why', 'tempting'}:
                    rep.err(f'{w} ask {k + 1}', f'no field "{kk}" in options made from the table (from, count, near, unlike, why, tempting)')
                for kk in ('from', 'near', 'unlike'):
                    if kk in opts and opts[kk] not in fields:
                        rep.err(f'{w} ask {k + 1}', f'options "{kk}" names "{opts[kk]}", which isn\'t a field of the rows')
                if not opts.get('why') or not opts.get('tempting'):
                    rep.err(f'{w} ask {k + 1}', 'options made from the table need "why" and "tempting" for the wrong ones, with {other.field} for the row each comes from')
    seen, same_way = set(), set()
    for f in facts_of_lesson(lesson):
        fid = f['id']
        w = f'{where} fact {fid}' + (f' (family {f["family"]}, row {f["row"]})' if f.get('family') else '')
        if not SLUG.match(fid):
            rep.err(w, 'a fact\'s id is lower case words joined by hyphens: progress refers to it, so it never changes')
        if fid in seen:
            rep.err(w, 'the same id as another fact in this lesson')
        seen.add(fid)
        if not f.get('family'):
            for k in set(f) - FACT_FIELDS:
                rep.err(w, f'no field "{k}" on a fact ({", ".join(sorted(FACT_FIELDS))})')
        text = f.get('text')
        if not isinstance(text, str) or not text.strip():
            rep.err(w, 'a fact needs "text": the one thing worth knowing, in a sentence')
        elif len(text.replace('*', '')) > FACT_TEXT_LIMIT:
            rep.warn(w, f'is {len(text)} characters; a fact is one thing, under {FACT_TEXT_LIMIT}')
        src = f.get('src') or []
        if not src:
            rep.err(w, 'a fact says where it comes from: "src", ids from the lesson\'s sources')
        for s in src:
            if s not in ctx['sources']:
                rep.err(w, f'cites "{s}", which isn\'t in the sources')
            ctx['cited'].add(s)
        asks = f.get('asks')
        if not isinstance(asks, list) or len(asks) < 2:
            rep.err(w, f'a fact needs two or more ways of asking it ("asks"), so it isn\'t learned as one question; it has {len(asks) if isinstance(asks, list) else 0}')
            asks = asks if isinstance(asks, list) else []
        ask_ids, sigs = set(), {}
        for k, a in enumerate(asks):
            aw = f'{w} ask {k + 1}' + (f' ({a.get("id")})' if isinstance(a, dict) and a.get('id') else '')
            if not isinstance(a, dict):
                rep.err(aw, 'an ask is a check or play step: { "id", "kind", "ask", ... }')
                continue
            if not a.get('id') or not SLUG.match(str(a['id'])):
                rep.err(aw, 'needs an "id" of lower case words joined by hyphens')
            elif a['id'] in ask_ids:
                rep.err(aw, 'the same id as another ask of this fact')
            ask_ids.add(a.get('id'))
            check_step({**a, 'src': a.get('src') or src}, aw, rep, kit, base, ctx, ask=True)
            for why in give_aways(a, kit):
                rep.err(aw, f'gives itself away: {why}. Ask it so the answer has to come from memory')
            sig = (way_of(a), _norm_words(a.get('ask', '')))
            if sig in sigs:
                rep.err(aw, f'asks it the same way as ask {sigs[sig]}: two asks are two different ways of asking')
            sigs[sig] = k + 1
        if len({way_of(a) for a in asks if isinstance(a, dict)}) == 1 and len(asks) >= 2 and f.get('family') not in same_way:
            if f.get('family'):
                same_way.add(f['family'])   # said once for a family, not for every row
                rep.warn(f'{where} family {f["family"]}', f'every ask shape is a {way_of(asks[0])}: vary the forms, so its facts are known, not one question remembered')
            else:
                rep.warn(w, f'every ask is a {way_of(asks[0])}: vary the forms, so it\'s known, not one question remembered')


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
    if 'narrator' in t and t['narrator'] not in NARRATORS:
        rep.err(where, f'"narrator" is one of {", ".join(NARRATORS)}')
    if 'subject' in t and not (isinstance(t['subject'], str) and t['subject'].strip() and len(t['subject']) <= 30):
        rep.err(where, '"subject" is a few words, like "Earth science": topics of one subject share a narrator')
    narrator = t.get('narrator') if t.get('narrator') in NARRATORS else DEFAULT_NARRATOR
    if 'lessons' in t:
        rep.err(where, '"lessons" became "path": the nodes in order, like [{"kind": "lesson", "id": "warm-water"}, {"kind": "chest", "id": "first-chest"}]')
    path = t.get('path')
    if not isinstance(path, list) or not path:
        if 'lessons' not in t:
            rep.err(where, 'no "path": the nodes in order, each {"kind": ..., "id": ...}')
        return t
    facts, _files = topic_facts(folder, t)
    known = set(facts)
    seen, done_before, unit = set(), [], 0
    for n, node in enumerate(path):
        w = f'{where} path[{n}]'
        if not isinstance(node, dict):
            rep.err(w, 'a node is {"kind": ..., "id": ...}')
            continue
        if n > 0 and node.get('unit'):
            unit += 1
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
                body = load_json(f)
                check_lesson(body, f'{folder.name}/{nid}.json', rep, kit, folder, kind, nid, narrator, known)
                draw = body.get('draw') if isinstance(body, dict) else None
                if kind in ('test', 'exam') and isinstance(draw, dict) and draw.get('from') in DRAW_FROM:
                    pool = [x for x in facts.values() if x['node'] < n and (draw['from'] == 'topic' or x['unit'] == unit) and x.get('asks')]
                    if not pool:
                        rep.err(w, f'it draws from the facts of its {draw["from"]}, and no lesson before it there declares any')
                    elif _num(draw.get('count')) is not None and len(pool) < draw['count']:
                        rep.warn(w, f'it draws {draw["count"]} questions from {len(pool)} fact(s): each is asked once, so it will ask {len(pool)}')
                    for x in pool:
                        used = {tt['way'] for tt in x['taught'] if tt['way']}
                        if used and all(way_of(a) in used for a in x['asks'] if isinstance(a, dict)):
                            rep.warn(w, f'the fact {x["id"]} can only be asked the way its lesson asked it ({", ".join(sorted(used))}): give it an ask in another form for a test to draw')
            if kind in ('test', 'exam') and not any(k == 'lesson' for k in done_before):
                rep.err(w, f'a {kind} draws on the lessons before it, and there are none before this one')
        elif kind == 'animation' and f.exists():
            if 'title' in node:
                rep.warn(w, f'an animation\'s title is the one in {nid}.json; this one isn\'t shown')
            check_scene_file(load_json(f), f'{folder.name}/{nid}.json', rep, kit, folder, nid, narrator)
        else:
            if f.exists():
                rep.warn(w, f'a {kind} has no file, so {nid}.json is never read')
            if kind == 'review' and not any(k in PLAYED for k in done_before):
                rep.err(w, 'a review goes over what came before it, and nothing played comes before this one')
            elif kind == 'review' and not any(x['node'] < n for x in facts.values()):
                rep.warn(w, 'a review asks the facts of the lessons before it, and they declare none: it shows "nothing to go over" until they do')
            if kind == 'chest' and not done_before:
                rep.warn(w, 'a chest is a reward for reaching it: it\'s first on the path, so it rewards nothing')
            if kind == 'chest' and done_before and done_before[-1] == 'chest':
                rep.warn(w, 'two chests in a row')
            if kind == 'animation':
                rep.warn(w, f'an animation is a scene, {nid}.json, and it isn\'t there: the path shows a placeholder until it is')
                if 'title' not in node:
                    rep.warn(w, 'an animation without its scene wants a "title": it\'s all the path can show of it')
        done_before.append(kind)
    if scenes_of(folder, t):
        if 'narrator' not in t:
            rep.warn(where, f'it has scenes: give "narrator", who voices them ({", ".join(NARRATORS)}); {DEFAULT_NARRATOR} until then')
        if 'subject' not in t:
            rep.warn(where, 'it has scenes: give "subject" ("Earth science"): the app lets a narrator be chosen per subject')
    lessons = [nd.get('id') for nd in path if isinstance(nd, dict) and nd.get('kind') == 'lesson']
    lo, hi = LEVELS.get(t.get('level'), (1, 99))
    if not lessons:
        rep.err(where, 'no lessons on the path')
    elif not lo <= len(lessons) <= hi:
        rep.warn(where, f'{len(lessons)} lesson(s) for {t.get("level")}, which is usually {lo} to {hi}')
    extra = {p.stem for p in folder.glob('*.json')} - seen - {'topic'}
    for x in sorted(extra):
        rep.warn(where, f'{x}.json is in the folder but not on the path, so it won\'t be shown')
    for fid, x in facts.items():
        if x.get('dupes'):
            rep.err(where, f'the fact "{fid}" is declared by {x["lesson"]} and again by {", ".join(x["dupes"])}: a fact\'s id is the topic\'s, and progress refers to it')
        if not x['taught']:
            rep.warn(where, f'no step names the fact "{fid}" ({x["lesson"]}): a miss in review links back to the start of its lesson. Give the step that teaches it "fact"')
    return t


def topic_facts(folder, topic):
    """A topic's facts, as js/facts.js (topicFacts) gathers them from the lessons on its path, families expanded:
    each with its lesson, its place on the path, its unit, and the steps that teach it (`fact` on a step).
    Also the played files, by node id."""
    facts, files, unit = {}, {}, 0
    for i, n in enumerate(topic.get('path') or []):
        if not isinstance(n, dict) or not isinstance(n.get('id'), str):
            continue
        if i > 0 and n.get('unit'):
            unit += 1
        f = folder / f'{n["id"]}.json'
        if n.get('kind') not in PLAYED or not f.exists():
            continue
        try:
            body = json.loads(f.read_text(encoding='utf-8'))
        except ValueError:
            continue
        if not isinstance(body, dict):
            continue
        files[n['id']] = (n, body)
        if n['kind'] == 'lesson':
            for fact in facts_of_lesson(body):
                if fact['id'] in facts:
                    facts[fact['id']].setdefault('dupes', []).append(n['id'])
                    continue
                facts[fact['id']] = {**fact, 'lesson': n['id'], 'lessonTitle': body.get('title') or n['id'], 'node': i, 'unit': unit, 'taught': []}
    for nid, (n, body) in files.items():
        if n['kind'] != 'lesson':
            continue
        for s in body.get('steps') or []:
            for fid in step_facts(s):
                if fid in facts:
                    facts[fid]['taught'].append({'lesson': nid, 'step': s.get('id'), 'kind': s.get('kind'), 'way': None if s.get('kind') == 'explain' else way_of(s)})
    return facts, files


def played_ids(topic, folder=None):
    """The ids of a topic's nodes that are a file each (lessons, tests and exams, and animations whose scene
    file is there, given the folder), in path order."""
    return [n['id'] for n in topic.get('path') or [] if isinstance(n, dict) and n.get('id') and
            (n.get('kind') in PLAYED or (folder is not None and n.get('kind') == 'animation' and (folder / f'{n["id"]}.json').exists()))]


def scenes_of(folder, topic):
    """Every scene in a topic: (key, scene, where). The key names its voice: an animation's id, or
    <lesson>.<step> for a scene step."""
    out = []
    for n in topic.get('path') or []:
        if not isinstance(n, dict) or not isinstance(n.get('id'), str):
            continue
        f = folder / f'{n["id"]}.json'
        if not f.exists():
            continue
        if n.get('kind') == 'animation':
            s = load_json(f)
            if isinstance(s, dict) and isinstance(s.get('lines'), list):
                out.append((n['id'], s, f.name))
        elif n.get('kind') in PLAYED:
            L = load_json(f)
            for s in (L.get('steps') or []) if isinstance(L, dict) else []:
                if isinstance(s, dict) and s.get('kind') == 'scene' and isinstance(s.get('lines'), list) and s.get('id'):
                    out.append((f'{n["id"]}.{s["id"]}', s, f'{f.name} step {s["id"]}'))
    return out


def voiced_of(folder, topic):
    """Everything in a topic that is read aloud, as (key, { "lines": [...] }, where): every scene (scenes_of),
    and every lesson, test and exam's own words (spoken_lines), keyed by its id. One voice file each, made
    and kept the same way."""
    out = scenes_of(folder, topic)
    for n in topic.get('path') or []:
        if isinstance(n, dict) and n.get('kind') in PLAYED and isinstance(n.get('id'), str) and (folder / f'{n["id"]}.json').exists():
            lines = spoken_lines(load_json(folder / f'{n["id"]}.json'))
            if lines:
                out.append((n['id'], {'lines': lines}, f'{n["id"]}.json'))
    return out


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
            node_kind, narrator, known = 'lesson', DEFAULT_NARRATOR, None
            if (p.parent / 'topic.json').exists():
                topic = load_json(p.parent / 'topic.json')
                node_kind = next((n.get('kind') for n in topic.get('path') or [] if isinstance(n, dict) and n.get('id') == p.stem), 'lesson')
                narrator = topic.get('narrator') if topic.get('narrator') in NARRATORS else DEFAULT_NARRATOR
                known = set(topic_facts(p.parent, topic)[0])
            body = load_json(p)
            if isinstance(body, dict) and 'lines' in body and 'steps' not in body:
                check_scene_file(body, p.name, rep, kit, p.parent, p.stem, narrator)
            else:
                check_lesson(body, p.name, rep, kit, p.parent, node_kind, p.stem, narrator, known)
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

def arg_type(x):
    """An argument's type in a few words: place, choice ring|pin|storm, list of place."""
    if x['type'] == 'choice':
        return 'choice ' + '|'.join(map(str, x['options']))
    if x['type'] == 'list' and isinstance(x.get('of'), str):
        return f'list of {x["of"]}'
    return x['type']


def cmd_parts(a):
    kit = Kit(app_dir(a.app))
    if a.json:
        print(json.dumps(kit.parts, ensure_ascii=False, indent=1))
        return
    for name, d in kit.parts.items():
        if d.get('of'):
            changed = ', '.join(f'{k} {json.dumps(v, ensure_ascii=False)}' for k, v in kit.presets[name].get('settings', {}).items())
            print(f'{name}: {d["title"]} (a preset: the {d["of"]} part with {changed} by default)')
            print(f'  {d["about"]}')
            print(f'  Every setting, call, event and state of {d["of"]}, listed under it, works here too.')
            print()
            continue
        print(f'{name}: {d["title"]}')
        print(f'  {d["about"]}')
        print('  settings:')
        hidden = set((d['settings'].get('form') or {}).get('hidden', [])) if name == 'inputs' else set()
        for k, s in d['settings'].items():
            # what's resting (a hidden form, and settings only it uses) isn't offered
            if s.get('forms') and set(s['forms']) <= hidden:
                continue
            opts = [o for o in s.get('options', []) if o not in s.get('hidden', [])]
            rng = f' {", ".join(map(str, opts))}' if s['type'] == 'choice' else f' {s.get("min")} to {s.get("max")}' if s['type'] == 'number' else ''
            if s.get('byForm'):
                rng = ' ' + '; '.join(f'{f}: {", ".join(o)}' for f, o in s['byForm'].items())
            forms = f' (forms: {", ".join(f for f in s["forms"] if f not in hidden)})' if s.get('forms') else ''
            print(f'    {k} ({s["type"]}{rng}; default {json.dumps(s.get("default"), ensure_ascii=False)}){forms}: {s.get("about", "")}')
        print('  calls:')
        for k, c in d.get('calls', {}).items():
            args = ', '.join(f'{x["name"]}{"?" if x.get("optional") else ""}: {arg_type(x)}' for x in c['args'])
            print(f'    {k}({args}): {c.get("about", "")}')
        if d.get('events'):
            print('  events: ' + '; '.join(f'{k} {e.get("gives", "")}' for k, e in d['events'].items()))
        print('  state: ' + '; '.join(f'{k}: {s.get("about", s.get("type", ""))}' for k, s in d.get('state', {}).items()))
        if d.get('marking'):
            print('  marking: ' + '; '.join(f'{k}: {json.dumps(m["rule"], ensure_ascii=False)}' for k, m in d['marking'].items() if k != 'about' and k not in hidden))
        print(f'  needs: {d.get("needs", {}).get("weight", "")}')
        print()
    if kit.scene.get('calls'):
        print('shot: Shots (a scene with two or more parts)')
        print(f'  {kit.scene.get("about", "")}')
        print('  calls:')
        for k, c in kit.scene['calls'].items():
            args = ', '.join(f'{x["name"]}{"?" if x.get("optional") else ""}: {arg_type(x)}' for x in c['args'])
            print(f'    shot.{k}({args}): {c.get("about", "")}')
        print('  sounds (an action\'s "sound"): ' + '; '.join(f'{k}: {v}' for k, v in kit.sounds.items()))
        print()


def ask_words(a):
    """An ask in a few words: its form, its question, and its answer."""
    if a.get('kind') == 'play':
        return f'{way_of(a)}: "{a.get("ask", "")}"'
    inp = a.get('input') or {}
    ans = answer_of(a)
    if inp.get('form') == 'choice':
        right = next((o.get('text') for o in inp.get('options') or [] if isinstance(o, dict) and o.get('id') == ans), ans)
        shown = f'"{right}" of {len(inp.get("options") or [])}'
    elif isinstance(ans, (dict, list)):
        shown = json.dumps(ans, ensure_ascii=False)
    else:
        shown = f'{js_str(ans)}{" " + inp["unit"] if inp.get("unit") else ""}' + (f' (within {js_str(a["within"])})' if a.get('within') else '')
    return f'{inp.get("form")}: "{a.get("ask", "")}" → {shown}'


def cmd_facts(a):
    """Every fact a topic's lessons declare, with its ways of asking, the steps that teach it, and what draws on it."""
    kind, p = resolve_target(a.topic, pathlib.Path(a.data) if a.data else None)
    if kind != 'topic':
        die(f'{a.topic} is a lesson file: give its topic\'s folder.')
    topic = load_json(p / 'topic.json')
    facts, files = topic_facts(p, topic)
    if a.json:
        print(json.dumps(list(facts.values()), ensure_ascii=False, indent=1))
        return
    made = sum(1 for x in facts.values() if x.get('family'))
    fams = len({x['family'] for x in facts.values() if x.get('family')})
    print(f'{topic.get("title", p.name)}: {len(facts)} fact(s)' + (f', {made} of them made from {fams} famil{"y" if fams == 1 else "ies"}' if made else '') + '.')
    by_lesson = {}
    for x in facts.values():
        by_lesson.setdefault(x['lesson'], []).append(x)
    for lid, xs in by_lesson.items():
        print(f'\n{lid} ({files[lid][1].get("title", lid)}):')
        for x in xs:
            print(f'  {x["id"]}: {x.get("text", "").replace("*", "")}' + (f'  [family {x["family"]}]' if x.get('family') else '') + f'  ({", ".join(x.get("src") or []) or "no source"})')
            taught = ', '.join(f'{t["step"]}{" (" + t["way"] + ")" if t["way"] else ""}' + ('' if t['lesson'] == lid else f' in {t["lesson"]}') for t in x['taught'])
            print(f'    taught by: {taught or "no step names it"}')
            for k in x.get('asks') or []:
                if isinstance(k, dict):
                    print(f'    ask {k.get("id")}: {ask_words(k)}')
    for nid, (n, body) in files.items():
        draw = body.get('draw')
        if isinstance(draw, dict):
            print(f'\n{nid} ({n["kind"]}): draws {draw.get("count")} question(s) from the facts of its {draw.get("from")}, asked in ways their lessons didn\'t use')
        elif n['kind'] != 'lesson':
            named = sorted({f for s in body.get('steps') or [] for f in step_facts(s)})
            print(f'\n{nid} ({n["kind"]}): lists its {len(body.get("steps") or [])} question(s)' + (f'; they review {", ".join(named)}' if named else ''))
    for i, n in enumerate(topic.get('path') or []):
        if isinstance(n, dict) and n.get('kind') == 'review':
            before = [x['id'] for x in facts.values() if x['node'] < i]
            print(f'\n{n.get("id")} (review): goes over {len(before)} fact(s) from the lessons before it')


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
    lessons = [(p / f'{lid}.json', p) for lid in played_ids(load_json(p / 'topic.json'), p)] if kind == 'topic' else [(p, p.parent)]
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


# ---------- voicing scenes

def voice_files(folder, topic):
    """The voice files a topic sends: each scene's timing file and every clip it names, as paths in the folder."""
    out = set()
    for key, _scene, _where in voiced_of(folder, topic):
        vf = folder / 'voice' / f'{key}.json'
        if not vf.exists():
            continue
        out.add(f'voice/{key}.json')
        for byn in (load_json(vf).get('lines') or {}).values():
            for entry in byn.values():
                if isinstance(entry, dict) and entry.get('clip') and (folder / entry['clip']).exists():
                    out.add(entry['clip'])
    return out


def spoken(said):
    """What's said, as the engine is given it: the stress marks go (they're for the caption), and a line
    break is a space."""
    return ' '.join(said.replace('*', '').split())


def clip_key(narrator, said):
    """What a clip is made from: when any of it changes, the clip is made again."""
    n = NARRATORS[narrator]
    blob = json.dumps({'pipeline': VOICE_PIPELINE, 'engine': n['engine'], 'voice': n['voice'], 'settings': n.get('settings', {}),
                       'said': spoken(said), 'encode': ENCODE}, sort_keys=True, ensure_ascii=False)
    return hashlib.sha1(blob.encode('utf-8')).hexdigest()


def save_timing(path, timing):
    """A timing file, with each word on a line of its own."""
    text = json.dumps(timing, ensure_ascii=False, indent=1)
    text = re.sub(r'\[\s*("(?:[^"\\]|\\.)*"),\s*([-\d.e]+),\s*([-\d.e]+)\s*\]', r'[\1, \2, \3]', text)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text + '\n', encoding='utf-8', newline='\n')


def tts_dir(given=None):
    """The folder with the voice environments (kokoro, chatterbox, check): --tts, PRIMER_TTS, or the path
    `install.py --tts` left beside this script."""
    saved = HERE / 'tts-path.txt'
    for c in [given, os.environ.get('PRIMER_TTS'), saved.read_text(encoding='utf-8').strip() if saved.exists() else None]:
        if c and pathlib.Path(c).is_dir():
            return pathlib.Path(c)
    die('Can\'t find the voice environments. Pass --tts <folder holding kokoro, chatterbox and check>, set PRIMER_TTS, '
        'or run install.py --tts <folder> once.')


def env_python(tts, env, override=None):
    if override:
        return override
    for p in (tts / env / 'Scripts' / 'python.exe', tts / env / 'bin' / 'python'):
        if p.exists():
            return str(p)
    die(f'{tts / env} isn\'t a Python environment (no Scripts/python.exe or bin/python in it).')


def run_env(python, script, args, tts):
    env = {**os.environ, 'PYTHONIOENCODING': 'utf-8'}
    if tts is not None and (tts / 'hf').is_dir() and not env.get('HF_HOME'):
        env['HF_HOME'] = str(tts / 'hf')
    r = subprocess.run([python, str(HERE / 'voice' / script), *map(str, args)], capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
    if r.returncode:
        die(f'{script} failed:\n{(r.stderr or r.stdout).strip()[-2000:]}')
    return r


def ff(ffmpeg, *args):
    return subprocess.run([ffmpeg, '-hide_banner', *map(str, args)], capture_output=True, text=True, encoding='utf-8', errors='replace', check=True)


def loudness(ffmpeg, path):
    p = ff(ffmpeg, '-nostats', '-i', path, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-')
    data = json.loads(re.findall(r'\{[^{}]*\}', p.stderr, flags=re.S)[-1])
    return float(data['input_i']), float(data['input_tp'])


def seconds_of(ffprobe, path):
    p = subprocess.run([ffprobe, '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], capture_output=True, text=True, check=True)
    return float(p.stdout.strip())


def encode_clip(wav, out, ffmpeg='ffmpeg', ffprobe='ffprobe'):
    """A wav master into the clip the phone plays: trimmed to its sound, one fixed gain to about -13 LUFS, soft
    fades, a gentle true-peak limiter, then AAC-LC, mono, 24 kHz, 96 kbps. A fixed gain, not loudnorm's second
    pass, which pumps on a 2-second line. The limiter runs at 96 kHz, so it sees the peaks between samples,
    with a 3 ms look-ahead (its delay taken back out) and a 60 ms release: on the pilot's narration it takes
    at most about 3.5 dB off a peak, and more than 3 dB on under 1% of the speech. Tried again with more gain
    until the loudness is within 0.3 dB, and with a lower ceiling if a true peak still passes -1 dB."""
    raw, _ = loudness(ffmpeg, wav)
    floor = f'{raw - ENCODE["floor"]:.1f}dB'
    trim = (f'silenceremove=start_periods=1:start_threshold={floor}:start_silence=0.06:stop_periods=1:stop_duration={ENCODE["gap"]}'
            f':stop_threshold={floor}:stop_silence=0.15,areverse,silenceremove=start_periods=1:start_threshold={floor}:start_silence=0.15,areverse')
    trimmed = out.with_suffix('.trim.wav')
    ff(ffmpeg, '-y', '-i', wav, '-af', trim, '-ac', '1', trimmed)
    length = seconds_of(ffprobe, trimmed)
    loud, _ = loudness(ffmpeg, trimmed)
    gain, ceiling = ENCODE['lufs'] - loud, ENCODE['ceiling']
    for _ in range(8):
        fades = f'afade=t=in:d=0.01,afade=t=out:st={max(length - 0.05, 0):.3f}:d=0.05'
        limiter = f'aresample=96000,alimiter=limit={ceiling:.2f}dB:attack=3:release=60:level=false:latency=1,aresample={ENCODE["rate"]}'
        ff(ffmpeg, '-y', '-i', trimmed, '-af', f'volume={gain:.2f}dB,{fades},{limiter}',
           '-ar', ENCODE['rate'], '-ac', '1', '-c:a', 'aac', '-b:a', ENCODE['bitrate'], '-movflags', '+faststart', '-map_metadata', '-1', out)
        got, peak = loudness(ffmpeg, out)
        if abs(got - ENCODE['lufs']) <= 0.3 and peak <= ENCODE['peak']:
            break
        gain += ENCODE['lufs'] - got
        if peak > ENCODE['peak']:
            ceiling -= peak - ENCODE['peak'] + 0.2
    trimmed.unlink()
    return {'lufs': round(got, 2), 'peak': round(peak, 2)}


def take_score(res):
    """How wrong a take is: words heard wrong, and a long tail of sound after the last word."""
    if not res:
        return 99
    return sum(o.get('words', 1) for o in res.get('differences') or []) + (2 if (res.get('tail') or 0) > LONG_TAIL else 0)


def take_good(res):
    return bool(res) and res.get('verdict') in ('ok', 'minor') and (res.get('tail') or 0) <= LONG_TAIL and bool(res.get('words'))


def voice_takes(todo, tts, a, ffmpeg, ffprobe, work, best):
    """Makes, hears and retakes these clips, a round per take: every engine's jobs in one go, so each model loads
    once. best (job id -> { res, file, take, takes }) gets the best take of each."""
    for take in range(1, MAX_TAKES + 1):
        if not todo:
            break
        wav, clips = work / f'wav{take}', work / f'm4a{take}'
        clips.mkdir(parents=True, exist_ok=True)
        for engine in ('kokoro', 'chatterbox'):
            mine = [{**j, 'take': j.get('first', 0) + take} for j in todo if j['engine'] == engine]
            if not mine:
                continue
            jf = work / f'{engine}{take}.json'
            save_json(jf, mine)
            print(f'  take {take}: {len(mine)} with {engine}...', flush=True)
            run_env(env_python(tts, ENVIRONMENTS[engine], a.python), 'say.py', ['--engine', engine, '--jobs', jf, '--out', wav], tts)
        for j in todo:
            encode_clip(wav / f'{j["id"]}.wav', clips / f'{j["id"]}.m4a', ffmpeg, ffprobe)
        hf = work / f'hear{take}.json'
        save_json(work / f'hearjobs{take}.json', [{'id': j['id'], 'text': j['text'], 'take': take} for j in todo])
        run_env(env_python(tts, ENVIRONMENTS['hear'], a.python), 'hear.py',
                ['--jobs', work / f'hearjobs{take}.json', '--clips', clips, '--out', hf, '--ffmpeg', ffmpeg, '--ffprobe', ffprobe], tts)
        heard = load_json(hf)
        left = []
        for j in todo:
            res = heard.get(j['id'])
            if j['id'] not in best or take_score(res) < take_score(best[j['id']]['res']):
                best[j['id']] = {'res': res, 'file': clips / f'{j["id"]}.m4a', 'take': take}
            best[j['id']]['takes'] = j.get('first', 0) + take
            if not take_good(res):
                left.append(j)
        if left and take < MAX_TAKES:
            print(f'  {len(left)} clip(s) heard wrong; another take: ' + '; '.join(f'{j["line"]} ({j["narrator"]}): "{(heard.get(j["id"]) or {}).get("heard", "")}"' for j in left[:4]), flush=True)
        todo = left
    return best


SAMPLES_FILE = 'narrators/samples.json'


def sample_words(narrator):
    """What a narrator says to introduce itself: its name, said naturally."""
    return f"Hello, I'm {NARRATORS[narrator]['name']}. I'll read your lessons to you."


def make_samples(data, a, tts, ffmpeg, ffprobe):
    """Each narrator's sample, a short clip saying who it is, made once into the data repo's narrators/ folder
    (narrators/<narrator>.<key8>.m4a, listed in narrators/samples.json) and made again only when its words or
    its making change. The phone keeps them all, always, so a narrator can be heard before it's chosen."""
    folder = data / 'narrators'
    old = (load_json(data / SAMPLES_FILE).get('samples') or {}) if (data / SAMPLES_FILE).exists() else {}
    entries, jobs = {}, []
    for n in NARRATORS:
        said = sample_words(n)
        k = clip_key(n, said)
        e = old.get(n)
        if e and e.get('key') == k and e.get('clip') and (data / e['clip']).is_file() and not a.again:
            entries[n] = e
            continue
        jobs.append({'id': f's{len(jobs)}', 'scene': 'samples', 'line': 'hello', 'narrator': n, 'text': spoken(said), 'said': said, 'key': k,
                     'first': 0, 'engine': NARRATORS[n]['engine'], 'voice': NARRATORS[n]['voice'], 'settings': NARRATORS[n].get('settings', {})})
    if jobs:
        print(f'Narrator samples: {len(jobs)} to make.', flush=True)
        work = pathlib.Path(tempfile.mkdtemp(prefix='primer-samples-'))
        try:
            best = voice_takes(list(jobs), tts, a, ffmpeg, ffprobe, work, {})
            folder.mkdir(parents=True, exist_ok=True)
            for j in jobs:
                b = best.get(j['id'])
                if not b or not b['res'] or not b['res'].get('words'):
                    print(f'  warning: {NARRATORS[j["narrator"]]["name"]}\'s sample couldn\'t be made.')
                    continue
                rel = f'narrators/{j["narrator"]}.{j["key"][:8]}.m4a'
                shutil.copyfile(b['file'], data / rel)
                res = b['res']
                entries[j['narrator']] = {'clip': rel, 'key': j['key'], 'said': j['said'], 'seconds': round(seconds_of(ffprobe, data / rel), 3),
                                          'words': res['words'], 'check': 'ok' if take_good(res) else 'flag', 'heard': res.get('heard', ''), 'takes': b['takes']}
        finally:
            shutil.rmtree(work, ignore_errors=True)
    if not entries:
        return
    order = {n: entries[n] for n in NARRATORS if n in entries}
    save_timing(data / SAMPLES_FILE, {'v': 1, 'about': 'Each narrator saying who it is, kept on the phone always and played when a narrator is chosen.', 'samples': order})
    keep = {e['clip'] for e in order.values()} | {SAMPLES_FILE}
    for f in sorted(folder.glob('*')):
        if f.is_file() and f.relative_to(data).as_posix() not in keep:
            f.unlink()
    if not jobs:
        print('Narrator samples: all four made already.')


def samples_root(folder, a):
    """Where a topic's narrator samples go: the data repo the topic folder is in, else --data; else nowhere."""
    if folder.resolve().parent.name == 'topics' and (folder.resolve().parent.parent / 'index.json').exists():
        return folder.resolve().parent.parent
    if getattr(a, 'data', None):
        return pathlib.Path(a.data)
    return None


def cmd_samples(a):
    """Makes each narrator's sample in the data clone (--data, PRIMER_DATA or ~/Dev/primer-data)."""
    data = pathlib.Path(a.data) if a.data else data_dir()
    ffmpeg, ffprobe = a.ffmpeg or 'ffmpeg', a.ffprobe or 'ffprobe'
    tts = None if a.python else tts_dir(a.tts)
    make_samples(data, a, tts, ffmpeg, ffprobe)


def cmd_voice(a):
    """Voices everything in a topic that is read aloud: every scene's lines, and every lesson, test and exam's
    own words (spoken_lines). A clip per line per narrator, each heard back and aligned, and a timing file per
    scene or lesson. Only clips whose words, narrator or making changed are made again: a clip is found by its
    key wherever it was, so a line that moved, or the same words twice, is made once."""
    kind, folder = resolve_target(a.topic, pathlib.Path(a.data) if a.data else None)
    if kind != 'topic':
        die('voice takes a topic folder.')
    topic = load_json(folder / 'topic.json')
    narrators = list(NARRATORS) if a.narrators == 'all' else [topic.get('narrator', DEFAULT_NARRATOR)] if a.narrators == 'topic' else [n.strip() for n in a.narrators.split(',') if n.strip()]
    for n in narrators:
        if n not in NARRATORS:
            die(f'No narrator "{n}": one of {", ".join(NARRATORS)}, "all" or "topic".')
    scenes = voiced_of(folder, topic)
    if not scenes:
        print('Nothing in this topic is read aloud: nothing to voice.')
        return
    ffmpeg, ffprobe = a.ffmpeg or 'ffmpeg', a.ffprobe or 'ffprobe'
    if not shutil.which(ffmpeg) and not pathlib.Path(ffmpeg).exists():
        die('voice needs ffmpeg (and ffprobe) on PATH, or --ffmpeg and --ffprobe.')
    tts = None if a.python else tts_dir(a.tts)

    # Every clip there is, by its key: a clip is the same clip wherever its words are said.
    have = {}
    for key, _scene, _where in scenes:
        for byn in ((scene_voice(folder, key) or {}).get('lines') or {}).values():
            for e in (byn or {}).values():
                if isinstance(e, dict) and e.get('key') and e.get('clip') and (folder / e['clip']).is_file():
                    have.setdefault(e['key'], e)

    # What there is, and what has to be made: one job per clip to make, however many lines say it.
    plans, jobs, wanted = {}, [], {}
    for key, scene, where in scenes:
        keep = {}
        for line in scene.get('lines') or []:
            if not isinstance(line, dict) or not line.get('id') or not str(line.get('text', '')).strip():
                continue
            said = said_of(line)
            for n in NARRATORS:
                k = clip_key(n, said)
                prev = None if a.again else have.get(k)
                retry = bool(prev) and a.retry and prev.get('check') == 'flag'
                if prev and not retry:
                    keep.setdefault(line['id'], {})[n] = {**prev, 'said': said}  # a stress mark moved: the same clip
                elif n in narrators:
                    if k not in wanted:
                        # a clip still heard wrong, tried again: its takes carry on from the last, with new seeds and speeds
                        jobs.append({'id': f'j{len(jobs)}', 'scene': key, 'line': line['id'], 'narrator': n, 'text': spoken(said), 'said': said, 'key': k,
                                     'first': int(prev.get('takes') or 0) if retry else 0,
                                     'engine': NARRATORS[n]['engine'], 'voice': NARRATORS[n]['voice'], 'settings': NARRATORS[n].get('settings', {})})
                    wanted.setdefault(k, []).append((key, line['id'], n, said))
        plans[key] = keep
    kept = sum(len(v) for p in plans.values() for v in p.values())
    lines_n = sum(len(s.get('lines') or []) for _, s, _ in scenes)
    print(f'{len(scenes)} scene(s) and lesson(s), {lines_n} line(s), narrators {", ".join(narrators)}: '
          f'{len(jobs)} clip(s) to make, {kept} kept as they were.', flush=True)

    def write_timings(final=False):
        """A timing file per scene or lesson, each clip named for its line (voice/<key>/<line>.<narrator>.<key8>.m4a);
        once all is made, nothing is left in voice/ that no timing file names."""
        names = set()
        for key, scene, where in scenes:
            order = [x.get('id') for x in scene.get('lines') or [] if isinstance(x, dict)]
            lines = {}
            for lid in order:
                for n in NARRATORS:
                    e = plans[key].get(lid, {}).get(n)
                    if not e:
                        continue
                    rel = f'voice/{key}/{lid}.{n}.{e["key"][:8]}.m4a'
                    if e['clip'] != rel and (folder / e['clip']).is_file():
                        (folder / rel).parent.mkdir(parents=True, exist_ok=True)
                        shutil.copyfile(folder / e['clip'], folder / rel)  # found under another line: copied to its own name
                        e = plans[key][lid][n] = {**e, 'clip': rel}
                    lines.setdefault(lid, {})[n] = e
            timing = {'v': 1, 'scene': key, 'units': 'seconds from the start of each clip; words are [word as said, start, end]',
                      'how': 'Made by primer voice: Kokoro (Heart, George, Bella) or Chatterbox (Chatterbox A); heard back with faster-whisper; '
                             'words found by forced alignment (wav2vec2); AAC-LC mono 24 kHz 96 kbps at about -13 LUFS, true peaks under -1 dB.',
                      'lines': lines}
            save_timing(folder / 'voice' / f'{key}.json', timing)
            names.add(f'voice/{key}.json')
            names |= {e['clip'] for byn in lines.values() for e in byn.values()}
        if final and (folder / 'voice').exists():
            for f in sorted((folder / 'voice').rglob('*'), reverse=True):
                rel = f.relative_to(folder).as_posix()
                if f.is_file() and rel not in names:
                    f.unlink()
                elif f.is_dir() and not any(f.iterdir()):
                    f.rmdir()

    # Make, hear and retake, a round per take: every engine's jobs in one go, so each model loads once. A long
    # list goes in batches, each saved as it's done, so a run that stops part way keeps what it made.
    best, batch = {}, max(1, int(os.environ.get('PRIMER_VOICE_BATCH') or 120))
    for at in range(0, len(jobs), batch):
        some = jobs[at:at + batch]
        if len(jobs) > batch:
            print(f'  clips {at + 1} to {at + len(some)} of {len(jobs)}', flush=True)
        work = pathlib.Path(tempfile.mkdtemp(prefix='primer-voice-'))
        try:
            voice_takes(list(some), tts, a, ffmpeg, ffprobe, work, best)
            # Into the topic's folder, for every line that says it: voice/<scene>/<line>.<narrator>.<key>.m4a
            for j in some:
                b = best.get(j['id'])
                if not b or not b['res'] or not b['res'].get('words'):
                    print(f'  warning: {j["scene"]} line {j["line"]} ({j["narrator"]}) couldn\'t be voiced; it plays from its caption.')
                    continue
                res = b['res']
                for scene_key, lid, n, said in wanted[j['key']]:
                    rel = f'voice/{scene_key}/{lid}.{n}.{j["key"][:8]}.m4a'
                    (folder / rel).parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(b['file'], folder / rel)
                    plans[scene_key].setdefault(lid, {})[n] = {
                        'clip': rel, 'key': j['key'], 'said': said, 'seconds': round(seconds_of(ffprobe, folder / rel), 3),
                        'words': res['words'], 'check': 'ok' if take_good(res) else 'flag', 'heard': res.get('heard', ''), 'takes': b['takes']}
                if not take_good(res):
                    print(f'  warning: after {b["takes"]} takes, {j["scene"]} line {j["line"]} ({j["narrator"]}) is still heard as "{res.get("heard")}": listen to it, or reword the line.')
        finally:
            shutil.rmtree(work, ignore_errors=True)
        write_timings()

    write_timings(final=True)
    made = sum(1 for j in jobs if j['id'] in best)
    retakes = sum(1 for b in best.values() if b['takes'] > 1)
    flagged = sum(1 for b in best.values() if not take_good(b['res']))
    weight = sum(f.stat().st_size for f in (folder / 'voice').rglob('*.m4a')) if (folder / 'voice').exists() else 0
    print(f'Voiced: {made} made ({retakes} needed another take, {flagged} still heard wrong), {kept} kept. {weight / 1024:.0f} KB of voice in {folder.name}/voice.')
    # and each narrator's "Hello, I'm ..." sample, into the data repo, once
    root = samples_root(folder, a)
    if root is not None:
        make_samples(root, a, tts, ffmpeg, ffprobe)
    else:
        print('Narrator samples: this topic isn\'t in a data repo, so they weren\'t made here: run primer samples (or pass --data).')


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
    played = played_ids(topic, src)
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
        # the scenes' voice: each timing file and the clips it names, and nothing else under voice/
        voiced = voice_files(src, topic)
        if (dest / 'voice').exists():
            for f in sorted((dest / 'voice').rglob('*'), reverse=True):
                rel = f.relative_to(dest).as_posix()
                if f.is_file() and rel not in voiced:
                    f.unlink()
                elif f.is_dir() and not any(f.iterdir()):
                    f.rmdir()
        for rel in sorted(voiced):
            (dest / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src / rel, dest / rel)
        for folder_name in ('media', 'voice'):
            weight = sum(f.stat().st_size for f in (dest / folder_name).rglob('*') if f.is_file()) if (dest / folder_name).exists() else 0
            if weight:
                print(f'  {folder_name}: {weight / 1024:.0f} KB')
    write_index(data)
    message = a.message or f'Topic: {topic["title"]} ({path_words(topic)})'
    # the narrators' samples, made by voice or samples, go up with any topic
    extra = [data / 'narrators'] if (data / 'narrators').is_dir() else []
    if not (data / SAMPLES_FILE).exists():
        print('  note: there are no narrator samples in the data clone yet: run primer samples, so a narrator can be heard before it\'s chosen.')
    publish(data, message, [dest, data / 'index.json', *extra], push=not a.no_push)


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


STRONG, WEAK = 0.9, 0.7


def memory_of(data, app, now=None):
    """What the phone's memory model makes of every answer so far: skill/memory.mjs replays the progress files
    through the app's own js/memory.js. None if Node isn't there or it couldn't run."""
    node = shutil.which('node')
    if not node:
        return None
    args = [node, str(HERE / 'memory.mjs'), '--app', str(app), '--data', str(data)] + (['--now', now] if now else [])
    r = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode:
        print(f'  warning: the memory couldn\'t be worked out: {(r.stderr or r.stdout).strip()[-400:]}')
        return None
    return json.loads(r.stdout.strip().splitlines()[-1])


def print_memory(data, a):
    """Which facts are strong and which weak, from every answer so far (not just the new ones)."""
    mem = memory_of(data, app_dir(a.app), getattr(a, 'now', None))
    if mem is None:
        print('\n(Memory: needs Node on PATH, to run the app\'s own memory model.)')
        return
    facts = [x for x in mem['facts'] if not a.topic or x['topic'] == a.topic]
    if not facts:
        return
    asked = [x for x in facts if x['asked']]
    print(f'\nMemory, from every answer so far ({len(asked)} of {len(facts)} facts asked; recall is the chance it\'s remembered now, by the phone\'s own model):')
    strong = sorted([x for x in asked if x['recall'] >= STRONG and x['marks'] and x['marks'][-1] == 'right'], key=lambda x: -x['recall'])
    weak = sorted([x for x in asked if x['recall'] < WEAK or (x['marks'] and x['marks'][-1] == 'wrong')], key=lambda x: x['recall'])
    holding = [x for x in asked if x not in strong and x not in weak]
    if strong:
        print(f'  Strong ({len(strong)}): ' + ', '.join(f'{x["fact"]} {round(x["recall"] * 100)}%' for x in strong))
    if holding:
        print(f'  Holding ({len(holding)}): ' + ', '.join(f'{x["fact"]} {round(x["recall"] * 100)}%' for x in holding))
    if weak:
        print(f'  Weak ({len(weak)}):')
        for x in weak:
            last = x['last'] or {}
            missed = sum(1 for m in x['marks'] if m == 'wrong')
            print(f'    {x["topic"]} › {x["fact"]} {round(x["recall"] * 100)}%: {x["text"].replace("*", "")}  (missed {missed} of {len(x["marks"])}; '
                  f'last {last.get("mark")} {"in review" if last.get("via") == "review" else "in " + str(last.get("via"))}: {show_value(last.get("value"))}'
                  + (f', shown "{last["why"]}"' if last.get('why') and last.get('mark') != 'right' else '') + ')')
    unasked = [x for x in facts if not x['asked']]
    if unasked:
        print(f'  Not asked yet ({len(unasked)}): ' + ', '.join(x['fact'] for x in unasked))
    if mem['review']['answers']:
        print(f'  Review so far: {mem["review"]["answers"]} answer(s) in {mem["review"]["runs"]} run(s), {mem["review"]["right"]} right; best combo ×{mem["best"]}')


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
        by_lesson, opened, reviews = {}, {}, []
        for e in events:
            if e.get('type') == 'open':  # a chest opened, or a review or animation visited: no steps
                opened.setdefault((e.get('topic'), e.get('node'), e.get('kind')), []).append(e)
                continue
            if e.get('review') or e.get('type') == 'review':  # an answer in a review run, or a run's end
                reviews.append(e)
                continue
            by_lesson.setdefault((e.get('topic'), e.get('lesson')), []).append(e)
        for (topic, node, kind), evs in opened.items():
            print(f'\n{topic} › {node} ({kind}): opened {len(evs)} time(s), first at {evs[0].get("at", "?")}')
        if reviews:
            answers = [e for e in reviews if e.get('type') == 'attempt']
            ends = [e for e in reviews if e.get('type') == 'review']
            runs = {e.get('review') for e in answers} | {e.get('run') for e in ends}
            print(f'\nReview: {len(answers)} answer(s) in {len(runs)} run(s), {sum(1 for e in answers if e.get("right"))} right' +
                  (f', best combo ×{max(int(e.get("combo") or 0) for e in ends)}' if ends else '') +
                  ''.join(f'; went through the review {e.get("node")} in {e.get("topic")}' for e in ends if e.get('node') and e.get('done')))
            for e in answers:
                if not e.get('right'):
                    print(f'  {"close" if e.get("close") else "wrong"}: {e.get("topic")} › {e.get("fact")} (asked {e.get("ask")}, {e.get("form")}): {show_value(e.get("value"))}' + (f'  shown: "{e["why"]}"' if e.get('why') else ''))
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
                        print(f'    {m}{" at line " + t["line"] if t.get("line") else ""}: {show_value(t.get("value"))}' + (f'  shown: "{t["why"]}"' if t.get('why') else ''))
    if not a.json:
        print_memory(data, a)
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
    s = sub.add_parser('facts', help='every fact a topic declares, its ways of asking, and what teaches and draws on it')
    s.add_argument('topic', help='a topic folder, or a topic id in the data clone')
    s.add_argument('--json', action='store_true')
    s.set_defaults(fn=cmd_facts)
    s = sub.add_parser('fit', help='draw each step on the smallest iPhone and say whether it fits')
    s.add_argument('target')
    s.add_argument('--json', action='store_true')
    s.add_argument('--shots', help='a folder for a picture of each step')
    s.add_argument('--browser', help='Edge or Chrome, if it isn\'t found by itself')
    s.add_argument('--debug-port', type=int)
    s.set_defaults(fn=cmd_fit)
    s = sub.add_parser('voice', help='voice every scene in a topic: a clip per line per narrator, heard back, timed by word')
    s.add_argument('topic', help='the topic\'s folder')
    s.add_argument('--narrators', default='all', help='all (the default, so any can be chosen on the phone), topic (its own only), or a list: heart,george')
    s.add_argument('--again', action='store_true', help='make every clip again, even those whose words haven\'t changed')
    s.add_argument('--retry', action='store_true', help='try again the clips still heard wrong, with fresh takes')
    s.add_argument('--tts', help='the folder holding the voice environments: kokoro, chatterbox and check')
    s.add_argument('--python', help=argparse.SUPPRESS)  # one Python for every engine: the tests, with PRIMER_VOICE_FAKE=1
    s.add_argument('--ffmpeg', help='ffmpeg, if it isn\'t on PATH')
    s.add_argument('--ffprobe', help='ffprobe, if it isn\'t on PATH')
    s.set_defaults(fn=cmd_voice)
    s = sub.add_parser('samples', help='make each narrator\'s "Hello, I\'m ..." sample in the data clone, which the phone keeps always')
    s.add_argument('--again', action='store_true', help='make them again')
    s.add_argument('--tts', help='the folder holding the voice environments: kokoro, chatterbox and check')
    s.add_argument('--python', help=argparse.SUPPRESS)
    s.add_argument('--ffmpeg', help='ffmpeg, if it isn\'t on PATH')
    s.add_argument('--ffprobe', help='ffprobe, if it isn\'t on PATH')
    s.set_defaults(fn=cmd_samples)
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
    s.add_argument('--now', help=argparse.SUPPRESS)  # an ISO time to reckon memory at: the tests
    s.set_defaults(fn=cmd_progress)
    a = p.parse_args()
    a.fn(a)


if __name__ == '__main__':
    main()
