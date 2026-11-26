#!/usr/bin/env python3
"""Pack the Head Placer page into a folder ready to publish as an artifact (any account):
  python3 -I tools/warriors/head-placer/pack.py <out>
Writes <out>/index.html, <out>/data.json (every pose's starting spot = what the GAME uses now, from src/data/ddHeads.js,
so a fresh copy of the page opens on the owner's placed heads), <out>/sheets/*.webp (lossy previews of assets/warriors),
<out>/faces/p1.png + p2.png (the example heads). Then publish <out>/index.html with root <out>, files = everything else,
capabilities {"db": {}} (README.md)."""
import json, os, re, shutil, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
OUT = sys.argv[1]; os.makedirs(OUT + '/sheets', exist_ok=True); os.makedirs(OUT + '/faces', exist_ok=True)
data = json.load(open(HERE + '/data.json'))
js = open(ROOT + '/src/data/ddHeads.js').read(); HEADS = json.loads(js.split('/*@@*/')[1].split('/*@@end*/')[0])
n = 0
for sh in data['sheets']:
    for c in sh['cells']:
        v = HEADS.get(sh['id'], {}).get(c['p'])
        if v: c['d'] = v[:4]; c.pop('b', None); (c.__setitem__('b', 1) if len(v) > 4 and v[4] else None); n += 1
    Image.open(f"{ROOT}/assets/warriors/{sh['id']}.webp").convert('RGBA').save(f"{OUT}/sheets/{sh['id']}.webp", quality=90, method=6)
json.dump(data, open(OUT + '/data.json', 'w'), separators=(',', ':'))
shutil.copy(HERE + '/index.html', OUT + '/index.html')
Image.open(ROOT + '/assets/c037c271407a.webp').convert('RGBA').save(OUT + '/faces/p1.png')
am = Image.open(ROOT + '/assets/40575750a179.jpg').convert('RGB'); A = np.array(am).astype(int); dark = A.max(axis=2) < 34
lab, _ = ndimage.label(dark); edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
alpha = np.where(np.isin(lab, list(edge)), 0, 255).astype(np.uint8); alpha = ndimage.uniform_filter(alpha.astype(float), 3).astype(np.uint8)
Image.fromarray(np.dstack([np.array(am), alpha]), 'RGBA').resize((422, 640), Image.LANCZOS).save(OUT + '/faces/p2.png')
# real faces for the gang sheets (owner, Nov 24: judge the spot on real heads, not the drawing; the nameless enemies wear random
# character faces in the game now): cut-out photos with a sure, front-facing measured face, each with its head facts box
GANG_FACES=['ozzy-osbourne','dp-zoe-bell','ref-buzzosborne','bsb-kevin','moneypenny','macready','ref-walkertexasranger','bb-mike-hanford',
 'john-bender','ramona','umbridge','rocky-balboa','wf-harry-caray','oddjob','rdr-dutch','ib-donny-donowitz']
hf = open(ROOT + '/src/data/headFacts.js').read()
data['gangFaces'] = []
for i, cid in enumerate(GANG_FACES):
    m = re.search(r'"photo:char:' + re.escape(cid) + r'":\[([^\]]+)\]', hf)
    src = f"{ROOT}/assets/portraits/{cid}.webp"
    if not m or not os.path.exists(src): continue
    v = [float(x) for x in m.group(1).split(',')]
    im = Image.open(src).convert('RGBA'); im.thumbnail((512, 512), Image.LANCZOS); im.save(f"{OUT}/faces/{cid}.png")
    data['faces'][cid] = {'src': f'faces/{cid}.png', 'f': v[:4], 'aspect': v[11], 'name': cid}
    data['gangFaces'].append(cid)
json.dump(data, open(OUT + '/data.json', 'w'), separators=(',', ':'))
print(f'packed {OUT}: {sum(len(s["cells"]) for s in data["sheets"])} poses ({n} from the game), {len(data["sheets"])} sheets')
