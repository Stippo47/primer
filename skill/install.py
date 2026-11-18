#!/usr/bin/env python3
"""Copies the skill to where Claude Code finds it, as `primer`, with the format notes beside it, and notes
where the app is, so the skill can read the parts' descriptions and draw lessons. Run it after changing the skill.

  python skill/install.py [--tts <folder>]

--tts names the folder holding the voice environments (kokoro, chatterbox and check, each a Python
environment), for `primer voice`. It's noted once and kept on later installs."""
import argparse
import pathlib
import shutil

ap = argparse.ArgumentParser()
ap.add_argument('--tts', help='the folder holding the voice environments: kokoro, chatterbox and check')
a = ap.parse_args()
here = pathlib.Path(__file__).resolve().parent
app = here.parent
target = pathlib.Path.home() / '.claude' / 'skills' / 'primer'
target.mkdir(parents=True, exist_ok=True)
for name in ('SKILL.md', 'primer.py', 'fit.mjs', 'cdp.mjs'):
    shutil.copyfile(here / name, target / name)
(target / 'voice').mkdir(exist_ok=True)
for name in ('say.py', 'hear.py', 'textnorm.py'):
    shutil.copyfile(here / 'voice' / name, target / 'voice' / name)
shutil.copyfile(app / 'docs' / 'format.md', target / 'format.md')
(target / 'app-path.txt').write_text(str(app), encoding='utf-8')
if a.tts:
    (target / 'tts-path.txt').write_text(str(pathlib.Path(a.tts).resolve()), encoding='utf-8')
print(f'Installed to {target}')
