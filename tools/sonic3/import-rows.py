#!/usr/bin/env python3
"""Import single-row strips for the Seanic runners that GPT draws at the packed sheets' own size (192x160 cells = the
96x80 frame at 2x, same body scale, flat #00FF00): new rows for an existing sheet, or the corkscrew sheets.

  python3 tools/sonic3/import-rows.py row <strip> <runner-p1|runner-p2> <row> [--skip 1] [--tpl <png> x y]
      paste the strip's cells (after --skip calibration cells) over that row of assets/sonic3/<sheet>.webp and measure the
      neck ring in each cell (template = the ring at x,y in cell 0 of the strip, or of --tpl) -> face spots in sonic3Heads.js
  python3 tools/sonic3/import-rows.py cork <strip> <cork-p1|cork-p2>
      the 12-frame barrel roll on a corkscrew -> assets/sonic3/<cork-pN>.webp + the face spots from CORK below
      (read off gridded zooms: the template match lands on a shoe in some foreshortened frames)

Face spot = the neck ring's centre moved NECK frame px out along the neck (the importer's rule), with the ring's turn.
Originals are copied to assets/originals/sonic3/."""
import sys, os, re, json, math, shutil
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CELL = (192, 160); RES = 2; NECK = 9
ROWS = {'runner-p1': ['stand', 'wait', 'lookUp', 'crouch', 'walk', 'run', 'dash', 'skid', 'push', 'balance', 'spring', 'fall', 'hurt', 'hang', 'win', 'dead'],
        'runner-p2': ['stand', 'wait', 'lookUp', 'crouch', 'walk', 'run', 'dash', 'skid', 'push', 'balance', 'spring', 'fall', 'hurt', 'hang', 'win', 'dead', 'fly', 'tired']}
# corkscrew rings, cell px at 2x: [x, y, turn in degrees counter-clockwise from upright] or None = the neck faces away
# (seen from below / from behind): no face drawn in that frame
CORK = {'cork-p1': [[98.5, 57.5, 0], [103.5, 59.5, 340], [108.5, 62.5, 320], None, None, [92.5, 100.5, 170], [95.5, 103.5, 190],
                    [87.5, 97.5, 135], [87.5, 99.5, 170], [96.5, 100.5, 190], [103.5, 58.5, 350], [99.5, 56.5, 0]],
        'cork-p2': [[111.5, 62.5, 0], [116.5, 60.5, 340], [115.5, 60.5, 350], [104.5, 61.5, 0], [100.5, 59.5, 10], None,
                    [107.5, 101.5, 190], [115.0, 95.0, 225], [103.5, 96.5, 250], None, [110.5, 58.5, 0], [112.5, 61.5, 0]]}

def keyed(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bg = (g > 150) & (g - r > 70) & (g - b > 70); fg = ~bg
    spill = fg & (g - np.maximum(r, b) > 35); a[..., 1] = np.where(spill, np.maximum(r, b) + 8, g)
    return a, Image.fromarray(np.dstack([a.astype(np.uint8), (fg * 255).astype(np.uint8)]), 'RGBA')

def ring(a, f, tpl, angles=range(0, 360, 15), hw=10, hh=7):
    """best match of the ring template (33x33 around the ring) in cell f: (x, y, angle, ssd) in cell px"""
    big = Image.fromarray(tpl.astype(np.uint8)); sub = a[:, f * CELL[0]:(f + 1) * CELL[0]].astype(float); best = None
    for ang in angles:
        t = np.asarray(big.rotate(ang, resample=Image.BICUBIC)).astype(float)
        t = t[16 - hh:16 + hh + 1, 16 - hh:16 + hh + 1] if 45 < ang % 180 < 135 else t[16 - hh:16 + hh + 1, 16 - hw:16 + hw + 1]
        th, tw = t.shape[:2]; H, W = sub.shape[0] - th + 1, sub.shape[1] - tw + 1; ssd = np.zeros((H, W))
        for dy in range(th):
            for dx in range(tw): ssd += ((sub[dy:dy + H, dx:dx + W] - t[dy, dx]) ** 2).sum(2)
        ssd /= th * tw * 3; yy, xx = np.unravel_index(np.argmin(ssd), ssd.shape)
        if best is None or ssd[yy, xx] < best[3]: best = (xx + tw / 2, yy + th / 2, ang, ssd[yy, xx])
    return best

def face(x, y, ang):
    """ring (cell px, CCW degrees) -> face centre [x, y, canvas turn in radians] in frame px"""
    t = math.radians(ang); fx, fy = x / RES - NECK * math.sin(t), y / RES - NECK * math.cos(t)
    return [round(fx, 1), round(fy, 1), round(-t if ang <= 180 else 2 * math.pi - t, 2) if ang else 0]

def heads(update):
    hp = os.path.join(ROOT, 'src/data/sonic3Heads.js'); src = open(hp).read(); m = re.search(r'const HEADS=(\{.*\});', src, re.S)
    cur = json.loads(m.group(1)); update(cur)
    open(hp, 'w').write(src[:m.start(1)] + json.dumps(cur, separators=(',', ':')) + src[m.end(1):])

def save(img, name):
    img.save(os.path.join(ROOT, 'assets/sonic3', name + '.webp'), lossless=True, quality=100, method=6)

mode, strip = sys.argv[1], sys.argv[2]
opt = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
a, rgba = keyed(strip); n = rgba.width // CELL[0]
if mode == 'row':
    sheet, row = sys.argv[3], sys.argv[4]; skip = int(opt('--skip', 0))
    if '--tpl' in sys.argv:
        i = sys.argv.index('--tpl'); ta, _ = keyed(sys.argv[i + 1]); tx, ty = float(sys.argv[i + 2]), float(sys.argv[i + 3])
    else: ta, tx, ty = a, float(sys.argv[-2]), float(sys.argv[-1])
    tpl = ta[int(ty) - 16:int(ty) + 17, int(tx) - 16:int(tx) + 17]
    path = os.path.join(ROOT, 'assets/sonic3', sheet + '.webp'); sh = Image.open(path).convert('RGBA'); ri = ROWS[sheet].index(row)
    spots = []
    for k in range(skip, n):
        c = rgba.crop((k * CELL[0], 0, (k + 1) * CELL[0], CELL[1])); fx, fy = (k - skip) * CELL[0], ri * CELL[1]
        sh.paste(Image.new('RGBA', CELL, (0, 0, 0, 0)), (fx, fy)); sh.alpha_composite(c, (fx, fy))
        x, y, ang, s = ring(a, k, tpl); spots.append(face(x, y, ang)[:2] if not ang else face(x, y, ang)); print('  %s %d ring %.1f,%.1f %d deg (ssd %.0f)' % (row, k - skip, x, y, ang, s))
    save(sh, sheet); heads(lambda cur: cur.setdefault(sheet, {}).__setitem__(row, spots))
    shutil.copy(strip, os.path.join(ROOT, 'assets/originals/sonic3', os.path.basename(strip)))
    print('wrote', sheet, row, len(spots), 'frames')
elif mode == 'cork':
    name = sys.argv[3]; assert n == 12, n
    save(rgba, name); spots = [face(*r) if r else None for r in CORK[name]]
    heads(lambda cur: cur.__setitem__(name, {'cork': spots}))
    shutil.copy(strip, os.path.join(ROOT, 'assets/originals/sonic3', name + '.png'))
    print('wrote', name, rgba.size, sum(1 for s in spots if s), 'faces')
