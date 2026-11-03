#!/usr/bin/env python3
"""Background Picker, step 2: build the picker page folder from measure.mjs's output.
Usage: python3 -I tools/bg-picker/assemble.py <measure dir> <out dir> [--all | --check | --only a,b]
Pictures already locked on every screen (src/data/keyPlacements.js) are left out, unless --all (every picture),
--check (also locked pictures where the game's real hero text covers more than 12% of the faces box on some screen)
or --only slot,slot. The page shows the game's real hero text (measure.mjs captures it) and warns when it covers faces.
Then publish <out dir>/index.html with every other file in <out dir> as `files` (see README.md)."""
import json, os, sys, shutil, re
import PIL.Image as I
T = os.path.dirname(os.path.abspath(__file__)); R = os.path.abspath(os.path.join(T, '..', '..'))
M_DIR, OUT = sys.argv[1], sys.argv[2]; ALL = '--all' in sys.argv; CHECK = '--check' in sys.argv
ONLY = next((a.split('=',1)[1] if '=' in a else sys.argv[sys.argv.index(a)+1] for a in sys.argv if a.startswith('--only')), '')
ONLY = set(x for x in ONLY.split(',') if x)
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
for d in ('k', 'l', 'o', 'i'): os.makedirs(os.path.join(OUT, d))
screens = []
for s in SCREENS:
    if s['id'] not in M: continue
    shutil.copy(os.path.join(M_DIR, f"overlay-{s['id']}.png"), os.path.join(OUT, 'o', f"{s['id']}.png"))
    screens.append({**s, 'rects': M[s['id']]['rects'], 'overlay': f"o/{s['id']}.png"})
titles = {}
for v in M.values(): titles.update(v.get('titles', {}))
kd = os.path.join(R, 'assets', 'keyart'); slots = []; done = []; flagged = {}
for f in sorted(os.listdir(kd)):
    k, ext = os.path.splitext(f)
    if ext not in ('.webp', '.png', '.jpg') or k.endswith('-logo') or '-word-' in k: continue
    def covered(sid, p, wh):
        rs = [x['rect'] for x in M.get(sid, {}).get('info', {}).get(k, [])]
        if not rs: return 0
        W, H = M[sid]['w'], M[sid]['h']; cover = max(W / wh[0], H / wh[1]); dw, dh = wh[0] * cover * p['z'], wh[1] * cover * p['z']
        l, t = W / 2 - p['fx'] * dw, H / 2 - p['fy'] * dh; B = BOX.get(k, DEFAULT); b = [l + B[0] * dw, t + B[1] * dh, l + B[2] * dw, t + B[3] * dh]
        A = (b[2] - b[0]) * (b[3] - b[1])
        return max(max(0, min(b[2], r[2]) - max(b[0], r[0])) * max(0, min(b[3], r[3]) - max(b[1], r[1])) / A for r in rs) if A > 0 else 0
    wh0 = I.open(os.path.join(kd, f)).size
    hits = {sid: round(covered(sid, p, wh0), 2) for sid, p in PLACE.get(k, {}).items() if covered(sid, p, wh0) > .12}
    if hits: flagged[k] = hits
    full = len(PLACE.get(k, {})) >= len(SCREENS)
    if ONLY and k not in ONLY: continue
    if not ALL and not ONLY and full and not (CHECK and hits): done.append(k); continue
    shutil.copy(os.path.join(kd, f), os.path.join(OUT, 'k', k + ext)); w, h = I.open(os.path.join(kd, f)).size
    logo = next((x for x in os.listdir(kd) if os.path.splitext(x)[0] == k + '-logo'), None)
    if logo: shutil.copy(os.path.join(kd, logo), os.path.join(OUT, 'l', logo))
    slots.append({'id': k, 'title': titles.get(k) or NICE.get(k) or k.replace('-', ' ').title(), 'box': BOX.get(k, DEFAULT), 'nw': w, 'nh': h,
                  'img': f'k/{k}{ext}', 'logo': f'l/{logo}' if logo else None, 'place': {s: M[s]['place'][k] for s in M if k in M[s].get('place', {})}})
    info, info_all = {}, {}
    for sid in M:
        vs = M[sid].get('info', {}).get(k, [])
        if not vs: continue
        info_all[sid] = [v['rect'] for v in vs]
        v = next((x for x in vs if x['v'] == 'f'), vs[0]); dst = f"i/{sid}.{k}.png"
        shutil.copy(os.path.join(M_DIR, v['file']), os.path.join(OUT, dst)); info[sid] = {'rect': v['rect'], 'file': dst}
    slots[-1].update(info=info, infoAll=info_all)
slots.sort(key=lambda s: s['title'].lower())
html = open(os.path.join(T, 'picker.html')).read().replace('/*DATA*/null', json.dumps({'screens': screens, 'slots': slots}, separators=(',', ':')))
open(os.path.join(OUT, 'index.html'), 'w').write(html)
files = sorted(os.path.relpath(os.path.join(d, f), OUT) for d, _, fs in os.walk(OUT) for f in fs if f != 'index.html')
json.dump(files, open(os.path.join(OUT, '..', 'picker-files.json'), 'w'))
if flagged: print('Text covers the faces (share of the faces box, by screen):\n  ' + '\n  '.join(f'{k}: {v}' for k, v in sorted(flagged.items())))
print(f'{len(slots)} pictures in the picker, {len(done)} already locked everywhere and left out; {len(files)} files -> {OUT}/../picker-files.json')
