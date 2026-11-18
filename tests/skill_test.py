#!/usr/bin/env python3
"""Tests for the writer's side: python tests/skill_test.py

Runs skill/primer.py as the writer would, on the made-up topic in tests/fixtures/data and on broken copies of it.
`send` and `progress` work on a throwaway git repo made here (a bare repo standing in for GitHub, and a clone),
never on the real data repo. `fit` draws in headless Edge on debugging port 9341.
"""
import copy
import getpass
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
PRIMER = ROOT / 'skill' / 'primer.py'
FIXTURE = ROOT / 'tests' / 'fixtures' / 'data' / 'topics' / 'test-topic'


def run(*args, data=None, check=False):
    env = {**os.environ, 'PRIMER_APP': str(ROOT)}
    if data:
        env['PRIMER_DATA'] = str(data)
    r = subprocess.run([sys.executable, str(PRIMER), *map(str, args)], capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
    if check and r.returncode:
        raise AssertionError(r.stdout + r.stderr)
    return r


def git(cwd, *args):
    r = subprocess.run(['git', *args], cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode:
        raise AssertionError(f'git {args}: {r.stderr}')
    return r.stdout


class Work(unittest.TestCase):
    def setUp(self):
        self.tmp = pathlib.Path(tempfile.mkdtemp(prefix='primer-skill-'))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def topic(self, change=None, name='test-topic'):
        """A copy of the made-up topic, with one lesson changed by `change(lesson)`."""
        self.copies = getattr(self, 'copies', 0) + 1
        dest = self.tmp / f'copy{self.copies}' / name
        shutil.copytree(FIXTURE, dest)
        if change:
            f = dest / 'every-kind.json'
            lesson = json.loads(f.read_text(encoding='utf-8'))
            change(lesson)
            f.write_text(json.dumps(lesson, ensure_ascii=False, indent=1), encoding='utf-8')
        return dest


def step(lesson, sid):
    return next(s for s in lesson['steps'] if s['id'] == sid)


class Parts(unittest.TestCase):
    def test_lists_every_part_from_its_description(self):
        out = run('parts', check=True).stdout
        for word in ('map: Map', 'inputs: Inputs', 'spinTo(place: place', 'band(from: number', 'reveal(answer: answer)', 'spin (choice free, auto, locked', 'events: tapped', 'state: selected',
                     'picture (choice none, warmth, depth', 'start (number', 'borders (bool', 'style (choice day, warmth, muted, political',
                     'projection (choice globe, equal-earth, natural-earth, mercator', 'zoomTo(to: place-or-level', 'colourBy(data: table, ramp?: choice heat|green|blue',
                     'arc(from: place, to: place', 'track(path: list of place, progress?: number, rider?: choice none|storm|ring|pin', 'settled { centre, zoom }', 'zoom: How close'):
            self.assertIn(word, out)

    def test_the_globe_is_a_preset_of_the_map(self):
        out = run('parts', check=True).stdout
        self.assertIn('globe: Globe (a preset: the map part with projection "globe", pinch false by default)', out)

    def test_json(self):
        parts = json.loads(run('parts', '--json', check=True).stdout)
        self.assertEqual(sorted(parts), ['globe', 'inputs', 'map'])
        self.assertIn('marking', parts['inputs'])
        globe, flat = parts['globe'], parts['map']
        self.assertEqual((globe['of'], globe['settings']['projection']['default'], globe['settings']['pinch']['default']), ('map', 'globe', False))
        self.assertEqual(flat['settings']['projection']['default'], 'equal-earth')
        self.assertEqual(globe['calls'], flat['calls'])
        self.assertEqual(globe['state'], flat['state'])


class Check(Work):
    def errors(self, change):
        r = run('check', self.topic(change))
        self.assertEqual(r.returncode, 1, r.stdout)
        return r.stdout

    def test_the_made_up_topic_passes(self):
        r = run('check', FIXTURE)
        self.assertEqual(r.returncode, 0, r.stdout)

    def test_a_wrong_choice_needs_its_temptation_and_its_why(self):
        def change(L):
            o = step(L, 'pick')['input']['options'][1]
            del o['tempting']
            del step(L, 'pick')['input']['options'][2]['why']
        out = self.errors(change)
        self.assertIn('needs "tempting"', out)
        self.assertIn('needs "why"', out)

    def test_no_all_of_the_above(self):
        out = self.errors(lambda L: step(L, 'pick')['input']['options'][2].update(text='All of the above'))
        self.assertIn('all of the above', out)

    def test_choices_of_very_different_lengths_are_a_tell(self):
        out = self.errors(lambda L: step(L, 'pick')['input']['options'][0].update(text='The right one, which is plainly much longer than the rest'))
        self.assertIn('lengths run from', out)

    def test_a_choice_needs_a_right_answer(self):
        out = self.errors(lambda L: step(L, 'pick')['input']['options'][0].pop('right'))
        self.assertIn('no right option', out)

    def test_a_play_step_needs_tries(self):
        out = self.errors(lambda L: step(L, 'brazil').pop('tries'))
        self.assertIn('needs "tries"', out)

    def test_a_try_is_run_against_the_goal(self):
        def change(L):
            step(L, 'brazil')['tries'][1]['marked'] = 'right'  # Peru is not Brazil
        out = self.errors(change)
        self.assertIn('should be marked right, but the goal marks it wrong', out)

    def test_a_play_step_must_be_possible_to_fail(self):
        out = self.errors(lambda L: step(L, 'brazil').update(tries=[step(L, 'brazil')['tries'][0]]))
        self.assertIn('none of its tries is wrong', out)

    def test_a_goal_that_cannot_fail_is_caught_by_its_tries(self):
        def change(L):
            step(L, 'brazil')['goal'] = {'read': 'selected', 'exists': True}  # any country passes
        out = self.errors(change)
        self.assertIn('should be marked wrong, but the goal marks it right', out)

    def test_settings_and_calls_must_be_in_the_description(self):
        def change(L):
            fig = step(L, 'read-globe')['figure']
            fig['settings']['spin'] = 'sideways'
            fig['settings']['zoom'] = 9
            fig['settings']['colourBy'] = 'heat'
            fig['calls'] = [['fly', 1], ['highlight', ['Atlantis']], ['band', 5]]
        out = self.errors(change)
        for words in ('"sideways" isn\'t one of free, auto, locked', '9 is outside 1 to 8','no setting "colourBy"', 'no call "fly"', '"Atlantis" isn\'t a country', 'band needs from, to'):
            self.assertIn(words, out)

    def test_inputs_settings_are_checked_too(self):
        def change(L):
            step(L, 'slide')['input']['ticks'] = 40
            step(L, 'order')['input']['items'].append({'id': 'one', 'text': 'Again'})
        out = self.errors(change)
        self.assertIn('40 is outside 0 to 10', out)
        self.assertIn('the same id twice', out)

    def test_answers_must_fit_their_form(self):
        def change(L):
            step(L, 'slide')['answer'] = 5000
            step(L, 'order')['answer'] = ['one', 'two']
            step(L, 'match')['answer'] = {'x': 'p', 'y': 'p'}
        out = self.errors(change)
        self.assertIn('off the scale', out)
        self.assertIn("every item's id", out)
        self.assertIn('pairs every left id', out)

    def test_a_rule_can_only_read_what_the_part_has(self):
        out = self.errors(lambda L: step(L, 'brazil').update(goal={'read': 'zoomLevel', 'is': 2}))
        self.assertIn("the part's state has only centre, selected, tapped, zoom", out)

    def test_a_lesson_can_use_the_map_flat_or_the_globe_with_any_map_setting(self):
        def change(L):
            fig = step(L, 'read-globe')['figure']
            fig['part'] = 'map'
            fig['settings'].update(projection='natural-earth', zoom=6, pinch=True)
            fig['calls'] = [['zoomTo', 'France'], ['zoomTo', 2.5, 0.5], ['zoomTo', [2.35, 48.85]], ['arc', [-0.1, 51.5], 'Japan', 'cyan'],
                            ['track', [[-25, 12], [-45, 15], 'Cuba'], 0.4, 'storm', 3], ['colourBy', {'Brazil': 59, 'Chad': 'pink'}, 'green', [0, 100]],
                            ['colourBy', [[-10, 10, 29], [10, 25, '#ffa23a']]], ['clear']]
            play = step(L, 'brazil')
            play['play']['settings'].update(projection='mercator')
            play['goal'] = {'all': [play['goal'], {'read': 'zoom', 'between': [1, 8]}]}
            for t in play['tries']:
                t['state']['zoom'] = 1
        r = run('check', self.topic(change))
        self.assertEqual(r.returncode, 0, r.stdout)

    def test_the_maps_new_calls_are_checked(self):
        def change(L):
            step(L, 'read-globe')['figure']['calls'] = [
                ['zoomTo', 'Atlantis'], ['zoomTo', 12], ['arc', [-0.1, 51.5]], ['arc', [0, 0], [500, 0]], ['track', [[0, 0]]], ['track', [[0, 0], 'Narnia'], 2, 'boat'],
                ['colourBy', {'Brazil': 1, 'Atlantis': 2, 'Chad': 'plaid'}], ['colourBy', [[10, 10, 1], [0, 20]]], ['colourBy', 'heat'], ['colourBy', {'Chad': 1}, 'red', [0]]]
        out = self.errors(change)
        for words in ('zoomTo(to): "Atlantis" isn\'t a country', 'zoomTo(to): 12 is outside 1 to 8', 'arc needs from, to', 'arc(to): is [longitude, latitude]',
                      'track(path): has 1; it needs at least 2', 'track(path)[1]: "Narnia" isn\'t a country', 'track(progress): 2 is outside 0 to 1',
                      'track(rider): "boat" isn\'t one of none, storm, ring, pin', '"Atlantis" isn\'t a country the map knows',
                      'colourBy(data)["Chad"]: "plaid" is neither a number nor a colour', 'colourBy(data)[0]: a band is [from, to, value]', 'colourBy(data)[1]: a band is',
                      'a table is { "Country": value', 'colourBy(ramp): "red" isn\'t one of heat, green, blue', 'colourBy(range): has 1; it needs at least 2'):
            self.assertIn(words, out)

    def test_sources(self):
        out = self.errors(lambda L: step(L, 'pick').update(src=['nowhere']))
        self.assertIn('cites "nowhere"', out)
        out = self.errors(lambda L: L.update(sources=[]))
        self.assertIn('no sources', out)

    def test_numbers_without_a_source_are_warned_about(self):
        r = run('check', self.topic(lambda L: step(L, 'pick').update(src=[], ask='Which of these is the made-up right answer in 1999?')))
        self.assertIn('has numbers but cites no source', r.stdout)

    def test_media_must_be_there(self):
        out = self.errors(lambda L: step(L, 'spot')['input'].update(figure='media/gone.png'))
        self.assertIn("media/gone.png isn't in the topic's folder", out)

    def test_a_topic_file_is_checked(self):
        dest = self.topic()
        t = json.loads((dest / 'topic.json').read_text(encoding='utf-8'))
        t.update(level='huge', colour='mauve')
        t['path'].append({'kind': 'lesson', 'id': 'missing'})
        (dest / 'topic.json').write_text(json.dumps(t), encoding='utf-8')
        out = run('check', dest).stdout
        for words in ('"level" is one of', '"colour" is one of', "missing.json isn't there"):
            self.assertIn(words, out)

    def path_errors(self, path, files=None):
        """check on a copy of the made-up topic with its path replaced (and files added: {name: lesson})."""
        dest = self.topic()
        t = json.loads((dest / 'topic.json').read_text(encoding='utf-8'))
        t['path'] = path
        (dest / 'topic.json').write_text(json.dumps(t), encoding='utf-8')
        for name, body in (files or {}).items():
            (dest / f'{name}.json').write_text(json.dumps(body), encoding='utf-8')
        return run('check', dest)

    def test_the_path_takes_every_kind_of_node(self):
        r = run('check', FIXTURE)
        self.assertEqual(r.returncode, 0, r.stdout)
        t = json.loads((FIXTURE / 'topic.json').read_text(encoding='utf-8'))
        self.assertEqual([n['kind'] for n in t['path']], ['lesson', 'chest', 'lesson', 'test', 'review', 'animation', 'exam'])

    def test_the_old_lessons_list_is_refused_with_the_new_form(self):
        dest = self.topic()
        t = json.loads((dest / 'topic.json').read_text(encoding='utf-8'))
        t['lessons'] = ['every-kind', 'second']
        del t['path']
        (dest / 'topic.json').write_text(json.dumps(t), encoding='utf-8')
        r = run('check', dest)
        self.assertEqual(r.returncode, 1)
        self.assertIn('"lessons" became "path"', r.stdout)

    def test_nodes_are_checked(self):
        r = self.path_errors([
            {'kind': 'chest', 'id': 'early-chest'},
            {'kind': 'review', 'id': 'look-back'},
            {'kind': 'test', 'id': 'quick-test'},
            {'kind': 'lesson', 'id': 'every-kind'},
            {'kind': 'lesson', 'id': 'every-kind'},
            {'kind': 'quiz', 'id': 'what'},
            {'kind': 'lesson', 'id': 'Bad Id'},
            {'kind': 'chest', 'id': 'two', 'colour': 'gold'},
            {'kind': 'lesson', 'id': 'second'},
        ])
        self.assertEqual(r.returncode, 1, r.stdout)
        for words in ('a chest is a reward for reaching it', 'a test draws on the lessons before it', 'a review goes over what came before it',
                      'the same id as an earlier node', '"kind" is one of lesson, test, exam, chest, review, animation',
                      'lower case words joined by hyphens', 'no field "colour" on a node', 'final.json is in the folder but not on the path'):
            self.assertIn(words, r.stdout)

    def test_a_test_asks_questions(self):
        explain_only = {'v': 1, 'title': 'No questions', 'steps': [{'id': 'read', 'kind': 'explain', 'title': 'Words', 'text': 'Words.', 'src': ['made-up']}],
                        'sources': [{'id': 'made-up', 'by': 'Nobody', 'title': 'Made-up', 'checked': 'never'}]}
        r = self.path_errors([{'kind': 'lesson', 'id': 'every-kind'}, {'kind': 'lesson', 'id': 'second'}, {'kind': 'test', 'id': 'no-questions'}], {'no-questions': explain_only})
        self.assertEqual(r.returncode, 1)
        self.assertIn('a test asks questions, and this one has none', r.stdout)
        self.assertIn('explain steps (read) belong in a lesson', r.stdout)

    def test_a_slider_must_not_start_on_its_answer(self):
        def change(L):
            step(L, 'slide')['input']['start'] = 100  # the answer
        out = self.errors(change)
        self.assertIn('already marked right: it gives the answer away', out)
        r = run('check', self.topic(lambda L: step(L, 'slide')['input'].update(start=130)))
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn('already marked close', r.stdout)
        # With no start, it starts in the middle of its scale: on this log scale, about 31.6, nowhere near 100.
        r = run('check', self.topic(lambda L: step(L, 'slide')['input'].pop('start', None)))
        self.assertNotIn('gives the answer away', r.stdout)
        out = self.errors(lambda L: step(L, 'slide').update(answer=32, within=5, close=10))
        self.assertIn('starts in the middle of its scale', out)

    def test_a_sliders_picture_is_one_the_part_has(self):
        out = self.errors(lambda L: step(L, 'slide')['input'].update(picture='thermometer', start='low'))
        self.assertIn('"thermometer" isn\'t one of none, warmth, depth', out)
        self.assertIn('.input.start: is a number', out)


class Rules(unittest.TestCase):
    """The checker's rules and the phone's must agree exactly."""

    CASES = [
        ({'read': 'v', 'is': 'a'}, {'v': 'a'}), ({'read': 'v', 'is': 'a'}, {'v': 'b'}),
        ({'read': 'v', 'in': [1, 2]}, {'v': 2}), ({'read': 'v', 'between': [5, 20]}, {'v': 20}),
        ({'read': 'v', 'between': [5, 20]}, {'v': 20.01}), ({'read': 't.lat', 'absBetween': [5, 20]}, {'t': {'lat': -12}}),
        ({'read': 't.lat', 'absBetween': [5, 20]}, {'t': {'lat': 1.5}}), ({'read': 'v', 'near': 26.5, 'within': 1}, {'v': 27.5}),
        ({'read': 'v', 'near': 26.5, 'within': 1}, {'v': 27.6}), ({'read': 'v', 'same': ['a', 'b']}, {'v': ['a', 'b']}),
        ({'read': 'v', 'same': ['a', 'b']}, {'v': ['b', 'a']}), ({'read': 'v', 'pairs': {'x': 'p'}}, {'v': {'x': 'p'}}),
        ({'read': 'v', 'pairs': {'x': 'p'}}, {'v': {'x': 'p', 'y': 'q'}}), ({'read': 'v', 'inCircle': {'x': 0.5, 'y': 0.5, 'r': 0.1}}, {'v': {'x': 0.55, 'y': 0.5}}),
        ({'read': 'v', 'exists': True}, {}), ({'read': 'v', 'exists': False}, {}), ({'read': 'v', 'is': 1}, {'v': None}),
        ({'all': [{'read': 'a', 'is': 1}, {'not': {'read': 'b', 'is': 2}}]}, {'a': 1, 'b': 3}),
        ({'any': [{'read': 'a', 'is': 9}, {'read': 'b', 'is': 2}]}, {'a': 1, 'b': 2}),
    ]

    def test_python_and_javascript_agree(self):
        sys.path.insert(0, str(PRIMER.parent))
        import primer  # noqa: E402
        py = [primer.rule_holds(r, s) for r, s in self.CASES]
        script = ("import { holds } from " + json.dumps((ROOT / 'js' / 'rules.js').as_uri()) + ";"
                  "const cases = JSON.parse(process.argv[1]); console.log(JSON.stringify(cases.map(([r, s]) => holds(r, s))));")
        js = json.loads(subprocess.run(['node', '--input-type=module', '-e', script, json.dumps(self.CASES)], capture_output=True, text=True, check=True).stdout)
        self.assertEqual(py, js)
        self.assertEqual(py[:2], [True, False])


class Fit(Work):
    def test_a_lesson_that_fits_and_one_that_does_not(self):
        def change(L):
            L['steps'] = L['steps'][:3]
            step(L, 'read-picture')['text'] = 'Far too many words for one screen. ' * 30
        dest = self.topic(change)
        r = run('fit', dest / 'every-kind.json', '--json', '--debug-port', os.environ.get('PRIMER_TEST_DEBUG', '9341'))
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        res = json.loads(r.stdout.strip().splitlines()[-1])['every-kind']['steps']
        by = {s['step']: s for s in res}
        self.assertEqual(by['read-globe']['verdict'], 'fits')
        self.assertEqual(by['read-picture']['verdict'], 'scrolls')
        self.assertGreater(by['read-picture']['small']['over'], 0)


class SendAndProgress(Work):
    def setUp(self):
        super().setUp()
        self.remote = self.tmp / 'remote.git'
        git(self.tmp, 'init', '-q', '--bare', '-b', 'main', str(self.remote))
        self.clone = self.tmp / 'primer-data'
        git(self.tmp, 'clone', '-q', str(self.remote), str(self.clone))
        for c in (self.clone,):
            git(c, 'config', 'user.name', 'Test')
            git(c, 'config', 'user.email', 'test@example.invalid')
        (self.clone / 'README.md').write_text('throwaway\n', encoding='utf-8')
        git(self.clone, 'add', '.')
        git(self.clone, 'commit', '-q', '-m', 'start')
        git(self.clone, 'push', '-q', 'origin', 'HEAD:main')

    def test_send_checks_copies_shrinks_commits_and_pushes(self):
        from PIL import Image
        def change(L):
            step(L, 'read-picture')['figure']['image'] = 'media/big.png'
        src = self.topic(change)
        Image.new('RGB', (2400, 1200), '#1b2a80').save(src / 'media' / 'big.png')
        (src / 'media' / 'unused.png').write_bytes(b'not sent')
        r = run('send', src, data=self.clone)
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn('Sent: Topic: Test topic (2 lessons, a test, an exam, a chest, a review and an animation)', r.stdout)
        dest = self.clone / 'topics' / 'test-topic'
        for name in ('every-kind.json', 'second.json', 'quick-test.json', 'final.json', 'media/target.svg'):
            self.assertTrue((dest / name).exists(), name)
        self.assertFalse((dest / 'media' / 'unused.png').exists())
        with Image.open(dest / 'media' / 'big.png') as im:
            self.assertEqual(max(im.size), 1600)
        index = json.loads((self.clone / 'index.json').read_text(encoding='utf-8'))
        self.assertEqual(index['topics'][0]['id'], 'test-topic')
        self.assertEqual(index['topics'][0]['lessons'], 2)
        log = git(self.remote, 'log', '--format=%s%n%b', 'main')
        self.assertIn('Topic: Test topic', log)
        self.assertIn('Co-Authored-By', log)
        again = run('send', src, data=self.clone)
        self.assertIn('Nothing changed', again.stdout)

    def test_send_refuses_a_topic_with_errors(self):
        src = self.topic(lambda L: step(L, 'brazil').pop('tries'))
        r = run('send', src, data=self.clone)
        self.assertEqual(r.returncode, 1)
        self.assertIn('Not sent', r.stdout)
        self.assertFalse((self.clone / 'topics').exists())

    def test_send_stops_on_this_computers_user_name(self):
        user = getpass.getuser()
        src = self.topic(lambda L: step(L, 'read-globe').update(text=f'Written by {user}.'))
        r = run('send', src, data=self.clone)
        self.assertEqual(r.returncode, 1)
        self.assertIn("name of this computer's user", r.stdout)
        self.assertEqual(git(self.remote, 'log', '--oneline', 'main').count('\n'), 1)

    def phone_sends(self, name, events):
        """Stands in for the phone: a progress file written straight to the remote, from another clone."""
        other = self.tmp / f'phone-{name}'
        if not other.exists():
            git(self.tmp, 'clone', '-q', str(self.remote), str(other))
            git(other, 'config', 'user.name', 'Phone')
            git(other, 'config', 'user.email', 'phone@example.invalid')
        git(other, 'pull', '-q')
        (other / 'progress').mkdir(exist_ok=True)
        (other / 'progress' / f'{name}.json').write_text(json.dumps({'v': 1, 'device': 'phone-test', 'sentAt': '2026-11-17T20:00:00.000Z', 'events': events}), encoding='utf-8')
        git(other, 'add', '.')
        git(other, 'commit', '-q', '-m', 'from the phone')
        git(other, 'push', '-q', 'origin', 'HEAD:main')

    def test_progress_reads_what_came_back(self):
        run('send', self.topic(), data=self.clone, check=True)
        base = {'v': 1, 'topic': 'test-topic', 'lesson': 'every-kind', 'version': 1}
        events = [
            {**base, 'eid': 'e1', 'at': '2026-11-17T20:00:01.000Z', 'type': 'start', 'step': 'read-globe'},
            {**base, 'eid': 'e2', 'at': '2026-11-17T20:00:02.000Z', 'type': 'attempt', 'step': 'pick', 'kind': 'check', 'form': 'choice', 'value': 'b', 'right': False, 'close': False, 'why': 'Wrong, for a made-up reason.'},
            {**base, 'eid': 'e3', 'at': '2026-11-17T20:00:03.000Z', 'type': 'attempt', 'step': 'brazil', 'kind': 'play', 'form': 'globe', 'value': {'selected': 'Peru', 'tapped': {'lon': -75, 'lat': -10, 'land': True, 'country': 'Peru'}}, 'right': False, 'close': False, 'why': 'That\'s another country.'},
            {**base, 'eid': 'e4', 'at': '2026-11-17T20:00:04.000Z', 'type': 'finish', 'right': 5, 'of': 7},
            {'v': 1, 'eid': 'e5', 'at': '2026-11-17T20:00:05.000Z', 'type': 'open', 'topic': 'test-topic', 'node': 'first-chest', 'kind': 'chest'},
        ]
        self.phone_sends('2026-11-17T20-00-05-000Z-aaaaaa', events)
        self.phone_sends('2026-11-17T20-00-06-000Z-bbbbbb', events[1:2])  # the same batch, sent twice
        self.phone_sends('connect-check-2026-11-17T19-00-00-000Z-cccccc', [])
        out = run('progress', data=self.clone, check=True).stdout
        self.assertIn('5 event(s)', out)  # the repeat is dropped
        self.assertIn('test-topic › first-chest (chest): opened 1 time(s)', out)
        self.assertIn('test-topic › Every kind of step (version 1)', out)
        self.assertIn('1 run(s) started, 1 finished; last finish 5 of 7 right', out)
        self.assertIn('pick (Pick one): wrong', out)
        self.assertIn('wrong: "b"  shown: "Wrong, for a made-up reason."', out)
        self.assertIn('tapped 10.0°S 75.0°W on Peru, selected Peru', out)
        marked = run('progress', '--mark-read', data=self.clone, check=True).stdout
        self.assertIn('Sent: Progress read', marked)
        read = json.loads((self.clone / 'read.json').read_text(encoding='utf-8'))
        self.assertTrue(read['at'] and len(read['files']) == 2)
        self.assertIn('Nothing new', run('progress', data=self.clone, check=True).stdout)
        self.assertIn('5 event(s)', run('progress', '--all', data=self.clone, check=True).stdout)


if __name__ == '__main__':
    unittest.main(verbosity=2)
