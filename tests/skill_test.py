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
FORMS = ROOT / 'tests' / 'fixtures' / 'data' / 'topics' / 'answer-forms'


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

    def topic(self, change=None, name='test-topic', source=FIXTURE, lesson='every-kind'):
        """A copy of a made-up topic, with one lesson changed by `change(lesson)`."""
        self.copies = getattr(self, 'copies', 0) + 1
        dest = self.tmp / f'copy{self.copies}' / name
        shutil.copytree(source, dest)
        if change:
            f = dest / f'{lesson}.json'
            lesson = json.loads(f.read_text(encoding='utf-8'))
            change(lesson)
            f.write_text(json.dumps(lesson, ensure_ascii=False, indent=1), encoding='utf-8')
        return dest


def step(lesson, sid):
    return next(s for s in lesson['steps'] if s['id'] == sid)


class Parts(unittest.TestCase):
    def test_lists_every_part_from_its_description(self):
        out = run('parts', check=True).stdout
        for word in ('map: Map',
                     'inputs: Inputs',
                     'spinTo(place: place',
                     'band(from: number',
                     'reveal(answer: answer)',
                     'spin (choice free, auto, locked',
                     'events: tapped',
                     'state: selected',
                     'start (number',
                     'borders (bool',
                     'style (choice day, warmth, muted, political',
                     'projection (choice globe, equal-earth, natural-earth, mercator',
                     'zoomTo(to: place-or-level',
                     'colourBy(data: table, ramp?: choice heat|green|blue',
                     'arc(from: place, to: place',
                     'track(path: list of place, progress?: number, rider?: choice none|storm|ring|pin',
                     'settled { centre, zoom }',
                     'zoom: How close',
                     'picture (choice none, warmth, depth, wind',
                     'form (choice choice, slider, dial, number, pile, order, string, sort, snap, match;',
                     'look (choice slider: auto, plain, thermometer, sea; number: auto, keys, wheels, tape, abacus',
                     'direction (choice auto, right, up, down',
                     'start (number -1000000 to 1000000; default null) (forms: slider, dial, pile, number)',
                     'thing (choice dot, storm, drop, leaf, star, coin',
                     'bins (list',
                     '(forms: string, snap, match)',
                     'per (number 2 to 10',
                     'thingImage (media'):
            self.assertIn(word, out)

    def test_spot_is_resting_so_the_catalogue_does_not_offer_it(self):
        out = run('parts', check=True).stdout
        inputs = out[out.index('inputs: Inputs'):]
        self.assertNotIn(', spot', inputs.split('\n  calls:')[0].split('form (choice')[1].split(';')[0])
        self.assertNotIn('figure (media', inputs)
        self.assertNotIn('aspect (number', inputs)
        self.assertNotIn('spot: {"read"', inputs)
        desc = json.loads(run('parts', '--json', check=True).stdout)['inputs']
        self.assertIn('spot', desc['settings']['form']['options'])   # its code stays for the redo
        self.assertEqual(desc['settings']['form']['hidden'], ['spot'])

    def test_every_form_has_settings_marking_and_an_example_with_a_wrong_try(self):
        desc = json.loads(run('parts', '--json', check=True).stdout)['inputs']
        for form in desc['settings']['form']['options']:
            self.assertIn(form, desc['marking'], form)
            ex = desc['example'][form]
            self.assertEqual(ex['settings']['form'], form)
            self.assertIn('wrong', [t['marked'] for t in ex['tries']], form)
            self.assertIn('right', [t['marked'] for t in ex['tries']], form)
        for form in ('dial', 'pile', 'string', 'sort', 'snap'):
            own = [k for k, s in desc['settings'].items() if form in (s.get('forms') or [])]
            self.assertTrue(own, form)
    def test_scenes_shots_and_sounds_are_listed(self):
        r = run('parts')
        for words in ('shot.cut(part: part, how?: choice cut|fade|push|back|zoom|through|out)', 'shot.split(', 'shot.inset(', 'shot.lens(part: part', 'sounds (an action\'s "sound"): whoosh:',
                      'section: Sea and sky', 'camera(place: place, zoom: number', 'label(name: name', 'flow(path: list of place',
                      'molecules: Up close', 'escape(level: number', 'winds(which: choice all|trades|westerlies|polar|none', 'turning(', 'cells(which: choice all|hadley|ferrel|polar|none',
                      'frame(x: number', 'sign(place: place', 'parcel(height?: number', 'sunAngle(degrees: number', 'shore (choice none, right, land'):
            self.assertIn(words, r.stdout)

    def test_the_globe_is_a_preset_of_the_map(self):
        out = run('parts', check=True).stdout
        self.assertIn('globe: Globe (a preset: the map part with projection "globe", pinch false by default)', out)

    def test_json(self):
        parts = json.loads(run('parts', '--json', check=True).stdout)
        self.assertEqual(sorted(parts), ['globe', 'inputs', 'map', 'molecules', 'section'])
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
        self.assertIn('"thermometer" isn\'t one of none, warmth, depth, wind', out)
        self.assertIn('.input.start: is a number', out)

    def test_match_still_checks_but_suggests_string(self):
        r = run('check', FIXTURE)
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn('match still plays, but String is the newer way to pair things', r.stdout)

    def test_spot_still_checks_but_is_not_offered(self):
        r = run('check', FIXTURE)
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("spot is being redone and isn't offered for new lessons: it still plays here, but use another form", r.stdout)


class Forms(Work):
    """The newer answer forms: dial, pile, string, sort and snap."""

    def forms(self, change):
        return self.topic(change, name='answer-forms', source=FORMS, lesson='every-form')

    def errors(self, change):
        r = run('check', self.forms(change))
        self.assertEqual(r.returncode, 1, r.stdout)
        return r.stdout

    def test_the_forms_topic_passes_with_nothing_to_say(self):
        r = run('check', FORMS)
        self.assertEqual(r.returncode, 0, r.stdout)
        # nothing but its voice: made-up test data has no clips, and "°C" and "km/h" would want their spoken words
        warnings = [x for x in r.stdout.splitlines() if x.strip().startswith('warning:')]
        self.assertTrue(all("isn't voiced yet" in x or 'give "say"' in x for x in warnings), r.stdout)

    def test_a_dial_is_checked_like_a_slider(self):
        out = self.errors(lambda L: step(L, 'dial-wind').update(answer=300))
        self.assertIn('the answer 300 is off the scale (0 to 250)', out)
        out = self.errors(lambda L: step(L, 'dial-wind')['input'].update(start=118))
        self.assertIn('the dial starts, which is already marked right: it gives the answer away', out)
        out = self.errors(lambda L: (step(L, 'dial-wind')['input'].pop('start'), step(L, 'dial-wind').update(answer=125)))
        self.assertIn('the dial starts in the middle of its scale, at 125', out)
        out = self.errors(lambda L: step(L, 'dial-warm')['input'].update(picture='palm'))
        self.assertIn('"palm" isn\'t one of none, warmth, depth, wind', out)

    def test_a_pile_holds_whole_counts_up_to_sixty(self):
        out = self.errors(lambda L: step(L, 'pile-count')['input'].update(max=80))
        self.assertIn('a pile holds whole counts from 0 to 60', out)
        out = self.errors(lambda L: step(L, 'pile-count').update(answer=7.5))
        self.assertIn("a pile's answer is a whole count", out)
        out = self.errors(lambda L: (step(L, 'pile-count')['input'].pop('start'), step(L, 'pile-count').update(answer=0, misses=[])))
        self.assertIn('the pile starts at its fewest, 0, which is already marked right', out)
        out = self.errors(lambda L: step(L, 'pile-count')['input'].update(thing='bear'))
        self.assertIn('"bear" isn\'t one of dot, storm, drop, leaf, star, coin', out)

    def test_pairs_are_checked(self):
        out = self.errors(lambda L: step(L, 'string-pairs').update(answer={'hot': 'sun', 'cold': 'sun', 'wet': 'drop'}))
        self.assertIn('the answer pairs every left id with a different right id', out)
        out = self.errors(lambda L: step(L, 'snap-pieces')['input']['right'].pop())
        self.assertIn('a snap has as many pieces ("right") as cards ("left")', out)

    def test_a_sort_puts_every_item_in_a_bin(self):
        out = self.errors(lambda L: step(L, 'sort-bins')['answer'].pop('pole'))
        self.assertIn('the answer puts every item in one of the bins', out)
        out = self.errors(lambda L: step(L, 'sort-bins')['answer'].update(pole='hot'))
        self.assertIn('the answer puts every item in one of the bins', out)
        r = run('check', self.forms(lambda L: step(L, 'sort-bins')['input']['bins'].append({'id': 'mild', 'text': 'Mild'})))
        self.assertIn('nothing belongs in mild: a bin that stays empty is a hint', r.stdout)

    def test_labels_may_have_a_picture_that_must_be_there(self):
        out = self.errors(lambda L: step(L, 'string-pairs')['input']['right'][0].update(image='media/gone.svg'))
        self.assertIn("media/gone.svg isn't in the topic's folder", out)
        out = self.errors(lambda L: step(L, 'sort-bins')['input']['items'][0].update(colour='red'))
        self.assertIn('no field "colour" here (it may have image)', out)

    def test_a_look_is_one_the_form_has(self):
        out = self.errors(lambda L: step(L, 'slide-wind')['input'].update(look='wheels'))
        self.assertIn('"wheels" isn\'t one the slider form has: auto, plain, thermometer, sea', out)
        out = self.errors(lambda L: step(L, 'number-wheels')['input'].update(look='sea'))
        self.assertIn('"sea" isn\'t one the number form has: auto, keys, wheels, tape, abacus', out)
        out = self.errors(lambda L: step(L, 'slide-down')['input'].update(direction='sideways'))
        self.assertIn('"sideways" isn\'t one of auto, right, up, down', out)
        r = run('check', self.forms(lambda L: step(L, 'slide-wind')['input'].update(look='thermometer', direction='up')))
        self.assertEqual(r.returncode, 0, r.stdout)
        # a dial has no look or direction of its own: said anyway, it's a warning
        self.assertIn("direction: isn't used by the dial form", run('check', self.forms(lambda L: step(L, 'dial-wind')['input'].update(direction='up'))).stdout)

    def test_a_number_that_holds_a_value_must_not_start_on_its_answer(self):
        out = self.errors(lambda L: step(L, 'number-wheels')['input'].update(start=119))
        self.assertIn('the number starts, which is already marked right: it gives the answer away', out)
        out = self.errors(lambda L: step(L, 'number-abacus').update(answer=0, tries=[]))
        self.assertIn('the number starts at 0, which is already marked right', out)
        out = self.errors(lambda L: step(L, 'number-tape')['input'].update(start=80))
        self.assertIn("the number's start, 80, is off the scale (0 to 40)", out)
        # keys start empty: a start is never used, and nothing is given away
        r = run('check', self.forms(lambda L: step(L, 'number-wheels')['input'].update(look='keys', start=119)))
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("a number's keys start empty, so \"start\" is never used", r.stdout)

    def test_tries_on_every_form_are_run(self):
        def change(L):
            step(L, 'sort-bins')['tries'][0]['marked'] = 'right'
            step(L, 'snap-pieces')['tries'][1]['marked'] = 'wrong'
            step(L, 'pile-count')['tries'][1]['marked'] = 'right'
        out = self.errors(change)
        self.assertIn('sort-bins).tries[0]: should be marked right, but the goal marks it wrong', out)
        self.assertIn('snap-pieces).tries[1]: should be marked wrong, but the goal marks it right', out)
        self.assertIn('pile-count).tries[1]: should be marked right, but the goal marks it close', out)


SCENES = ROOT / 'tests' / 'fixtures' / 'scenes' / 'topics' / 'scene-topic'


def line(scene, lid):
    return next(x for x in scene['lines'] if x['id'] == lid)


class SceneWork(Work):
    def scene_topic(self, change=None, lesson_change=None, voice=True):
        """A copy of the made-up scene topic, its animation changed by `change(scene)`, its lesson by
        `lesson_change(lesson)`, and without its voice when voice=False."""
        self.copies = getattr(self, 'copies', 0) + 1
        dest = self.tmp / f'copy{self.copies}' / 'scene-topic'
        shutil.copytree(SCENES, dest)
        if not voice:
            shutil.rmtree(dest / 'voice')
        for name, fn in (('engine.json', change), ('with-scene.json', lesson_change)):
            if fn:
                body = json.loads((dest / name).read_text(encoding='utf-8'))
                fn(body)
                (dest / name).write_text(json.dumps(body, ensure_ascii=False, indent=1), encoding='utf-8')
        return dest

    def errors(self, change=None, lesson_change=None):
        r = run('check', self.scene_topic(change, lesson_change))
        self.assertEqual(r.returncode, 1, r.stdout)
        return r.stdout


class SceneCheck(SceneWork):
    def test_the_made_up_scenes_pass_and_are_voiced(self):
        r = run('check', SCENES)
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertNotIn('voiced', r.stdout)

    def test_actions_name_real_calls_on_real_parts(self):
        def change(S):
            line(S, 'turn')['do'][0]['call'] = ['fly', 'Brazil']
            line(S, 'storm')['do'][0]['call'] = ['chart.mark', 26]
            line(S, 'storm')['do'][1]['call'] = ['highlight', ['Atlantis']]
        out = self.errors(change)
        self.assertIn('globe has no call "fly"', out)
        self.assertIn('no part "chart" in this scene', out)
        self.assertIn('"Atlantis" isn\'t a country', out)

    def test_every_at_word_is_in_its_line(self):
        out = self.errors(lambda S: line(S, 'turn')['do'][0].update(at='Argentina'))
        self.assertIn('"at": "Argentina" isn\'t in what\'s said', out)
        # case, stress marks and punctuation don't matter; a phrase and a second time do
        r = run('check', self.scene_topic(lambda S: line(S, 'turn')['do'][0].update(at='BRAZIL')))
        self.assertEqual(r.returncode, 0, r.stdout)
        r = run('check', self.scene_topic(lambda S: line(S, 'turn')['do'][1].update(at='then it lights')))
        self.assertEqual(r.returncode, 0, r.stdout)
        out = self.errors(lambda S: line(S, 'turn')['do'][1].update(at='the#3'))
        self.assertIn('"the#3"', out)

    def test_with_say_the_words_are_the_ones_said(self):
        def change(L):
            L['steps'][1]['lines'][1]['do'][0]['at'] = 'far far'  # in "say", not in the caption: fine
        self.assertEqual(run('check', self.scene_topic(lesson_change=change)).returncode, 0)
        def wrong(L):
            L['steps'][1]['lines'][1]['say'] = 'And here is the land of the Incas.'
        out = self.errors(lesson_change=wrong)
        self.assertIn('"at": "Peru" isn\'t in what\'s said', out)

    def test_a_stretch_drives_p_and_only_a_stretch(self):
        out = self.errors(lambda S: line(S, 'turn')['do'].append({'from': 'globe', 'to': 'Brazil', 'call': ['spinTo', 'Brazil', 1]}))
        self.assertIn('drives a call with "$p"', out)
        out = self.errors(lambda S: line(S, 'turn')['do'].append({'at': 'globe', 'call': ['spinTo', 'Brazil', '$p']}))
        self.assertIn('only makes sense in an action that runs "from"', out)
        out = self.errors(lambda S: line(S, 'turn')['do'].append({'from': 'globe', 'to': 'Brazil', 'call': ['spinTo', '$p']}))
        self.assertIn('"$p" is a number from 0 to 1, but spinTo\'s place is place', out)
        r = run('check', self.scene_topic(lambda S: line(S, 'turn')['do'].append({'from': 'globe', 'to': '$end', 'call': ['spinTo', 'Brazil', '$p']})))
        self.assertEqual(r.returncode, 0, r.stdout)

    def test_shots_cut_between_the_scenes_parts(self):
        """Shots (shot.cut, shot.split, shot.inset) choose between a scene's parts; the checker knows them."""
        def two(S):
            S['parts']['section'] = {'part': 'section', 'settings': {'view': 'wide', 'warm': 0.5}}
            for x in S['lines']:
                for a in x.get('do') or []:
                    a['call'][0] = 'globe.' + a['call'][0]
            line(S, 'storm')['do'].append({'at': 'sea', 'call': ['shot.cut', 'section', 'zoom']})
            line(S, 'track')['do'].append({'at': 'Then', 'call': ['shot.split', 'globe', 'section']})
            line(S, 'end')['do'].append({'at': 'And', 'call': ['shot.inset', 'globe', 'top-left'], 'sound': 'chime'})
            line(S, 'end')['do'].append({'at': 'scene', 'call': ['shot.inset', 'none']})
            line(S, 'end')['do'].append({'at': 'end', 'call': ['section.cloud', 0.8, 2]})
            S['shot'] = ['split', 'globe', 'section']
        r = run('check', self.scene_topic(two))
        self.assertEqual(r.returncode, 0, r.stdout)
        def bad(S):
            two(S)
            line(S, 'storm')['do'][-1]['call'] = ['shot.cut', 'chart']
            line(S, 'track')['do'][-1]['call'] = ['shot.split', 'globe', 'globe']
            line(S, 'end')['do'][0]['call'] = ['shot.wipe', 'globe']
            line(S, 'end')['do'][-1]['call'] = ['shot.cut', 'section', 'spin']
            S['shot'] = 'globe'
        out = self.errors(bad)
        self.assertIn('cut: "chart" isn\'t a part of this scene (globe, section)', out)
        self.assertIn('a split shows two different parts', out)
        self.assertIn('no shot "wipe"', out)
        self.assertIn('"spin" isn\'t one of cut, fade, push, back, zoom', out)
        self.assertIn('the opening shot is a shot call without "shot."', out)
        # one part: nothing to cut between
        out = self.errors(lambda S: line(S, 'turn')['do'].append({'at': 'globe', 'call': ['shot.cut', 'globe']}))
        self.assertIn('a shot chooses between parts: this scene has only one', out)

    def test_sounds_eases_and_ranges(self):
        def good(S):
            line(S, 'turn')['do'][0]['sound'] = 'whoosh'
            line(S, 'storm')['do'].append({'at': 'appears', 'sound': 'swell'})
            line(S, 'track')['do'][0].update(ease='linear', range=[0.2, 0.9])
        r = run('check', self.scene_topic(good))
        self.assertEqual(r.returncode, 0, r.stdout)
        def bad(S):
            line(S, 'turn')['do'][0]['sound'] = 'bleep'
            line(S, 'storm')['do'].append({'from': 'A', 'to': 'storm', 'sound': 'swell'})
            line(S, 'storm')['do'][0]['ease'] = 'soft'
            line(S, 'track')['do'][0].update(ease='bouncy', range=[0.2, 1.4])
        out = self.errors(bad)
        self.assertIn('"sound": "bleep" isn\'t a sound the kit has (whoosh, cut, swell', out)
        self.assertIn('a sound on its own happens "at" a word', out)
        self.assertIn('"ease" shapes a stretch', out)
        self.assertIn('"ease" is one of soft, linear, in, out, camera, transition, furniture, process, accumulate', out)
        self.assertIn('"range" is [from, to], each 0 to 1', out)

    def test_named_oceans_and_continents_are_labelled_while_they_matter(self):
        said = 'The storm leaves *Africa* over the Atlantic.'
        r = run('check', self.scene_topic(lambda S: line(S, 'storm').update(text=said, do=[])))
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn('names Atlantic Ocean: write it on the map while it matters (globe.label "Atlantic Ocean")', r.stdout)
        self.assertIn('names Africa', r.stdout)
        def labelled(S):
            line(S, 'storm').update(text=said)
            line(S, 'storm')['do'] = [{'at': 'Africa', 'call': ['label', 'Africa']}, {'at': 'Atlantic', 'call': ['label', 'Atlantic Ocean']}]
        r = run('check', self.scene_topic(labelled))
        self.assertNotIn('names Atlantic', r.stdout)
        self.assertNotIn('names Africa', r.stdout)
        # a name the map doesn't know is an error; a named place works wherever a place does
        out = self.errors(lambda S: line(S, 'storm')['do'].append({'at': 'sea', 'call': ['label', 'Atlantis']}))
        self.assertIn('or an ocean, sea or continent it names', out)
        self.assertIn('"Atlantis" isn\'t a country the map knows', out)
        r = run('check', self.scene_topic(lambda S: line(S, 'turn')['do'][0].update(call=['spinTo', 'Caribbean Sea', 0.6])))
        self.assertEqual(r.returncode, 0, r.stdout)

    def test_an_animation_can_run_longer_than_a_scene_step(self):
        """An animation on the path can have up to 60 lines before the checker suggests splitting it; a scene step
        in a lesson stays at 30 (round three: animations explain thoroughly, and can run four minutes)."""
        def longer(n):
            def change(S):
                base = S['lines'][0]
                S['lines'] = S['lines'] + [{'id': f'more-{i}', 'text': 'And then the storm turns.', 'do': []} for i in range(n - len(S['lines']))]
            return change
        r = run('check', self.scene_topic(longer(44)))
        self.assertNotIn('lines: a scene is usually', r.stdout)
        r = run('check', self.scene_topic(longer(64)))
        self.assertIn('64 lines: a scene is usually 2 to 60', r.stdout)
        r = run('check', self.scene_topic(lesson_change=lambda L: L['steps'][1].update(lines=L['steps'][1]['lines'] + [{'id': f'more-{i}', 'text': 'And then.'} for i in range(32)])))
        self.assertIn('lines: a scene is usually 2 to 30', r.stdout)

    def test_a_lens_and_the_zoom_cuts_and_the_motion_families(self):
        def good(S):
            for x in S['lines']:
                for a in x.get('do') or []:
                    if 'call' in a and '.' not in a['call'][0]:
                        a['call'][0] = 'globe.' + a['call'][0]
            S['parts']['section'] = {'part': 'section', 'settings': {'view': 'surface'}}
            S['parts']['close'] = {'part': 'molecules', 'settings': {'below': 'water'}}
            line(S, 'storm')['do'].append({'at': 'storm', 'call': ['shot.lens', 'close', 0.5, 0.7]})
            line(S, 'storm')['do'].append({'at': 'appears', 'call': ['shot.cut', 'close', 'through']})
            line(S, 'end')['do'].append({'at': 'end', 'call': ['shot.cut', 'section', 'out']})
            line(S, 'end')['do'].append({'at': 'end', 'call': ['shot.lens', 'none']})
            line(S, 'track')['do'][0].update(ease='camera')
        r = run('check', self.scene_topic(good))
        self.assertEqual(r.returncode, 0, r.stdout)
        out = self.errors(lambda S: (good(S), line(S, 'end')['do'].append({'at': 'end', 'call': ['shot.lens', 'chart']})))
        self.assertIn('lens: "chart" isn\'t a part of this scene', out)

    def test_waits_are_refused(self):
        """An animation plays through like a video: a line can't wait for an answer any more."""
        wait = {'goal': {'read': 'tapped.land', 'is': False}, 'right': 'Yes.', 'why': 'No.',
                'tries': [{'state': {'tapped': {'lon': 0, 'lat': 0, 'land': False, 'country': None}}, 'marked': 'right'}]}
        out = self.errors(lambda S: line(S, 'storm').update(wait=wait))
        self.assertIn('no "wait": a scene plays through like a video', out)
        out = self.errors(lesson_change=lambda L: L['steps'][1]['lines'][0].update(wait=wait))
        self.assertIn('no "wait"', out)

    def test_ids_and_fields(self):
        def change(S):
            S['lines'][1]['id'] = 'turn'
            S['lines'][2]['colour'] = 'gold'
            S['lines'][3]['do'][0]['when'] = 2
        out = self.errors(change)
        for words in ('the same id as an earlier line', 'no field "colour" on a line', 'no field "when" on an action'):
            self.assertIn(words, out)

    def test_symbols_want_say(self):
        r = run('check', self.scene_topic(lambda S: line(S, 'storm').update(text='A storm appears over sea at 27 °C.', do=[])))
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn('give "say"', r.stdout)

    def test_lines_changed_since_voicing_are_warned_about(self):
        r = run('check', self.scene_topic(lambda S: line(S, 'storm').update(text='A storm appears over the warm sea.')))
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn('lines changed since they were voiced (storm)', r.stdout)
        # a stress mark is not a change of words
        r = run('check', self.scene_topic(lambda S: line(S, 'storm').update(text='A *storm* appears over the open sea.')))
        self.assertNotIn('changed since', r.stdout)
        r = run('check', self.scene_topic(voice=False))
        self.assertIn("isn't voiced yet (turn, storm, track, end)", r.stdout)

    def test_lesson_words_not_voiced_or_changed_since_are_warned_about(self):
        r = run('check', self.scene_topic(lesson_change=lambda L: L['steps'][2].update(ask='Which of the two was lit up first?')))
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn('with-scene.json: lines changed since they were voiced (after.ask): run primer voice. Until then they show silently, as text', r.stdout)
        r = run('check', self.scene_topic(voice=False))
        self.assertIn("with-scene.json: isn't voiced yet (before.text, after.ask, after.right, after.option-peru)", r.stdout)

    def test_a_steps_say_speaks_for_its_own_words(self):
        r = run('check', self.scene_topic(lesson_change=lambda L: L['steps'][2]['input']['options'][1].update(say='Peru came second.')))
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn('lines changed since they were voiced (after.option-peru)', r.stdout)  # what's said changed
        out = self.errors(lesson_change=lambda L: L['steps'][2].update(say={'ask': 'Which first?', 'text': 'Nothing here.'}))
        self.assertIn('"say" speaks for ask, right, why; not "text"', out)
        out = self.errors(lesson_change=lambda L: (L['steps'][2].pop('right'), L['steps'][2].update(say={'right': 'Yes.'})))
        self.assertIn('"say.right" speaks for "right", which this step hasn\'t got', out)
        r = run('check', self.scene_topic(lesson_change=lambda L: L['steps'][2].update(right='Yes: at 10 °C.')))
        self.assertIn('after.right: has °: give "say"', r.stdout)

    def test_python_and_javascript_read_the_same_lines_aloud(self):
        """The ids a lesson's words are voiced by (spoken_lines) and the ids the phone reads them by (spokenLines)."""
        sys.path.insert(0, str(PRIMER.parent))
        import primer  # noqa: E402
        lessons = [json.loads(f.read_text(encoding='utf-8')) for f in sorted((ROOT / 'tests' / 'fixtures').glob('*/topics/*/*.json'))
                   if f.name != 'topic.json' and 'steps' in json.loads(f.read_text(encoding='utf-8'))]
        lessons.append({'steps': [{'id': 'x', 'kind': 'check', 'ask': 'A?', 'say': {'ask': 'Ay?', 'why': 'Because.'}, 'why': 'B.', 'right': 'C.',
                                   'misses': [{'when': {}, 'why': 'D.', 'say': 'Dee.'}], 'input': {'form': 'slider'}},
                                  {'id': 'y', 'kind': 'explain', 'text': 'E.', 'say': 'Ee.'}]})
        py = [[(x['id'], primer.said_of(x)) for x in primer.spoken_lines(L)] for L in lessons]
        script = ("import { spokenLines } from " + json.dumps((ROOT / 'js' / 'narration.js').as_uri()) + ";"
                  "import { saidOf } from " + json.dumps((ROOT / 'js' / 'readalong.js').as_uri()) + ";"
                  "import { readFileSync } from 'node:fs';"
                  "console.log(JSON.stringify(JSON.parse(readFileSync(0, 'utf8')).map(L => spokenLines(L).map(x => [x.id, saidOf(x)]))));")
        js = subprocess.run(['node', '--input-type=module', '-e', script], input=json.dumps(lessons), capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(js.returncode, 0, js.stderr)
        self.assertEqual([[list(x) for x in L] for L in py], json.loads(js.stdout))
        self.assertEqual(py[-1], [('x.ask', 'Ay?'), ('x.right', 'C.'), ('x.why', 'Because.'), ('x.miss-1', 'Dee.'), ('y.text', 'Ee.')])
        self.assertGreater(sum(len(L) for L in py), 20)

    def test_a_scene_step_in_a_lesson_is_checked_too(self):
        out = self.errors(lesson_change=lambda L: L['steps'][1]['lines'][0]['do'][0].update(call=['globe.highlight', ['France'], 'mauve']))
        self.assertIn('"mauve" isn\'t a colour', out)

    def test_with_two_parts_a_call_names_its_part(self):
        out = self.errors(lesson_change=lambda L: L['steps'][1]['lines'][0]['do'][0].update(call=['highlight', ['France']]))
        self.assertIn('this scene has 2 parts: name the one, like "globe.highlight"', out)
        out = self.errors(lesson_change=lambda L: L['steps'][1]['lines'][1]['do'][1].update(call=['warmth.spinTo', 'Peru']))
        self.assertIn('inputs has no call "spinTo"', out)

    def test_the_topics_narrator(self):
        dest = self.scene_topic()
        t = json.loads((dest / 'topic.json').read_text(encoding='utf-8'))
        t['narrator'] = 'someone'
        (dest / 'topic.json').write_text(json.dumps(t), encoding='utf-8')
        r = run('check', dest)
        self.assertEqual(r.returncode, 1)
        self.assertIn('"narrator" is one of heart, george, bella, chatterbox-a', r.stdout)

    def test_python_and_javascript_find_the_same_words(self):
        sys.path.insert(0, str(PRIMER.parent))
        import primer  # noqa: E402
        cases = [('First the globe turns to *Brazil*, and then it lights up.', 'Brazil'), ('A b a b a.', 'a#3'), ('A b a b a.', 'b a#2'),
                 ('Its colour, “warm”.', 'warm'), ('It’s here', "it's"), ('Go - now', 'now'), ('x', '$end'), ('x y', 'z')]
        py = [primer.find_words(s, a) for s, a in cases]
        script = ("import { findWords } from " + json.dumps((ROOT / 'js' / 'scene.js').as_uri()) + ";"
                  "const cases = JSON.parse(process.argv[1]); console.log(JSON.stringify(cases.map(([s, a]) => findWords(s, a))));")
        # scene.js imports the app's other modules, which need a browser only when used: stub what's touched on import
        js = subprocess.run(['node', '--input-type=module', '-e', script, json.dumps(cases)], capture_output=True, text=True)
        self.assertEqual(js.returncode, 0, js.stderr)
        self.assertEqual(py, json.loads(js.stdout))
        self.assertEqual(py[:3], [5, 4, 3])


class Voice(SceneWork):
    """`primer voice`, with the engines stood in for (PRIMER_VOICE_FAKE=1): every model call is faked, and
    everything around them (jobs, takes, encoding with ffmpeg, timing files, keeping what's unchanged) is real."""

    def voice(self, dest, *extra):
        env = {**os.environ, 'PRIMER_APP': str(ROOT), 'PRIMER_VOICE_FAKE': '1'}
        r = subprocess.run([sys.executable, str(PRIMER), 'voice', str(dest), '--python', sys.executable, *extra],
                           capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        return r.stdout

    def timing(self, dest, key='engine'):
        return json.loads((dest / 'voice' / f'{key}.json').read_text(encoding='utf-8'))

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'needs ffmpeg')
    def test_voice_makes_checks_times_and_redoes_only_what_changed(self):
        dest = self.scene_topic(voice=False)
        out = self.voice(dest, '--narrators', 'bella,george')
        self.assertIn('20 clip(s) to make, 0 kept', out)
        t = self.timing(dest)
        entry = t['lines']['turn']['bella']
        self.assertEqual(len(entry['words']), 11)
        self.assertEqual(entry['said'], line(json.loads((dest / 'engine.json').read_text(encoding='utf-8')), 'turn')['text'])
        self.assertTrue((dest / entry['clip']).exists() and entry['clip'].startswith('voice/engine/turn.bella.'))
        self.assertTrue(all(w[1] <= w[2] for w in entry['words']) and entry['words'][-1][2] <= entry['seconds'] + 0.01)
        self.assertEqual(run('check', dest).returncode, 0)
        self.assertNotIn('voiced', run('check', dest).stdout)
        # again: nothing to make
        self.assertIn('0 clip(s) to make, 20 kept', self.voice(dest, '--narrators', 'bella,george'))
        # one line's words change: only its clips, in each narrator, are made again; the old ones go
        old = entry['clip']
        body = json.loads((dest / 'engine.json').read_text(encoding='utf-8'))
        line(body, 'turn')['text'] = 'First the globe turns to *Brazil*, and then it lights it up.'
        line(body, 'turn')['do'][1]['at'] = 'lights it'
        line(body, 'storm')['text'] = 'A *storm* appears over the open sea.'  # a stress mark only: the same clip
        (dest / 'engine.json').write_text(json.dumps(body), encoding='utf-8')
        out = self.voice(dest, '--narrators', 'bella,george')
        self.assertIn('2 clip(s) to make, 18 kept', out)
        self.assertFalse((dest / old).exists())
        t2 = self.timing(dest)
        self.assertEqual(len(t2['lines']['turn']['bella']['words']), 12)
        self.assertEqual(t2['lines']['storm']['bella']['clip'], t['lines']['storm']['bella']['clip'])
        self.assertEqual(t2['lines']['storm']['bella']['said'], 'A *storm* appears over the open sea.')
        # a narrator not asked for this time keeps its clips
        self.assertIn('0 clip(s) to make', self.voice(dest, '--narrators', 'topic'))
        self.assertIn('george', self.timing(dest)['lines']['turn'])

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'needs ffmpeg')
    def test_each_narrator_gets_a_sample_in_the_data_repo_made_once(self):
        # a topic inside a data repo: voicing it makes the four narrators' samples there too, once
        data = self.tmp / 'datarepo'
        (data / 'topics').mkdir(parents=True)
        (data / 'index.json').write_text('{"v": 1, "topics": []}', encoding='utf-8')
        dest = data / 'topics' / 'scene-topic'
        shutil.copytree(self.scene_topic(voice=False), dest)
        out = self.voice(dest, '--narrators', 'topic')
        self.assertIn('Narrator samples: 4 to make.', out)
        listed = json.loads((data / 'narrators' / 'samples.json').read_text(encoding='utf-8'))['samples']
        NAMES = {'heart': 'Heart', 'george': 'George', 'bella': 'Bella', 'chatterbox-a': 'Chatterbox A'}
        self.assertEqual(list(listed), ['heart', 'george', 'bella', 'chatterbox-a'])
        for n, e in listed.items():
            self.assertEqual(e['said'], f"Hello, I'm {NAMES[n]}. I'll read your lessons to you.")
            self.assertTrue(e['clip'].startswith(f'narrators/{n}.') and (data / e['clip']).is_file() and e['check'] == 'ok' and e['seconds'] > 0, e)
        self.assertEqual(sorted(p.name for p in (data / 'narrators').iterdir()), sorted([*(pathlib.Path(e['clip']).name for e in listed.values()), 'samples.json']))
        # voiced again, nothing new: the samples are kept as they were
        self.assertIn('Narrator samples: all four made already.', self.voice(dest, '--narrators', 'topic'))
        # a topic outside any data repo says how to make them, and makes none
        loose = self.scene_topic(voice=False)
        self.assertIn('run primer samples', self.voice(loose, '--narrators', 'topic'))
        self.assertFalse((loose.parent / 'narrators').exists())
        # primer samples makes them in the clone it's given
        other = self.tmp / 'otherdata'
        other.mkdir()
        env = {**os.environ, 'PRIMER_APP': str(ROOT), 'PRIMER_VOICE_FAKE': '1'}
        r = subprocess.run([sys.executable, str(PRIMER), 'samples', '--data', str(other), '--python', sys.executable], capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(len(json.loads((other / 'narrators' / 'samples.json').read_text(encoding='utf-8'))['samples']), 4)

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'needs ffmpeg')
    def test_a_take_heard_wrong_is_made_again(self):
        dest = self.scene_topic(lambda S: line(S, 'storm').update(text='A storm appears over the mumble sea.', do=[]), voice=False)
        out = self.voice(dest, '--narrators', 'topic')
        self.assertIn('1 clip(s) heard wrong; another take', out)
        self.assertIn('1 needed another take, 0 still heard wrong', out)
        entry = self.timing(dest)['lines']['storm']['bella']
        self.assertEqual((entry['check'], entry['takes']), ('ok', 2))

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'needs ffmpeg')
    def test_a_line_or_scene_taken_out_takes_its_clips_with_it(self):
        dest = self.scene_topic(voice=False)
        self.voice(dest, '--narrators', 'topic')
        body = json.loads((dest / 'engine.json').read_text(encoding='utf-8'))
        body['lines'] = [x for x in body['lines'] if x['id'] != 'storm']
        (dest / 'engine.json').write_text(json.dumps(body), encoding='utf-8')
        lesson = json.loads((dest / 'with-scene.json').read_text(encoding='utf-8'))
        lesson['steps'] = [s for s in lesson['steps'] if s['kind'] != 'scene']
        (dest / 'with-scene.json').write_text(json.dumps(lesson), encoding='utf-8')
        self.voice(dest, '--narrators', 'topic')
        self.assertNotIn('storm', self.timing(dest)['lines'])
        self.assertFalse(list((dest / 'voice').glob('engine/storm.*')))
        self.assertFalse((dest / 'voice' / 'with-scene.tour.json').exists() or (dest / 'voice' / 'with-scene.tour').exists())

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'needs ffmpeg')
    def test_a_lessons_words_are_voiced_too_and_only_what_changed_is_made_again(self):
        dest = self.scene_topic(voice=False)
        self.voice(dest, '--narrators', 'topic')
        t = self.timing(dest, 'with-scene')
        self.assertEqual(list(t['lines']), ['before.text', 'after.ask', 'after.right', 'after.option-peru'])
        entry = t['lines']['before.text']['bella']
        lesson = json.loads((dest / 'with-scene.json').read_text(encoding='utf-8'))
        self.assertEqual(entry['said'], lesson['steps'][0]['say'])      # its spoken wording, "27 °C" as words
        self.assertEqual(len(entry['words']), len(lesson['steps'][0]['say'].split()))
        self.assertTrue(entry['clip'].startswith('voice/with-scene/before.text.bella.') and (dest / entry['clip']).exists())
        self.assertNotIn('voiced', run('check', dest).stdout)
        # one line of feedback changes: only its clip is made again, and the old one goes
        old = t['lines']['after.right']['bella']['clip']
        lesson['steps'][2]['right'] = 'Yes: France was lit up first.'
        (dest / 'with-scene.json').write_text(json.dumps(lesson), encoding='utf-8')
        self.assertIn('1 clip(s) to make, 9 kept', self.voice(dest, '--narrators', 'topic'))
        self.assertFalse((dest / old).exists())
        self.assertEqual(self.timing(dest, 'with-scene')['lines']['after.ask']['bella']['clip'], t['lines']['after.ask']['bella']['clip'])

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'needs ffmpeg')
    def test_a_clip_still_heard_wrong_can_be_tried_again(self):
        dest = self.scene_topic(voice=False)
        self.voice(dest, '--narrators', 'topic')
        t = self.timing(dest, 'with-scene')
        t['lines']['after.ask']['bella'].update(check='flag', takes=4)   # as if every take had come out wrong
        (dest / 'voice' / 'with-scene.json').write_text(json.dumps(t), encoding='utf-8')
        self.assertIn('0 clip(s) to make', self.voice(dest, '--narrators', 'topic'))
        self.assertIn('1 clip(s) to make, 9 kept', self.voice(dest, '--narrators', 'topic', '--retry'))
        entry = self.timing(dest, 'with-scene')['lines']['after.ask']['bella']
        self.assertEqual((entry['check'], entry['takes']), ('ok', 5))

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'needs ffmpeg')
    def test_the_same_words_twice_are_made_once(self):
        dest = self.scene_topic(lesson_change=lambda L: L['steps'][2].update(why=L['steps'][2]['input']['options'][1]['why']), voice=False)
        out = self.voice(dest, '--narrators', 'topic')
        self.assertIn('10 clip(s) to make', out)   # 11 lines, two of them the same words
        lines = self.timing(dest, 'with-scene')['lines']
        a, b = lines['after.why']['bella'], lines['after.option-peru']['bella']
        self.assertEqual(a['key'], b['key'])
        self.assertNotEqual(a['clip'], b['clip'])
        self.assertTrue((dest / a['clip']).exists() and (dest / b['clip']).exists())

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'needs ffmpeg')
    def test_clips_are_made_loud_with_their_peaks_held_down(self):
        """About -13 LUFS integrated, true peaks under -1 dB, AAC at 96 kbps."""
        sys.path.insert(0, str(PRIMER.parent))
        import primer  # noqa: E402
        self.assertEqual((primer.ENCODE['lufs'], primer.ENCODE['peak'], primer.ENCODE['bitrate']), (-13.0, -1.0, '96k'))
        dest = self.scene_topic(voice=False)
        self.voice(dest, '--narrators', 'topic')
        for clip in sorted((dest / 'voice').rglob('*.m4a'))[:4]:
            lufs, peak = primer.loudness('ffmpeg', clip)
            self.assertLess(abs(lufs - -13.0), 0.5, clip.name)
            self.assertLessEqual(peak, -1.0, clip.name)
        # a loud master, peaking well over full scale, comes out at the same level with its peaks held down
        wav = self.tmp / 'loud.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=2.5', '-af',
                        'volume=24dB,apulsator=hz=3:amount=0.6', '-ar', '24000', '-c:a', 'pcm_f32le', str(wav)], check=True)
        res = primer.encode_clip(wav, self.tmp / 'loud.m4a')
        self.assertLess(abs(res['lufs'] - -13.0), 0.35)
        self.assertLessEqual(res['peak'], -1.0)

    def test_voice_says_where_the_engines_are_wanted(self):
        r = subprocess.run([sys.executable, str(PRIMER), 'voice', str(self.scene_topic()), '--tts', str(self.tmp / 'nowhere')],
                           capture_output=True, text=True, env={**os.environ, 'PRIMER_APP': str(ROOT), 'PRIMER_TTS': ''})
        self.assertEqual(r.returncode, 1)
        self.assertIn('Can\'t find the voice environments', r.stdout)

    def test_words_that_sound_the_same_are_heard_as_said_but_a_bad_take_is_not(self):
        """A recogniser can't tell "sea" from "C" or "they're" from "there": no retake for those. A repeat or
        a dropped word is still a bad take."""
        sys.path.insert(0, str(PRIMER.parent / 'voice'))
        import textnorm  # noqa: E402
        same = [("That's land: tap the sea.", "That's land, tap the C."),
                ("In the northwest Pacific they're *typhoons*.", 'In the northwest, Pacific there typhoons.'),
                ("They're five.", 'There are five.'), ('There are five.', "They're five.")]
        for want, heard in same:
            self.assertEqual(textnorm.verdict(textnorm.diff(want, heard)), 'ok', (want, heard))
        for want, heard in [('Yes: the South Pacific.', 'Yes, the South Pacific. Yes, the South Pacific.'),
                            ('They drift *west*, out over the Pacific.', 'A drift west, out over the Pacific,'),
                            ('*Hurricane* is the name in the North Atlantic.', 'Hurricane is the name in the North Atlantic. Offered.')]:
            self.assertEqual(textnorm.verdict(textnorm.diff(want, heard)), 'flag', (want, heard))


FACTS = ROOT / 'tests' / 'fixtures' / 'facts' / 'topics' / 'storms'
CAPITALS = ROOT / 'tests' / 'fixtures' / 'facts' / 'topics' / 'capitals'


def fact(lesson, fid):
    return next(f for f in lesson['facts'] if f['id'] == fid)


def ask(lesson, fid, aid):
    return next(a for a in fact(lesson, fid)['asks'] if a['id'] == aid)


class FactCheck(Work):
    """Facts: each sourced, with two or more ways of asking it, each a step that can be got wrong and doesn't
    give itself away; steps naming facts the topic declares; families expanded and checked like any fact."""

    def errors(self, change, lesson='fuel', file=None):
        dest = self.topic(change, name='storms', source=FACTS, lesson=lesson)
        r = run('check', dest)
        self.assertEqual(r.returncode, 1, r.stdout)
        return r.stdout

    def test_the_made_up_fact_topics_pass(self):
        r = run('check', FACTS, CAPITALS)
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn('family seas: every ask shape is a choice', r.stdout)  # said once for the family, not per row

    def test_a_fact_needs_two_asks_and_a_source(self):
        out = self.errors(lambda L: (fact(L, 'warm')['asks'].pop(), fact(L, 'land').pop('src')))
        self.assertIn('fact warm: a fact needs two or more ways of asking it ("asks")', out)
        self.assertIn('fact land: a fact says where it comes from', out)

    def test_an_ask_is_a_check_or_play_step_and_needs_a_wrong_try(self):
        def change(L):
            ask(L, 'land', 'sort')['tries'] = [t for t in ask(L, 'land', 'sort')['tries'] if t['marked'] == 'right']
            ask(L, 'count', 'pile').pop('tries')
            ask(L, 'warm', 'pick')['kind'] = 'explain'
        out = self.errors(change)
        self.assertIn('fact land ask 2 (sort): none of its tries is wrong', out)
        self.assertIn('fact count ask 1 (pile): an ask needs "tries"', out)
        self.assertIn('fact warm ask 1 (pick): "kind" is one of check, play: an ask is a question', out)

    def test_an_ask_that_gives_itself_away_is_refused(self):
        def change(L):
            ask(L, 'warm', 'pick')['ask'] = 'Could water at 31 °C start a made-up storm?'
            ask(L, 'warm', 'dial')['ask'] = 'Turn the dial to 30 °C: how warm the water must be.'
        out = self.errors(change)
        self.assertIn('fact warm ask 1 (pick): gives itself away: the question says the right option, "Water at 31 °C"', out)
        self.assertIn('fact warm ask 2 (dial): gives itself away: it says the number it asks for, 30', out)
        out = self.errors(lambda L: ask(L, 'where', 'tap')['play'].update(calls=[['highlight', ['Brazil']]]), lesson='spin')
        self.assertIn('fact where ask 1 (tap): gives itself away: its part shows a highlight right where the goal is ("Brazil")', out)
        r = run('check', self.topic(lambda L: ask(L, 'where', 'tap')['play'].update(calls=[['marker', [-50, -10], 'pin']]), name='storms', source=FACTS, lesson='spin'))
        self.assertEqual(r.returncode, 0, r.stdout)   # a marker at a point says nothing of a goal that reads the country tapped
        self.assertNotIn('gives itself away', r.stdout)

    def test_two_asks_the_same_way_are_refused(self):
        out = self.errors(lambda L: fact(L, 'land')['asks'].append({**copy.deepcopy(ask(L, 'land', 'pick')), 'id': 'again'}))
        self.assertIn('fact land ask 3 (again): asks it the same way as ask 1', out)

    def test_steps_name_facts_the_topic_declares(self):
        out = self.errors(lambda L: L['steps'][1].update(fact='nope'))
        self.assertIn('step 2 (how-warm): names the fact "nope", which no lesson of the topic declares', out)
        # a step can name a fact from another lesson of the topic
        r = run('check', self.topic(lambda L: L['steps'][1].update(fact='turn'), name='storms', source=FACTS, lesson='fuel'))
        self.assertEqual(r.returncode, 0, r.stdout)
        out = self.errors(lambda L: L['facts'].append({**copy.deepcopy(fact(L, 'warm')), 'id': 'turn'}))
        self.assertIn('the fact "turn" is declared by fuel and again by spin', out)

    def test_facts_and_draws_belong_where_they_go(self):
        out = self.errors(lambda L: L.update(facts=[], draw={'from': 'unit', 'count': 4}), lesson='fuel')
        self.assertIn('"draw" is for a test or an exam', out)
        out = self.errors(lambda L: L.update(draw={'from': 'everywhere', 'count': 4}, facts=[]), lesson='drawn')
        self.assertIn('"draw" is { "from": "unit" or "topic"', out)
        self.assertIn('"facts" belong in a lesson', out)

    def test_a_review_with_no_facts_before_it_is_warned_about(self):
        r = run('check', FIXTURE)
        self.assertIn('(look-back): a review asks the facts of the lessons before it, and they declare none', r.stdout)

    def test_a_family_names_only_fields_its_rows_have(self):
        def change(L):
            L['families'][0]['fact']['text'] = 'In {sea}, a *{colour}* storm.'
            L['families'][0]['asks'][0]['input']['options'].pop('why')
        out = self.errors(change, lesson='spin')
        self.assertIn('family 1 (seas): "{colour}" names a field the rows don\'t have', out)
        self.assertIn('options made from the table need "why" and "tempting"', out)

    def test_a_family_is_checked_like_any_fact(self):
        out = self.errors(lambda L: L['families'][0]['asks'][0].update(ask='Is a made-up storm in {sea} a {name}?'), lesson='spin')
        self.assertIn('fact seas-north (family seas, row north) ask 1 (name): gives itself away: the question says the right option, "Gale"', out)


class AskVoice(Work):
    """A fact's asks are voiced like a lesson's steps, into their lesson's voice file, keyed by fact and ask."""

    def voice(self, dest, *extra):
        env = {**os.environ, 'PRIMER_APP': str(ROOT), 'PRIMER_VOICE_FAKE': '1'}
        r = subprocess.run([sys.executable, str(PRIMER), 'voice', str(dest), '--python', sys.executable, '--narrators', 'topic', *extra],
                           capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        return r.stdout

    def timing(self, dest, key):
        return json.loads((dest / 'voice' / f'{key}.json').read_text(encoding='utf-8'))

    def unvoiced(self, source, name):
        dest = self.tmp / f'copy-{name}' / name
        shutil.copytree(source, dest)
        shutil.rmtree(dest / 'voice', ignore_errors=True)
        return dest

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'needs ffmpeg')
    def test_asks_are_voiced_with_their_lesson_by_fact_and_ask(self):
        dest = self.unvoiced(FACTS, 'storms')
        r = run('check', dest)
        self.assertIn('fuel.json: isn\'t voiced yet', r.stdout)
        self.voice(dest)
        lines = self.timing(dest, 'fuel')['lines']
        fuel = json.loads((dest / 'fuel.json').read_text(encoding='utf-8'))
        for a in fact(fuel, 'warm')['asks']:
            self.assertIn(f'warm.{a["id"]}.ask', lines)
            self.assertIn(f'warm.{a["id"]}.right', lines)
        pick = ask(fuel, 'warm', 'pick')
        wrong = [o['id'] for o in pick['input']['options'] if o.get('why')]
        self.assertTrue(wrong and all(f'warm.pick.option-{o}' in lines for o in wrong))
        e = lines['warm.pick.ask']['heart']
        self.assertTrue(e['clip'].startswith('voice/fuel/warm.pick.ask.heart.') and (dest / e['clip']).exists())
        self.assertNotIn('voiced', run('check', dest).stdout)
        # a family's asks are voiced with their {field}s filled in, one fact per row
        spin = self.timing(dest, 'spin')['lines']
        seas = [k for k in spin if k.startswith('seas-')]
        self.assertTrue(seas and all('{' not in spin[k]['heart']['said'] for k in seas), seas)
        self.assertTrue(any(k.startswith('seas-north.') and k.endswith('.ask') for k in seas), seas)
        # one ask's feedback changes: only its clip is made again
        ask(fuel, 'warm', 'pick')['right'] = 'Yes: a made-up storm needs warm water, about 30 degrees.'
        (dest / 'fuel.json').write_text(json.dumps(fuel, ensure_ascii=False), encoding='utf-8')
        r = run('check', dest)
        self.assertIn('lines changed since they were voiced (warm.pick.right)', r.stdout)
        self.assertIn('1 clip(s) to make', self.voice(dest))

    def test_an_asks_say_is_checked_like_a_steps(self):
        dest = self.topic(lambda L: ask(L, 'warm', 'pick').update(say={'text': 'Nothing.'}), name='storms', source=FACTS, lesson='fuel')
        r = run('check', dest)
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn('fact warm ask pick: "say" speaks for ask, right, why; not "text"', r.stdout)


class Families(unittest.TestCase):
    """A family makes the same facts in the checker as on the phone."""

    SYNTHETIC = {'id': 'oceans', 'rows': [
        {'id': 'a', 'ocean': 'the A Sea', 'short': 'A Sea', 'name': 'gale', 'lon': -45.5, 'lat': 22, 'big': True, 'n': 30.0},
        {'id': 'b', 'ocean': 'the B Sea', 'short': 'B Sea', 'name': 'gale', 'lon': -120, 'lat': 14.25, 'big': False, 'n': 3},
        {'id': 'c', 'ocean': 'the C Sea', 'short': 'C Sea', 'name': 'whirl', 'lon': 140, 'lat': 18, 'big': True, 'n': 7},
        {'id': 'd', 'ocean': 'the D Sea', 'short': 'D Sea', 'name': 'squall', 'lon': 80, 'lat': -12, 'big': False, 'n': 1.5},
        {'id': 'e', 'ocean': 'the E Sea', 'short': 'E Sea', 'name': 'squall', 'lon': 170, 'lat': -18, 'big': True, 'n': 12}],
        'fact': {'text': 'In {ocean} ({n} a year, big: {big}), a *{name}*.', 'src': ['x']},
        'asks': [
            {'id': 'name', 'kind': 'check', 'ask': 'What is it called in {ocean}?', 'figure': {'part': 'globe', 'settings': {'view': ['{lon}', '{lat}']}},
             'input': {'form': 'choice', 'options': {'from': 'name', 'count': 3, 'why': 'That is {other.ocean}\'s.', 'tempting': 'Like {other.short}.'}}},
            {'id': 'sea', 'kind': 'check', 'ask': 'Where is it a {name}?',
             'input': {'form': 'choice', 'options': {'from': 'short', 'count': 4, 'unlike': 'name', 'near': 'big', 'why': 'There: {other.name}.', 'tempting': 't'}}},
            {'id': 'n', 'kind': 'check', 'ask': 'How many?', 'input': {'form': 'slider', 'min': 0, 'max': 40}, 'answer': '{n}', 'within': 1,
             'tries': [{'state': {'value': '{n}', 'answered': True}, 'marked': 'right'}]}]}

    def families(self):
        caps = json.loads((CAPITALS / 'capitals.json').read_text(encoding='utf-8'))['families']
        seas = json.loads((FACTS / 'spin.json').read_text(encoding='utf-8'))['families']
        return caps + seas + [self.SYNTHETIC]

    def test_python_and_javascript_make_the_same_facts(self):
        sys.path.insert(0, str(PRIMER.parent))
        import primer  # noqa: E402
        fams = self.families()
        py = [primer.expand_family(f) for f in fams]
        script = ("import { expandFamily } from " + json.dumps((ROOT / 'js' / 'facts.js').as_uri()) + ";"
                  "import { readFileSync } from 'node:fs';"
                  "console.log(JSON.stringify(JSON.parse(readFileSync(0, 'utf8')).map(expandFamily)));")
        out = subprocess.run(['node', '--input-type=module', '-e', script], input=json.dumps(fams), capture_output=True, text=True, encoding='utf-8', check=True).stdout
        js = json.loads(out)
        # JSON has one kind of number: Python writes 30.0 where JavaScript writes 30, and they are the same value
        def num(v):
            if isinstance(v, float) and v.is_integer():
                return int(v)
            if isinstance(v, list):
                return [num(x) for x in v]
            if isinstance(v, dict):
                return {k: num(x) for k, x in v.items()}
            return v
        self.assertEqual(json.dumps(num(py), sort_keys=True, ensure_ascii=False), json.dumps(num(js), sort_keys=True, ensure_ascii=False))
        self.assertEqual(sum(len(x) for x in py), 4 + 3 + 5)

    def test_a_row_is_a_fact_and_a_column_its_options(self):
        sys.path.insert(0, str(PRIMER.parent))
        import primer  # noqa: E402
        made = {f['id']: f for f in primer.expand_family(self.SYNTHETIC)}
        a = made['oceans-a']
        self.assertEqual(a['text'], 'In the A Sea (30 a year, big: true), a *gale*.')
        self.assertEqual(a['asks'][0]['figure']['settings']['view'], [-45.5, 22])   # "{lon}" alone keeps its number
        self.assertEqual(a['asks'][2]['answer'], 30.0)
        names = a['asks'][0]['input']['options']
        self.assertEqual([o['text'] for o in names if o.get('right')], ['gale'])
        self.assertEqual(sorted(o['text'] for o in names), ['gale', 'squall', 'whirl'])   # one of each other value, never the right one again
        self.assertTrue(all(o['why'].startswith('That is the ') and o['tempting'].startswith('Like ') for o in names if not o.get('right')))
        seas = a['asks'][1]['input']['options']
        self.assertNotIn('B Sea', [o['text'] for o in seas])   # unlike: B's storms are gales too, so B isn't offered as wrong
        self.assertEqual(len(seas), 4)
        self.assertEqual([o['text'] for o in seas[1:3]], sorted([o['text'] for o in seas[1:3]], key=lambda t: t not in ('C Sea', 'E Sea')))  # near: the other big seas first
        self.assertEqual(primer.expand_family(self.SYNTHETIC), primer.expand_family(copy.deepcopy(self.SYNTHETIC)))   # the same every time


class FactsCommand(unittest.TestCase):
    def test_facts_lists_facts_their_asks_and_what_teaches_and_draws_on_them(self):
        out = run('facts', FACTS, check=True).stdout
        for line in ('Made-up storms: 8 fact(s), 3 of them made from 1 family.',
                     'warm: A made-up storm needs water at about 30 °C.  (made-up)',
                     'taught by: intro, how-warm (slider)',
                     'ask dial: dial: "Turn the dial to how warm the water must be." → 30 °C (within 2)',
                     'ask sort: sort: "Sort these: where does a made-up storm grow, and where does it weaken?" → {"sea": "grow", "land": "weak"}',
                     'ask tap: play:map: "Tap the country made-up storms start in."',
                     'seas-north: In the North Sea, a made-up storm is a Gale.  [family seas]',
                     'ask sea: choice: "In which sea is a made-up storm called a Gale?" → "North Sea" of 3',
                     'drawn (test): draws 4 question(s) from the facts of its unit',
                     'look-back (review): goes over 8 fact(s) from the lessons before it'):
            self.assertIn(line, out)
        made = json.loads(run('facts', CAPITALS, '--json', check=True).stdout)
        self.assertEqual([f['id'] for f in made], ['capital-france', 'capital-peru', 'capital-japan', 'capital-kenya'])
        self.assertEqual(made[1]['taught'][0]['step'], 'read')


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

    def test_every_form_is_marked_the_same_by_the_phone_and_the_checker(self):
        """Each form's examples and every Check step in the made-up topics, marked by js/lesson.js and by
        primer.py: right, close or wrong must come out the same, and as each try says."""
        sys.path.insert(0, str(PRIMER.parent))
        import primer  # noqa: E402
        desc = json.loads((ROOT / 'parts' / 'inputs' / 'part.json').read_text(encoding='utf-8'))
        cases = []
        for form, ex in desc['example'].items():
            s = {'kind': 'check', 'input': ex['settings'], 'answer': ex['answer']}
            s.update({k: ex[k] for k in ('within', 'close') if k in ex})
            cases += [(s, t['state'], t['marked']) for t in ex['tries']]
        for f in sorted((ROOT / 'tests' / 'fixtures' / 'data' / 'topics').glob('*/*.json')):
            if f.name == 'topic.json':
                continue
            for s in json.loads(f.read_text(encoding='utf-8')).get('steps', []):
                if s.get('kind') == 'check':
                    cases += [(s, t['state'], t['marked']) for t in s.get('tries', [])]
                    cases.append((s, {'value': primer.answer_of(s) if s['input']['form'] != 'spot' else {'x': s['answer']['x'], 'y': s['answer']['y']}, 'answered': True}, 'right'))
        forms = {c[0]['input']['form'] for c in cases}
        self.assertTrue({'dial', 'pile', 'string', 'sort', 'snap'} <= forms, forms)
        py = [primer.mark(s, st, desc) for s, st, _ in cases]
        script = ("import { mark } from " + json.dumps((ROOT / 'js' / 'lesson.js').as_uri()) + ";"
                  "import { readFileSync } from 'node:fs';"
                  "const [desc, cases] = JSON.parse(readFileSync(0, 'utf8'));"
                  "console.log(JSON.stringify(cases.map(([s, st]) => { const r = mark(s, st, desc); return r.right ? 'right' : r.close ? 'close' : 'wrong'; })));")
        out = subprocess.run(['node', '--input-type=module', '-e', script], input=json.dumps([desc, [[s, st] for s, st, _ in cases]]), capture_output=True, text=True, encoding='utf-8', check=True).stdout
        js = json.loads(out)
        self.assertEqual(py, js)
        self.assertEqual(py, [m for _, _, m in cases])
        self.assertGreater(len(cases), 40)


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


class SceneFit(SceneWork):
    def test_fit_draws_every_line_of_a_scene(self):
        dest = self.scene_topic(lambda S: line(S, 'end').update(text='And that is the end of the made-up scene. ' * 12, do=[]))
        r = run('fit', dest / 'engine.json', '--json', '--debug-port', os.environ.get('PRIMER_TEST_DEBUG', '9341'))
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        res = json.loads(r.stdout.strip().splitlines()[-1])['engine']['steps']
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]['verdict'], 'scrolls')
        self.assertIn('at line end', res[0]['words'])
        r = run('fit', SCENES, '--json', '--debug-port', os.environ.get('PRIMER_TEST_DEBUG', '9341'))
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        out = json.loads(r.stdout.strip().splitlines()[-1])
        self.assertEqual(sorted(out), ['engine', 'with-scene'])
        self.assertTrue(all(s['verdict'] in ('fits', 'tight') for steps in out.values() for s in steps['steps']), out)


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

    def test_send_carries_a_topics_scenes_and_their_voice(self):
        src = self.tmp / 'src' / 'scene-topic'
        shutil.copytree(SCENES, src)
        (src / 'voice' / 'stray.m4a').write_bytes(b'not named by any timing file')
        r = run('send', src, data=self.clone)
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn('an animation', r.stdout)
        dest = self.clone / 'topics' / 'scene-topic'
        sent = sorted(p.relative_to(dest).as_posix() for p in dest.rglob('*') if p.is_file())
        self.assertIn('engine.json', sent)
        self.assertIn('voice/engine.json', sent)
        self.assertIn('voice/with-scene.tour.json', sent)
        self.assertIn('voice/with-scene.json', sent)   # the lesson's own words, read aloud
        self.assertEqual(len([p for p in sent if p.endswith('.m4a')]), 20)
        self.assertNotIn('voice/stray.m4a', sent)
        self.assertIn('voice:', r.stdout)
        # a line voiced again: the old clip goes from the repo, the new one comes
        timing = json.loads((src / 'voice' / 'engine.json').read_text(encoding='utf-8'))
        old = timing['lines']['turn']['bella']['clip']
        new = old.replace('turn.bella.', 'turn.bella.0000')
        (src / old).rename(src / new)
        timing['lines']['turn']['bella']['clip'] = new
        (src / 'voice' / 'engine.json').write_text(json.dumps(timing), encoding='utf-8')
        self.assertEqual(run('send', src, data=self.clone).returncode, 0)
        self.assertFalse((dest / old).exists())
        self.assertTrue((dest / new).exists())

    def test_send_carries_the_narrators_samples(self):
        src = self.tmp / 'src' / 'scene-topic'
        shutil.copytree(SCENES, src)
        r = run('send', src, data=self.clone)
        self.assertIn('no narrator samples', r.stdout)
        shutil.copytree(SCENES.parent.parent / 'narrators', self.clone / 'narrators')
        (src / 'engine.json').write_text((src / 'engine.json').read_text(encoding='utf-8').replace('"version": 1', '"version": 2'), encoding='utf-8')
        r = run('send', src, data=self.clone)
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertNotIn('no narrator samples', r.stdout)
        tracked = git(self.clone, 'ls-files', 'narrators').split()
        self.assertEqual(len([p for p in tracked if p.endswith('.m4a')]), 4)
        self.assertIn('narrators/samples.json', tracked)

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

    def test_progress_says_which_facts_are_strong_and_which_weak(self):
        src = self.tmp / 'src' / 'storms'
        shutil.copytree(FACTS, src)
        run('send', src, data=self.clone, check=True)
        lesson = {'v': 1, 'topic': 'storms', 'lesson': 'fuel', 'version': 1}
        at = lambda d, h=10: f'2026-11-{10 + d:02d}T{h:02d}:00:00.000Z'
        events = [
            {**lesson, 'eid': 'f1', 'at': at(0), 'type': 'start', 'step': 'intro'},
            {**lesson, 'eid': 'f2', 'at': at(0, 11), 'type': 'attempt', 'step': 'how-warm', 'fact': 'warm', 'kind': 'check', 'form': 'slider', 'value': 30, 'right': True, 'close': False, 'why': 'Yes: *30 °C*.'},
            {**lesson, 'eid': 'f3', 'at': at(0, 12), 'type': 'attempt', 'step': 'over-land', 'fact': 'land', 'kind': 'check', 'form': 'choice', 'value': 'grow', 'right': False, 'close': False, 'why': 'No: over land it *weakens*.'},
            {**lesson, 'eid': 'f4', 'at': at(0, 13), 'type': 'finish', 'right': 1, 'of': 2},
            {'v': 1, 'eid': 'f5', 'at': at(2), 'type': 'attempt', 'review': 'r1', 'topic': 'storms', 'fact': 'land', 'ask': 'sort', 'lesson': 'fuel', 'version': 1, 'kind': 'check', 'form': 'sort',
             'value': {'sea': 'weak', 'land': 'grow'}, 'right': False, 'close': False, 'why': 'Warm sea feeds it; *land* weakens it.'},
            {'v': 1, 'eid': 'f6', 'at': at(3), 'type': 'attempt', 'review': 'r1', 'topic': 'storms', 'fact': 'warm', 'ask': 'dial', 'lesson': 'fuel', 'version': 1, 'kind': 'check', 'form': 'dial',
             'value': 30, 'right': True, 'close': False, 'why': 'Yes: about *30 °C*.'},
            {'v': 1, 'eid': 'f7', 'at': at(3, 11), 'type': 'review', 'run': 'r1', 'topic': None, 'right': 1, 'of': 2, 'combo': 1},
        ]
        self.phone_sends('2026-11-13T11-00-00-000Z-ffffff', events)
        out = run('progress', '--all', '--now', at(3, 22), data=self.clone, check=True).stdout
        self.assertIn('Review: 2 answer(s) in 1 run(s), 1 right, best combo ×1', out)
        self.assertIn('wrong: storms › land (asked sort, sort): {"sea": "weak", "land": "grow"}  shown: "Warm sea feeds it; *land* weakens it."', out)
        self.assertIn('Memory, from every answer so far (2 of 8 facts asked', out)
        self.assertRegex(out, r'Strong \(1\): warm (9\d|100)%')
        self.assertIn('Weak (1):', out)
        self.assertRegex(out, r'storms › land \d+%: Over land a made-up storm weakens\.  \(missed 2 of 2; last wrong in review: \{"sea": "weak", "land": "grow"\}, shown "Warm sea feeds it; \*land\* weakens it\."\)')
        self.assertIn('Not asked yet (6): count, turn, where, seas-north', out)
        self.assertIn('Review so far: 2 answer(s) in 1 run(s), 1 right; best combo ×1', out)
        # the same numbers as the phone: memory.mjs runs the app's own model
        mem = json.loads(subprocess.run(['node', str(ROOT / 'skill' / 'memory.mjs'), '--app', str(ROOT), '--data', str(self.clone), '--now', at(3, 22)],
                                        capture_output=True, text=True, encoding='utf-8', check=True).stdout)
        warm = next(x for x in mem['facts'] if x['fact'] == 'warm')
        script = ("import { Memory } from " + json.dumps((ROOT / 'js' / 'memory.js').as_uri()) + ";"
                  "const m = new Memory(); m.answer('k', 'right', '" + at(0, 11) + "'); m.answer('k', 'right', '" + at(3) + "');"
                  "console.log(m.recall('k', Date.parse('" + at(3, 22) + "')).toFixed(4))")
        js = subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True, text=True, check=True).stdout.strip()
        self.assertEqual(f'{warm["recall"]:.4f}', js)
        self.assertEqual(warm['answers'], 2)


if __name__ == '__main__':
    unittest.main(verbosity=2)
