#!/usr/bin/env python3
"""Copies the skill to where Claude Code finds it, as `primer`, with the format notes beside it, and notes
where the app is, so the skill can read the parts' descriptions and draw lessons. Run it after changing the skill."""
import pathlib
import shutil

here = pathlib.Path(__file__).resolve().parent
app = here.parent
target = pathlib.Path.home() / '.claude' / 'skills' / 'primer'
target.mkdir(parents=True, exist_ok=True)
for name in ('SKILL.md', 'primer.py', 'fit.mjs', 'cdp.mjs'):
    shutil.copyfile(here / name, target / name)
shutil.copyfile(app / 'docs' / 'format.md', target / 'format.md')
(target / 'app-path.txt').write_text(str(app), encoding='utf-8')
print(f'Installed to {target}')
