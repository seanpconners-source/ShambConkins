#!/usr/bin/env python3
"""Import a whole character sheet (GPT/Grok picture on flat green, one animation per row, labels in a left column) into
the Seanic sprite slots: keys out the green, finds the rows and the poses in each row, scales everything by ONE factor
so the standing body matches the template, places each pose in its frame cell (feet on the ground point, or by the neck
for air poses), finds the neck opening in every pose (its dark inside) and writes where the face goes.
  python3 tools/sonic3/import-sheet.py <picture> <runner-p1|runner-p2> [--x0 125] [--ball ball-p2] [--preview out.png]
The picture's rows must be the sheet's rows in order (src/data/sonic3Sprites.js), then, with --ball, roll and spindash.
Writes assets/sonic3/<name>.webp (2x the frame size, lossless) and the face spots into src/data/sonic3Heads.js."""
import sys, json, re, subprocess, shutil, os
import numpy as np
from PIL import Image
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
args = sys.argv[1:]
src, name = args[0], args[1]
opt = lambda k, d=None: (args[args.index(k) + 1] if k in args else d)
x0 = int(opt('--x0', 125)); ball = opt('--ball'); RES = 2
spec = json.loads(subprocess.check_output(['node', '-e', "const e={};new Function('exports',require('fs').readFileSync('%s/src/data/sonic3Sprites.js','utf8'))(e);const n=process.argv[1],b=process.argv[2];const pick=k=>{const d=e.sheetOf(k);return {frame:d.frame,foot:d.foot,rows:d.rows,heads:Object.fromEntries(Object.keys(d.rows).map(r=>[r,Array.from({length:d.rows[r]},(_,f)=>e.headOf(k,r,f))]))};};console.log(JSON.stringify({main:pick(n),ball:b?pick(b):null}))" % root, name, ball or '']))
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
bg = (g > 150) & (g - r > 70) & (g - b > 70); fg = ~bg; fg[:, :x0] = False
# green spill on edges: pull green down to the larger of red/blue
spill = fg & (g - np.maximum(r, b) > 35); a[..., 1] = np.where(spill, np.maximum(r, b) + 8, g)
rgba = np.dstack([a.astype(np.uint8), (fg * 255).astype(np.uint8)])
def runs(v, gap=1):
    out, on, last = [], False, -99
    for i, x in enumerate(v):
        if x and not on: on, s = True, i
        if not x and on: on = False; out.append([s, i])
    if on: out.append([s, len(v)])
    m = []
    for q in out:
        if m and q[0] - m[-1][1] < gap: m[-1][1] = q[1]
        else: m.append(q)
    return [q for q in m]
want = list(spec['main']['rows'].items()) + (list(spec['ball']['rows'].items()) if ball else [])
bands = [q for q in runs(fg.sum(1) > 0) if q[1] - q[0] > 12]
while len(bands) < len(want):  # two rows touching: split the tallest band at its emptiest line
    k = max(range(len(bands)), key=lambda i: bands[i][1] - bands[i][0]); s, e = bands[k]; p = fg[s:e].sum(1); lo, hi = int(len(p) * .3), int(len(p) * .7)
    cut = s + lo + int(np.argmin(p[lo:hi])); bands[k:k + 1] = [[s, cut], [cut + 1, e]]
assert len(bands) == len(want), (len(bands), len(want))
poses = []
for (row, n), (s, e) in zip(want, bands):
    cols = [q for q in runs(fg[s:e].sum(0) > 0, 9) if q[1] - q[0] > 14]
    while len(cols) > n:  # dust puffs and motion lines: join the closest neighbours
        k = min(range(len(cols) - 1), key=lambda i: cols[i + 1][0] - cols[i][1]); cols[k:k + 2] = [[cols[k][0], cols[k + 1][1]]]
    while len(cols) < n:  # two poses touching: split the widest blob at its thinnest column
        k = max(range(len(cols)), key=lambda i: cols[i][1] - cols[i][0]); c0, c1 = cols[k]; pc = fg[s:e, c0:c1].sum(0); lo, hi = int(len(pc) * .3), int(len(pc) * .7)
        cut = c0 + lo + int(np.argmin(pc[lo:hi])); cols[k:k + 1] = [[c0, cut], [cut + 1, c1]]
    assert len(cols) == n, (row, n, [c[1] - c[0] for c in cols])
    for c in cols:
        ys = np.where(fg[s:e, c[0]:c[1]].any(1))[0]; poses.append((row, c[0], s + ys[0], c[1], s + ys[-1] + 1))
def neck(box):
    x_0, y_0, x_1, y_1 = box; sub = a[y_0:y_1, x_0:x_1]; R, G, B = sub[..., 0], sub[..., 1], sub[..., 2]
    # the neck opening = a pink rim round a dark maroon inside: keep only pixels of one kind that touch the other
    F = fg[y_0:y_1, x_0:x_1]
    dark = (R > 40) & (R < 135) & (G < 42) & (B < 32) & (R - G > 30) & F
    pink = (R > 165) & (G > 85) & (G < 160) & (B > 80) & (B < 150) & (R - G > 45) & (abs(G - B) < 34) & F
    def grow(m, n=3):
        o = m.copy()
        for dy in range(-n, n + 1):
            for dx in range(-n, n + 1):
                o |= np.roll(np.roll(m, dy, 0), dx, 1)
        return o
    m = (pink & grow(dark)) | (dark & grow(pink, 2))
    if m.sum() < 6: return None
    ys, xs = np.where(m); mx, my = np.median(xs), np.median(ys); near = (abs(xs - mx) < 14) & (abs(ys - my) < 12)
    if near.sum() < 5: return None
    return x_0 + xs[near].mean(), y_0 + ys[near].mean()
first = poses[0]; nk = neck(first[1:]); assert nk, 'no neck opening found in the first pose'
main = spec['main']; h0 = main['heads'][list(main['rows'])[0]][0]
NECK = 9  # the neck opening sits this far under the face centre (frame px)
scale = RES * (main['foot'][1] - (h0['y'] + NECK)) / (first[4] - nk[1])
print('scale %.3f, %d poses' % (scale, len(poses)))
AIR = {'spring', 'fall', 'hurt', 'dead', 'fly', 'tired', 'hang'}
def build(sp, rowsel, key):
    fw, fh = sp['frame']; rows = list(sp['rows'].items()); cols = max(n for _, n in rows)
    sheet = Image.new('RGBA', (cols * fw * RES, len(rows) * fh * RES), (0, 0, 0, 0)); heads = {}
    for ri, (row, n) in enumerate(rows):
        heads[row] = []
        for f, p in enumerate([q for q in poses if q[0] == row and rowsel(q)]):
            _, bx0, by0, bx1, by1 = p; cut = Image.fromarray(rgba[by0:by1, bx0:bx1], 'RGBA')
            w, h = max(1, round((bx1 - bx0) * scale)), max(1, round((by1 - by0) * scale)); cut = cut.resize((w, h), Image.LANCZOS)
            al = np.asarray(cut)[..., 3]; cut.putalpha(Image.fromarray(((al > 110) * 255).astype(np.uint8)))
            hs = sp['heads'][row][f]; nkp = neck(p[1:]); cx, cy = f * fw * RES, ri * fh * RES
            if key == 'ball':
                side = min(h, w); px = cx + fw * RES // 2 - (w - side // 2) ; py = cy + fh * RES // 2 - h // 2
                heads[row].append([fw // 2, fh // 2])
            else:
                nx = (nkp[0] - bx0) * scale if nkp else w / 2; ny = (nkp[1] - by0) * scale if nkp else 0
                px = cx + round(hs['x'] * RES - nx)
                py = cy + (round((hs['y'] + NECK) * RES - ny) if row in AIR else sp['foot'][1] * RES - h)
                px = min(max(px, cx), cx + fw * RES - w) if w <= fw * RES else cx; py = min(max(py, cy), cy + fh * RES - h) if h <= fh * RES else cy
                heads[row].append([round((px - cx + nx) / RES, 1), round((py - cy + ny) / RES - NECK, 1)])
            sheet.alpha_composite(cut.crop((0, 0, min(w, fw * RES), min(h, fh * RES))), (px, py))
    return sheet, heads
mainrows = set(main['rows']); out = {}
sh, hd = build(main, lambda q: True, 'main'); sh.save(os.path.join(root, 'assets/sonic3', name + '.webp'), lossless=True, quality=100, method=6); out[name] = hd
if ball:
    sh2, hd2 = build(spec['ball'], lambda q: True, 'ball'); sh2.save(os.path.join(root, 'assets/sonic3', ball + '.webp'), lossless=True, quality=100, method=6); out[ball] = hd2
shutil.copy(src, os.path.join(root, 'assets/originals/sonic3', name + '-sheet' + os.path.splitext(src)[1]))
hp = os.path.join(root, 'src/data/sonic3Heads.js'); cur = {}
if os.path.exists(hp):
    m = re.search(r'const HEADS=(\{.*\});', open(hp).read(), re.S)
    if m: cur = json.loads(m.group(1))
cur.update(out)
open(hp, 'w').write("// Face spots measured on the imported sprite sheets by tools/sonic3/import-sheet.py: [x,y] of the face centre in frame px\n// per sheet, row and frame. Generated: re-run the import instead of editing.\nconst HEADS=" + json.dumps(cur, separators=(',', ':')) + ";\nObject.assign(exports,{HEADS});\n")
if opt('--preview'):
    pv = Image.new('RGBA', sh.size, (40, 60, 110, 255)); pv.alpha_composite(sh)
    from PIL import ImageDraw
    d = ImageDraw.Draw(pv); fw, fh = main['frame']
    for ri, (row, n) in enumerate(main['rows'].items()):
        for f in range(n):
            x, y = hd[row][f]; X, Y = (f * fw + x) * RES, (ri * fh + y) * RES; d.ellipse([X - 30, Y - 30, X + 30, Y + 30], outline=(255, 255, 0, 255))
    pv.save(opt('--preview'))
print('wrote', name, sh.size, ('+ ' + ball) if ball else '')
