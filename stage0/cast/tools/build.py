"""Builds the cast board: every character shown in the avatar rounds so far, one picture each.

    python stage0/cast/tools/build.py

Copies each round's own single picture into stage0/cast/ as r<round>-<name>.png (full size, unchanged), makes a
square thumbnail of each, cropped to the character so it reads in a small tile (stage0/cast/thumbs/), and writes
stage0/cast/list.json: one entry per picture with its label, round and where it came from, plus what was left
out and why. The deck stage0-cast.json takes its board items from that list (see --items).

    python stage0/cast/tools/build.py --items     prints the board items as JSON, for the deck

Only round 1 had no picture of its own (the sketch avatar was only ever drawn inside the Home screen); it is
re-rendered from that sketch's code by stage0/cast/kid.html (see the note there). Every other round already had
a full-size single of each character, so those are reused, never redrawn. Needs Pillow.
"""
import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageChops

HERE = Path(__file__).resolve().parent.parent          # stage0/cast
STAGE0 = HERE.parent

# (round, id, label, source picture under stage0/, a few words for the list)
CAST = [
    (1, 'kid', 'Kid in a hat', 'cast/r01-kid.png', 'The stand-in avatar in the first Home sketch. Re-rendered on its own.'),

    (2, 'fox', 'Fox', 'room/shots/avatar-fox.png', 'The first avatar board: three animals, three monsters.'),
    (2, 'capybara', 'Capybara', 'room/shots/avatar-capy.png', ''),
    (2, 'axolotl', 'Axolotl', 'room/shots/avatar-axo.png', ''),
    (2, 'tuft', 'Tuft', 'room/shots/avatar-tuft.png', 'The purple monster.'),
    (2, 'glim', 'Glim', 'room/shots/avatar-glim.png', ''),
    (2, 'pebble', 'Pebble', 'room/shots/avatar-pebble.png', 'The rock monster.'),

    (3, 'puffin', 'Puffin', 'avatar/shots/puffin.png', 'Kurzgesagt end to Duolingo end.'),
    (3, 'tall', 'Tall person', 'avatar/shots/tall.png', ''),
    (3, 'frog', 'Frog', 'avatar/shots/frog.png', ''),
    (3, 'raccoon', 'Raccoon', 'avatar/shots/raccoon.png', ''),
    (3, 'toucan', 'Toucan', 'avatar/shots/toucan.png', ''),
    (3, 'round', 'Round person', 'avatar/shots/round.png', ''),

    (4, 'otter', 'Otter', 'avatar4/shots/otter.png', 'Ten base shapes.'),
    (4, 'hippo', 'Hippo', 'avatar4/shots/hippo.png', ''),
    (4, 'gecko', 'Gecko', 'avatar4/shots/gecko.png', ''),
    (4, 'cockatiel', 'Cockatiel', 'avatar4/shots/cockatiel.png', ''),
    (4, 'bee', 'Bee', 'avatar4/shots/bee.png', ''),
    (4, 'person', 'Person with a bun', 'avatar4/shots/person.png', ''),
    (4, 'sheep', 'Sheep', 'avatar4/shots/sheep.png', ''),
    (4, 'bat', 'Bat', 'avatar4/shots/bat.png', ''),
    (4, 'walrus', 'Walrus', 'avatar4/shots/walrus.png', ''),
    (4, 'flamingo', 'Flamingo', 'avatar4/shots/flamingo.png', ''),
]
# round 5: one person and one monster, each in ten shape styles
for side, who in (('person', 'Person'), ('monster', 'Monster')):
    for key, name in (('blob', 'Blob'), ('circles', 'Circles'), ('noodle', 'Noodle'), ('pills', 'Pills'),
                      ('squat', 'Squat'), ('tall', 'Tall'), ('blocks', 'Blocks'), ('cutout', 'Cut-out'),
                      ('facets', 'Facets'), ('spiky', 'Spiky')):
        CAST.append((5, f'{side}-{key}', f'{who}, {name}', f'avatar5/shots/{side}-{key}.png',
                     'One person and one monster in ten shape styles.' if key == 'blob' else ''))
# round 6: the person between Blob and Noodle (its Blob and Noodle repeat round 5's, so are left out), and four
# monsters each in Blob and in Noodle
for key, name in (('softer', 'Softer'), ('longer', 'Long nubs'), ('blobnoodle', 'Blob + noodles'),
                  ('softnoodle', 'Soft noodle'), ('rounder', 'Round noodle'), ('bendier', 'Bendier')):
    CAST.append((6, f'person-{key}', f'Person, {name}', f'avatar6/shots/person-{key}.png',
                 'Steps between Blob and Noodle.' if key == 'softer' else ''))
for mon in ('lamp', 'flop', 'hug', 'wiggle'):
    for build in ('blob', 'noodle'):
        CAST.append((6, f'{mon}-{build}', f'{mon.title()}, {build.title()}', f'avatar6/shots/monster-{mon}-{build}.png',
                     'Four new monsters, each in Blob and Noodle.' if (mon, build) == ('lamp', 'blob') else ''))
# round 7: ten calmer faces on one person, and five side views
for key in ('calm', 'plain', 'thinking', 'sleepy', 'curious', 'unimpressed', 'determined', 'shy', 'quiet', 'dry'):
    CAST.append((7, f'face-{key}', f'{key.title()} face', f'avatar7/shots/face-{key}.png',
                 'Ten calmer faces on the same person.' if key == 'calm' else ''))
for key, name in (('person-blob', 'Blob'), ('person-noodle', 'Noodle'), ('person-blobnoodle', 'Blob + noodles'),
                  ('lamp', 'Lamp'), ('hippo', 'Hippo')):
    CAST.append((7, f'side-{key}', f'{name}, side view', f'avatar7/shots/side-{key}.png',
                 'The first side views.' if key == 'person-blob' else ''))
# round 8: one crow, eight looks
for key in ('pebble', 'facet', 'stilt', 'chunk', 'blocks', 'scratch', 'paper', 'lantern'):
    CAST.append((8, f'crow-{key}', f'{key.title()} crow', f'avatar8/shots/crow-{key}.png',
                 'One crow in eight very different looks.' if key == 'pebble' else ''))
# round 9: one crow, eight flat looks
for key in ('plump', 'sleek', 'hooded', 'crisp', 'longtail', 'ruff', 'bean', 'ink'):
    CAST.append((9, f'crow-{key}', f'{key.title()} crow', f'avatar9/shots/crow-{key}.png',
                 'One crow in eight flat looks.' if key == 'plump' else ''))
# round 10: five new takes each on Plump and Bean (its Plump and Bean are round 9's, unchanged)
for fam, keys in (('plump', ('button', 'drowse', 'keen', 'amber', 'smoke')), ('bean', ('pip', 'nap', 'scout', 'honey', 'moon'))):
    for key in keys:
        CAST.append((10, f'crow-{key}', f'{key.title()} crow', f'avatar10/shots/crow-{fam}-{key}.png',
                     f'A take on {fam.title()}.'))

LEFT_OUT = [
    {'what': 'round 2: the six in the knitted hat (room/shots/avatar-*-hat.png)', 'why': 'the same six characters, dressed'},
    {'what': 'round 3: the six in the hat and shirt (avatar/shots/*-dressed.png)', 'why': 'the same six characters, dressed'},
    {'what': 'round 6: Person, Blob and Person, Noodle', 'why': "round 5's picks shown again as the ends of the range, near identical"},
    {'what': 'round 10: Plump and Bean', 'why': "round 9's pictures, unchanged (the same render)"},
    {'what': 'every lineup, face sheet and icon strip', 'why': 'composites; each character in them has its own picture here'},
]


def thumb(src: Path, dst: Path, size=360, pad=0.08):
    """A square of the picture around the character, so it reads in a small tile. The wall's stripes repeat every
    76 pixels and its shading runs only top to bottom, so the left-most 76 columns (always bare wall and floor)
    tiled across give the empty room; whatever differs from that is the character and its shadow."""
    im = Image.open(src).convert('RGB')
    W, H = im.size
    strip = im.crop((0, 0, 76, H))
    room = Image.new('RGB', (W, H))
    for x in range(0, W, 76):
        room.paste(strip, (x, 0))
    diff = ImageChops.difference(im, room).convert('L').point(lambda v: 255 if v > 28 else 0)
    box = diff.getbbox() or (0, 0, W, H)
    x0, y0, x1, y1 = box
    side = max(x1 - x0, y1 - y0)
    side = min(int(side * (1 + 2 * pad)), W, H)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    left = int(min(max(cx - side / 2, 0), W - side))
    top = int(min(max(cy - side / 2, 0), H - side))
    im.crop((left, top, left + side, top + side)).resize((size, size), Image.LANCZOS).save(dst, quality=86)


def build():
    (HERE / 'thumbs').mkdir(exist_ok=True)
    entries = []
    for rnd, cid, label, src, note in CAST:
        name = f'r{rnd:02d}-{cid}'
        dst = HERE / f'{name}.png'
        if (STAGE0 / src).resolve() != dst.resolve():
            shutil.copyfile(STAGE0 / src, dst)
        thumb(dst, HERE / 'thumbs' / f'{name}.jpg')
        entries.append({'id': name, 'label': f'{label}, round {rnd}', 'round': rnd, 'picture': f'{name}.png',
                        'thumb': f'thumbs/{name}.jpg', 'from': src, **({'note': note} if note else {})})
    out = {'about': 'Every character shown in the avatar rounds, one full-size picture each, in the order shown. '
                    'Built by tools/build.py.', 'count': len(entries), 'cast': entries, 'left_out': LEFT_OUT}
    (HERE / 'list.json').write_text(json.dumps(out, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'{len(entries)} characters, rounds {sorted({e["round"] for e in entries})}')


def items():
    data = json.loads((HERE / 'list.json').read_text(encoding='utf-8'))
    rel = '../../stage0/cast/'
    print(json.dumps([{'id': e['id'], 'label': e['label'], 'image': rel + e['picture'], 'thumb': rel + e['thumb']}
                      for e in data['cast']], indent=2, ensure_ascii=False))


if __name__ == '__main__':
    items() if '--items' in sys.argv else build()
