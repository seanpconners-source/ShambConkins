#!/usr/bin/env python3
"""Background Picker, step 2: build the picker page folder from measure.mjs's output.
Usage: python3 -I tools/bg-picker/assemble.py <measure dir> <out dir> [--all]
Pictures already locked on every screen (src/data/keyPlacements.js) are left out unless --all.
Then publish <out dir>/index.html with every other file in <out dir> as `files` (see README.md)."""
import json, os, sys, shutil, re
import PIL.Image as I
T = os.path.dirname(os.path.abspath(__file__)); R = os.path.abspath(os.path.join(T, '..', '..'))
M_DIR, OUT = sys.argv[1], sys.argv[2]; ALL = '--all' in sys.argv
M = json.load(open(os.path.join(M_DIR, 'measure.json')))
SCREENS = json.load(open(os.path.join(T, 'screens.json')))
src = open(os.path.join(R, 'src', 'arcadeConsole.js')).read()
box_js = re.search(r'const KEY_BOX=(\{.*?\});', src, re.S).group(1)
BOX = json.loads(re.sub(r'([{,]\s*)([a-z][a-z0-9]*):', r'\1"\2":', box_js.replace("'", '"')).replace(':[.', ':[0.').replace(',.', ',0.'))
DEFAULT = [.28, .15, .72, .85]
kp = open(os.path.join(R, 'src', 'data', 'keyPlacements.js')).read(); m = re.search(r'/\*PLACE\*/(.*?)/\*END\*/', kp, re.S)
PLACE = json.loads(m.group(1)) if m else {}
NICE = {'bosses': 'Boss Select', 'pinball': 'Pinball Tables', 'bucketheadland-pinball': 'Bucketheadland Pinball', 'black-sabbath-pinball': 'Black Sabbath Pinball',
        'king-gizzard-pinball': 'King Gizzard Pinball', 'doom-2': 'DOOM II', 'broforce': 'Sean of a Gun'}
shutil.rmtree(OUT, ignore_errors=True)
for d in ('k', 'l', 'o'): os.makedirs(os.path.join(OUT, d))
screens = []
for s in SCREENS:
    if s['id'] not in M: continue
    shutil.copy(os.path.join(M_DIR, f"overlay-{s['id']}.png"), os.path.join(OUT, 'o', f"{s['id']}.png"))
    screens.append({**s, 'rects': M[s['id']]['rects'], 'overlay': f"o/{s['id']}.png"})
titles = {}
for v in M.values(): titles.update(v.get('titles', {}))
kd = os.path.join(R, 'assets', 'keyart'); slots = []; done = []
for f in sorted(os.listdir(kd)):
    k, ext = os.path.splitext(f)
    if ext not in ('.webp', '.png', '.jpg') or k.endswith('-logo') or '-word-' in k: continue
    if not ALL and len(PLACE.get(k, {})) >= len(SCREENS): done.append(k); continue
    shutil.copy(os.path.join(kd, f), os.path.join(OUT, 'k', k + ext)); w, h = I.open(os.path.join(kd, f)).size
    logo = next((x for x in os.listdir(kd) if os.path.splitext(x)[0] == k + '-logo'), None)
    if logo: shutil.copy(os.path.join(kd, logo), os.path.join(OUT, 'l', logo))
    slots.append({'id': k, 'title': titles.get(k) or NICE.get(k) or k.replace('-', ' ').title(), 'box': BOX.get(k, DEFAULT), 'nw': w, 'nh': h,
                  'img': f'k/{k}{ext}', 'logo': f'l/{logo}' if logo else None, 'place': {s: M[s]['place'][k] for s in M if k in M[s].get('place', {})}})
slots.sort(key=lambda s: s['title'].lower())
html = open(os.path.join(T, 'picker.html')).read().replace('/*DATA*/null', json.dumps({'screens': screens, 'slots': slots}, separators=(',', ':')))
open(os.path.join(OUT, 'index.html'), 'w').write(html)
files = sorted(os.path.relpath(os.path.join(d, f), OUT) for d, _, fs in os.walk(OUT) for f in fs if f != 'index.html')
json.dump(files, open(os.path.join(OUT, '..', 'picker-files.json'), 'w'))
print(f'{len(slots)} pictures in the picker, {len(done)} already locked everywhere and left out; {len(files)} files -> {OUT}/../picker-files.json')
