#!/usr/bin/env python3
"""Import GPT's Seanic stage art (real alpha, drawn at 4x the game's pixels) into assets/sonic3/:
  python3 tools/sonic3/import-stage.py <folder with the PNGs>
Pictures are stored at 2x like every other Seanic picture (a box filter halves 4x pixel art exactly); the sheets (fish,
spike-log) keep 4x (sheet() works out the scale from the width). spike-log: each of the 4 frames (cells 8 game px taller than drawn) is moved so the log's
middle (its orange wood) sits in the middle of its cell, so the log doesn't jump as it turns. jungle-near is already 2x.
Originals go to assets/originals/sonic3/."""
import sys, os, shutil
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1]; OUT = os.path.join(ROOT, 'assets/sonic3'); ORIG = os.path.join(ROOT, 'assets/originals/sonic3')
HALVE = ['corkscrew-band', 'corkscrew-post', 'seesaw-plank', 'seesaw-base', 'seesaw-ball', 'chain-link', 'palm-2']
KEEP = ['fish', 'jungle-near']
def save(im, name): im.save(os.path.join(OUT, name + '.webp'), lossless=True, quality=100, method=6); print('wrote', name, im.size)
def find(name):
    for d in (SRC, os.path.join(SRC, 'zip')):
        p = os.path.join(d, name + '.png')
        if os.path.exists(p): return p
for n in HALVE + KEEP + ['spike-log']:
    p = find(n)
    if not p: print('missing', n); continue
    im = Image.open(p).convert('RGBA'); shutil.copy(p, os.path.join(ORIG, n + '.png'))
    if n in HALVE: save(im.resize((im.width // 2, im.height // 2), Image.BOX), n)
    elif n in KEEP: save(im, n)
    else:  # spike-log: 4 cells, each re-centred on the wood
        cw, ch = im.width // 4, im.height; CH = ch + 32; out = Image.new('RGBA', (im.width, CH), (0, 0, 0, 0))  # 8 game px taller so re-centred spikes aren't cut
        for k in range(4):
            c = im.crop((k * cw, 0, (k + 1) * cw, ch)); a = np.asarray(c).astype(int)
            wood = (a[..., 3] > 128) & (a[..., 0] > 150) & (a[..., 1] > 60) & (a[..., 1] < 180) & (a[..., 2] < 110)
            ys, xs = np.nonzero(wood); dx, dy = round(cw / 2 - (xs.min() + xs.max()) / 2), round(CH / 2 - (ys.min() + ys.max()) / 2)
            out.paste(c.transform((cw, CH), Image.AFFINE, (1, 0, -dx, 0, 1, -dy)), (k * cw, 0))
            print('  spike-log frame %d moved %+d,%+d' % (k, dx, dy))
        save(out, n)
