#!/usr/bin/env python3
"""Write src/data/ddHeads.js from the Head Placer (https://claude.ai/artifact/8xWvhr9jMKG5Y6ZkQdxFbp).
  1. ArtifactData list of collection `heads` (limit 1000) with out_dir = <dump>
  2. python3 -I tools/warriors/head-placer/apply.py <dump>
Every pose gets a spot: the owner's saved one (locked or just moved) or the placer's automatic one from data.json.
"""
import json, os, sys, glob
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
data = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')))
saved = {}
if len(sys.argv) > 1:
    for f in glob.glob(os.path.join(sys.argv[1], '**', '*.json'), recursive=True):
        d = json.load(open(f)); d = d.get('data', d); saved[os.path.basename(f)[:-5]] = d
out, n, lk = {}, 0, 0
for sh in data['sheets']:
    o = out[sh['id']] = {}
    for c in sh['cells']:
        s = saved.get(sh['id'] + '--' + c['p']); b = c.get('b', 0)
        if s: v = [s['x'], s['y'], s['a'], s['s']]; b = int(s.get('b', b) or 0); n += 1; lk += bool(s.get('locked'))
        else: v = c['d']
        o[c['p']] = [round(v[0], 1), round(v[1], 1), round(v[2], 1), round(v[3], 3)] + ([1] if b else [])
p = os.path.join(ROOT, 'src/data/ddHeads.js'); txt = open(p).read()
body = ',\n'.join(f' {json.dumps(k)}:' + json.dumps(v, separators=(',', ':')) for k, v in out.items())
open(p, 'w').write(txt[:txt.index('/*@@*/') + 6] + '{\n' + body + '\n}' + txt[txt.index('/*@@end*/'):])
print(f'wrote {p}: {sum(len(v) for v in out.values())} poses, {n} placed by the owner ({lk} locked)')
