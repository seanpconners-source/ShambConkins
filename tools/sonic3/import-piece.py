#!/usr/bin/env python3
"""Import a head piece (the hedgehog's quills, the fox's ears): a picture on flat green with an empty round hole where
the face goes. Keys out the green (the hole too), finds the hole (the green area the art closes off), scales the piece
so the hole is HOLE px across in the game and saves it with the hole's centre in the middle of the picture, at 2x.
  python3 tools/sonic3/import-piece.py <picture> <quills-p1|ears-p2> [--hole 22]"""
import sys, os, shutil
import numpy as np
from PIL import Image
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src, name = sys.argv[1], sys.argv[2]; HOLE = float(sys.argv[sys.argv.index('--hole') + 1]) if '--hole' in sys.argv else 22; RES = 2
a = np.asarray(Image.open(src).convert('RGB')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
bg = (g > 150) & (g - r > 70) & (g - b > 70)
k = 4; small = bg[::k, ::k]; seen = np.zeros_like(small); H, W = small.shape  # flood the outside green from the border
stack = [(y, x) for y in range(H) for x in (0, W - 1)] + [(y, x) for x in range(W) for y in (0, H - 1)]
while stack:
    y, x = stack.pop()
    if y < 0 or x < 0 or y >= H or x >= W or seen[y, x] or not small[y, x]: continue
    seen[y, x] = True; stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
hole = small & ~seen; ys, xs = np.where(hole); assert len(ys) > 50, 'no closed hole found'
cx, cy, dia = xs.mean() * k + k / 2, ys.mean() * k + k / 2, 2 * np.sqrt(len(ys) / np.pi) * k
spill = ~bg & (g - np.maximum(r, b) > 35); a[..., 1] = np.where(spill, np.maximum(r, b) + 8, g)
rgba = Image.fromarray(np.dstack([a.astype(np.uint8), (~bg * 255).astype(np.uint8)]), 'RGBA')
fy, fx = np.where(~bg); half = max(cx - fx.min(), fx.max() - cx, cy - fy.min(), fy.max() - cy) + 4
sq = Image.new('RGBA', (int(2 * half), int(2 * half)), (0, 0, 0, 0)); sq.alpha_composite(rgba, (int(half - cx), int(half - cy)))
sc = HOLE * RES / dia; n = max(2, round(2 * half * sc)); out = sq.resize((n, n), Image.LANCZOS)
al = np.asarray(out)[..., 3]; out.putalpha(Image.fromarray(((al > 110) * 255).astype(np.uint8)))
out.save(os.path.join(root, 'assets/sonic3', name + '.webp'), lossless=True, quality=100, method=6)
shutil.copy(src, os.path.join(root, 'assets/originals/sonic3', name + os.path.splitext(src)[1]))
print('wrote', name, out.size, 'hole %.0f px in the picture -> %g px in the game' % (dia, HOLE))
