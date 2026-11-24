#!/usr/bin/env python3
"""Import THE WARRIORS radio DJ pictures (slots in src/data/warriorsDJ.js, brief docs/art-for-gpt/WARRIORS-ART.md section 5).

  python3 tools/warriors/import-dj.py <folder> [--shape wide|tall|fold] [--standin]

<folder> holds dj-<shape>.png (mouth closed) and dj-<shape>-small|ah|ee|oo|blink.png (the same picture with only the mouth
or eyes changed). Every frame is scaled to the main picture, lined up with it (GPT redraws a picture a few pixels off), and
only the part that changed is kept: assets/warriors/dj-<shape>-<frame>.webp + its box [x,y,w,h] written into
src/data/warriorsDJ.js. The main picture goes to assets/warriors/dj-<shape>.webp (lossless); originals to
assets/originals/warriors. --standin makes a drawn test set in <folder> first (to check the game end to end).
"""
import json, os, re, shutil, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DJ_JS = os.path.join(ROOT, 'src/data/warriorsDJ.js')
ASSETS = os.path.join(ROOT, 'assets/warriors'); ORIG = os.path.join(ROOT, 'assets/originals/warriors')
src = open(DJ_JS).read()
DJ = json.loads(re.search(r'/\*@@DJ\*/(.*?)/\*@@\*/', src, re.S).group(1))

def blur(a, r):
    """box blur of a 2d array, radius r (separable running sums)"""
    if r < 1: return a
    k = 2 * r + 1
    p = np.pad(a, r, mode='edge').astype(np.float64)
    c = np.cumsum(np.cumsum(p, 0), 1); c = np.pad(c, ((1, 0), (1, 0)))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)

def shift_of(a, b):
    """integer (dy, dx) that moves b onto a, by phase correlation on a small grey copy"""
    s = 4
    A = np.asarray(Image.fromarray(a).convert('L').resize((a.shape[1] // s, a.shape[0] // s)), np.float64)
    B = np.asarray(Image.fromarray(b).convert('L').resize((a.shape[1] // s, a.shape[0] // s)), np.float64)
    F = np.fft.fft2(A - A.mean()) * np.conj(np.fft.fft2(B - B.mean()))
    r = np.fft.ifft2(F / (np.abs(F) + 1e-9)).real
    dy, dx = np.unravel_index(np.argmax(r), r.shape)
    if dy > r.shape[0] // 2: dy -= r.shape[0]
    if dx > r.shape[1] // 2: dx -= r.shape[1]
    return int(dy * s), int(dx * s)

def refine(A, B, dy, dx, g):
    """the shift to the exact pixel: try +-5 px round (dy, dx), compared on the face area (mouth and eyes left out)"""
    fx, fy, rx, ry = g['face']; H, W = A.shape[:2]
    x0, x1, y0, y1 = int(max(8, fx - rx * 2)), int(min(W - 8, fx + rx * 2)), int(max(8, fy - ry * 1.6)), int(min(H - 8, fy + ry * 1.8))
    a = A[y0:y1, x0:x1].astype(np.int16).mean(2); keep = np.ones(a.shape, bool)
    for k in ('mouth', 'eyes'):
        bx, by, bw, bh = g[k]; keep[max(0, int(by - bh) - y0):int(by + bh * 2) - y0, max(0, int(bx - bw * .5) - x0):int(bx + bw * 1.5) - x0] = False
    best = None
    for ddy in range(-5, 6):
        for ddx in range(-5, 6):
            b = roll(B, dy + ddy, dx + ddx)[y0:y1, x0:x1].astype(np.int16).mean(2)
            e = np.abs(a - b)[keep].mean()
            if best is None or e < best[0]: best = (e, dy + ddy, dx + ddx)
    return best[1], best[2]

def roll(img, dy, dx):
    return np.roll(np.roll(img, dy, 0), dx, 1)

def standin(folder, shape):
    """a drawn stand-in set: dark studio, a plain face, mouths drawn per frame (shifted a little like GPT would)"""
    g = DJ['guide'][shape]; W, H = g['size']; fx, fy, rx, ry = g['face']; mx, my, mw, mh = g['mouth']; ex, ey, ew, eh = g['eyes']
    def make(frame, off):
        im = Image.new('RGB', (W, H), (16, 10, 20)); d = ImageDraw.Draw(im)
        d.rectangle((W * .05, H * .2, W * .35, H * .5), fill=(20, 30, 60))
        d.rounded_rectangle((W * .06, H * .1, W * .06 + 220, H * .1 + 70), 10, fill=(220, 30, 50))
        d.ellipse((fx - rx * 1.9, fy + ry * .9, fx + rx * 1.9, fy + ry * 3.2), fill=(90, 30, 60))
        d.ellipse((fx - rx, fy - ry, fx + rx, fy + ry), fill=(150, 100, 80))
        d.ellipse((fx - rx * 1.05, fy - ry * 1.1, fx + rx * 1.05, fy - ry * .2), fill=(30, 18, 14))
        for k in (.3, .7):
            cx = ex + ew * k
            if frame == 'blink': d.line((cx - 30, ey + eh / 2, cx + 30, ey + eh / 2), fill=(30, 18, 14), width=8)
            else: d.ellipse((cx - 26, ey + eh / 2 - 14, cx + 26, ey + eh / 2 + 14), fill=(250, 250, 245)); d.ellipse((cx - 10, ey + eh / 2 - 10, cx + 10, ey + eh / 2 + 10), fill=(40, 25, 20))
        o = {'closed': .08, 'blink': .08, 'small': .35, 'ah': 1, 'ee': .45, 'oo': .8}[frame]
        w = mw * (.5 if frame == 'oo' else .95 if frame == 'ee' else .8); h = mh * o
        cx, cy = mx + mw / 2, my + mh / 2
        d.ellipse((cx - w / 2, cy - h / 2 - 4, cx + w / 2, cy + h / 2 + 4), fill=(190, 40, 70))
        if o > .2: d.ellipse((cx - w / 2 + 10, cy - h / 2 + 4, cx + w / 2 - 10, cy + h / 2 - 4), fill=(40, 10, 20))
        im = im.filter(ImageFilter.GaussianBlur(1))
        im = Image.fromarray(roll(np.asarray(im), *off))
        im.save(os.path.join(folder, f'dj-{shape}{"" if frame == "closed" else "-" + frame}.png'))
    make('closed', (0, 0))
    for i, f in enumerate(DJ['frames']): make(f, (((i % 3) - 1) * 3, ((i % 2) * 2 - 1) * 2))

def run(folder, shape):
    g = DJ['guide'][shape]; W, H = g['size']
    base_p = os.path.join(folder, f'dj-{shape}.png')
    if not os.path.exists(base_p): return False
    base = Image.open(base_p).convert('RGB')
    if base.size != (W, H): print(f'  dj-{shape}: {base.size} scaled to {W}x{H}'); base = base.resize((W, H), Image.LANCZOS)
    A = np.asarray(base)
    os.makedirs(ORIG, exist_ok=True)
    base.save(os.path.join(ASSETS, f'dj-{shape}.webp'), lossless=True, quality=100, method=6)
    shutil.copy(base_p, os.path.join(ORIG, f'dj-{shape}.png'))
    boxes = DJ['box'].setdefault(shape, {})
    for frame in DJ['frames']:
        p = os.path.join(folder, f'dj-{shape}-{frame}.png')
        if not os.path.exists(p): print(f'  dj-{shape}-{frame}: missing'); continue
        im = Image.open(p).convert('RGB')
        if im.size != (W, H): im = im.resize((W, H), Image.LANCZOS)
        B = np.asarray(im)
        dy, dx = shift_of(A, B); dy, dx = refine(A, B, dy, dx, g); B = roll(B, dy, dx)
        diff = blur(np.abs(A.astype(np.int16) - B.astype(np.int16)).mean(2), max(2, W // 400))
        gx, gy, gw, gh = g['eyes' if frame == 'blink' else 'mouth']
        # look round the guide box (2.4x), not over the whole picture (GPT also changes stray pixels elsewhere)
        cx, cy = gx + gw / 2, gy + gh / 2
        x0, x1 = int(max(0, cx - gw * 1.2)), int(min(W, cx + gw * 1.2)); y0, y1 = int(max(0, cy - gh * 1.6)), int(min(H, cy + gh * 1.6))
        outside = np.percentile(diff, 90)
        thr = max(14.0, outside * 2.0)
        m = diff[y0:y1, x0:x1] > thr
        if not m.any(): print(f'  dj-{shape}-{frame}: nothing changed round the guide box (threshold {thr:.0f})'); continue
        ys, xs = np.nonzero(m)
        bx0, bx1, by0, by1 = xs.min() + x0, xs.max() + x0, ys.min() + y0, ys.max() + y0
        px, py = int((bx1 - bx0) * .25) + 8, int((by1 - by0) * .3) + 8
        bx0, by0, bx1, by1 = max(0, bx0 - px), max(0, by0 - py), min(W, bx1 + px), min(H, by1 + py)
        crop = B[by0:by1, bx0:bx1]
        h, w = crop.shape[:2]
        # feathered edges: fully the new frame in the middle, fading to the main picture at the box edge
        fy_ = np.minimum(np.arange(h), np.arange(h)[::-1]) / max(1, py * .8)
        fx_ = np.minimum(np.arange(w), np.arange(w)[::-1]) / max(1, px * .8)
        a = (np.clip(fy_, 0, 1)[:, None] * np.clip(fx_, 0, 1)[None, :]) ** .8
        rgba = np.dstack([crop, (a * 255).astype(np.uint8)])
        Image.fromarray(rgba, 'RGBA').save(os.path.join(ASSETS, f'dj-{shape}-{frame}.webp'), lossless=True, quality=100, method=6)
        shutil.copy(p, os.path.join(ORIG, f'dj-{shape}-{frame}.png'))
        boxes[frame] = [int(bx0), int(by0), int(w), int(h)]
        print(f'  dj-{shape}-{frame}: shift {dy},{dx}  box {boxes[frame]}')
    return True

args = [a for a in sys.argv[1:] if not a.startswith('--')]
if not args: print(__doc__); sys.exit(1)
folder = args[0]
shapes = [sys.argv[sys.argv.index('--shape') + 1]] if '--shape' in sys.argv else list(DJ['guide'])
if '--standin' in sys.argv:
    os.makedirs(folder, exist_ok=True)
    for sh in shapes: standin(folder, sh)
done = [sh for sh in shapes if run(folder, sh)]
txt = re.sub(r'\[\s*([-\d,\s"a-z]*?)\s*\]', lambda m: '[' + re.sub(r'\s+', '', m.group(1)) + ']', json.dumps(DJ, indent=1))
open(DJ_JS, 'w').write(re.sub(r'/\*@@DJ\*/.*?/\*@@\*/', lambda m: '/*@@DJ*/' + txt + '/*@@*/', src, flags=re.S))
print('imported', done or 'nothing')
