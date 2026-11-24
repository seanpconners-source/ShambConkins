#!/usr/bin/env python3
"""Measure where the head goes on every cell of THE WARRIORS fighter sheets (owner, Nov 24: heads floating all over, above
the neck, beside bodies lying on the ground). The sheets are headless; the game used to put the face where our own drawn
skeleton has its head (src/engines/dd/body.js), which is not where GPT drew the neck.

For each cell: the template's neck/head (joints.json from body.js) is the first guess; then we look for the spot where a
head fits on this drawing: a circle (the face size) that is EMPTY inside and touches the body on one side only (the neck),
close to the guess. The neck point = middle of the body pixels where the circle touches; the head direction = neck -> circle
centre. Result: src/data/ddNecks.js NECKS[sheet][pose] = [neckX, neckY, headX, headY] in cell px.
  python3 tools/warriors/measure-necks.py joints.json [--preview dir] [sheet ...]
FIX below = hand-read spots for cells the search gets wrong (checked on the preview sheets).
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CELL, R = 256, 20          # face circle radius in cell px (the game's face is ~FACE_W 15 units = 30 px wide + hair)
FIX = {}                   # 'sheet:pose': [nx, ny, hx, hy]

def measure(cell, guess_n, guess_h, pose=''):
    """the torso = the thickest part of the body; its long axis points at the neck from the end with little body past it
    (the legs carry on past the hips, at most an arm past the shoulders)"""
    body = ndimage.binary_opening(cell[..., 3] > 40, iterations=1)
    if body.sum() < 200: return None
    H, W = body.shape
    inner = ndimage.distance_transform_edt(body)
    core = inner >= inner.max() * .5
    lab, n = ndimage.label(core)
    if n > 1:
        sizes = ndimage.sum(core, lab, range(1, n + 1)); core = lab == (1 + int(np.argmax(sizes)))
    ys, xs = np.nonzero(core)
    c = np.array([xs.mean(), ys.mean()])
    P = np.stack([xs - c[0], ys - c[1]])
    w, v = np.linalg.eigh(P @ P.T); a = v[:, np.argmax(w)]
    by, bx = np.nonzero(body); Q = np.stack([bx - c[0], by - c[1]])
    along = a @ Q; lat = np.array([-a[1], a[0]]) @ Q
    proj = a @ P; lo, hi = proj.min(), proj.max()
    beyond_hi = ((along > hi + 6) & (np.abs(lat) < 70)).sum(); beyond_lo = ((along < lo - 6) & (np.abs(lat) < 70)).sum()
    tu = np.array(guess_h, float) - np.array(guess_n, float); tu /= (np.linalg.norm(tu) or 1)
    # +: the hi end is the neck. Body past an end (legs) says hips; the template's head direction breaks close calls
    vote = np.log((beyond_lo + 60) / (beyond_hi + 60)) + .9 * float(a @ tu)
    if vote < 0: a, lo, hi = -a, -hi, -lo
    # rules from the sheets: lying flat = head at the LEFT end (every sheet lies head-left, feet on the cell's foot point at
    # the right); standing poses never have the head below the middle of the body
    if pose == 'down' and a[0] > 0: a, lo, hi = -a, -hi, -lo
    if pose not in ('down', 'fall', 'dizzy') and (c + a * hi)[1] > by.mean(): a, lo, hi = -a, -hi, -lo
    # walk from the core's neck end along the axis until the body stops (through the neck stump)
    e = c + a * hi; last = e.copy()
    for t in range(0, 16):
        p = e + a * t; xi, yi = int(round(p[0])), int(round(p[1]))
        if not (0 <= xi < W and 0 <= yi < H): break
        win = body[max(0, yi - 2):yi + 3, max(0, xi - 2):xi + 3]
        if win.any(): last = p
        elif t > 3: break
    neck = last
    # dizzy: bent over, the head hangs forward and down off the shoulders
    if pose == 'dizzy':
        a = np.array([.82, .57]); neck = neck + np.array([4, 6])
    head = neck + a * R * .95
    return [int(round(neck[0])), int(round(neck[1])), int(round(head[0])), int(round(head[1]))]

def main():
    skip = {sys.argv[sys.argv.index('--preview') + 1]} if '--preview' in sys.argv else set()
    args = [a for a in sys.argv[1:] if not a.startswith('--') and a not in skip]
    joints = json.load(open(args[0])); only = args[1:]
    prev = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    out = {}
    for sheet, poses in joints.items():
        f = os.path.join(ROOT, 'assets/warriors', sheet + '.webp')
        if not os.path.exists(f) or (only and sheet not in only): continue
        im = np.asarray(Image.open(f).convert('RGBA')); res = {}
        canvas = Image.fromarray(im).convert('RGB') if prev else None; dr = ImageDraw.Draw(canvas) if prev else None
        for pose, j in poses.items():
            i = j['i']; ox, oy = (i % 8) * CELL, (i // 8) * CELL
            if oy + CELL > im.shape[0]: continue
            cell = im[oy:oy + CELL, ox:ox + CELL]
            r = FIX.get(f'{sheet}:{pose}') or measure(cell, j['neck'], j['head'], pose)
            if r is None: continue
            res[pose] = r
            if dr:
                nx, ny, hx, hy = r
                dr.ellipse((ox + hx - R, oy + hy - R, ox + hx + R, oy + hy + R), outline=(0, 255, 0), width=2)
                dr.rectangle((ox + nx - 3, oy + ny - 3, ox + nx + 3, oy + ny + 3), fill=(255, 0, 0))
                dr.text((ox + 4, oy + 4), pose, fill=(255, 255, 0))
        out[sheet] = res
        if prev: os.makedirs(prev, exist_ok=True); canvas.save(os.path.join(prev, f'necks-{sheet}.png'))
        print(sheet, len(res), 'cells')
    if prev and not '--write' in sys.argv: return
    old = {}
    p = os.path.join(ROOT, 'src/data/ddNecks.js')
    if os.path.exists(p):
        txt = open(p).read(); s = txt.index('/*@@*/') + 6; old = json.loads(txt[s:txt.index('/*@@end*/')])
    old.update(out)
    body = ',\n'.join(f' {json.dumps(k)}:' + json.dumps(v, separators=(',', ':')) for k, v in old.items())
    open(p, 'w').write(
        "// Where the head goes on each cell of THE WARRIORS fighter sheets: NECKS[sheet][pose] = [neckX, neckY, headX, headY] in\n"
        "// cell px (256 px cells, src/data/ddSprites.js). Measured from the art by tools/warriors/measure-necks.py (re-run it\n"
        "// after new sheet art); the game puts the chin on the neck and turns the face along neck -> head.\n"
        "const NECKS=/*@@*/{\n" + body + "\n}/*@@end*/;\nObject.assign(exports,{NECKS});\n")
    print('wrote', p)

main()
