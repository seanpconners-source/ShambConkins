#!/usr/bin/env python3
"""THE WARRIORS wall layers with see-through tops (owner, Nov 24: "most of the middle and top backgrounds don't look good
together... remake the middle ones so they have tops with transparency so they don't just cut off against the top background").

Each wall-<name> picture (the band right above the floor line, drawn over the far layer) gets an alpha channel:
  - sky cut out: open sky reached from the top edge (smooth pixels close to the sky colour) becomes see-through, so the far
    layer's sky and skyline show above roofs, fences and trees;
  - a soft, uneven fade at the top so whatever is left (tree tops, building fronts) melts into the far layer instead of
    ending in a straight line. The uneven edge repeats every picture width, so the tiles still join.
Reads assets/originals/warriors/wall-<name>.png, writes assets/warriors/wall-<name>.webp (lossless RGBA).
  python3 tools/warriors/wall-tops.py [name ...] [--preview out.png]
--preview draws far + wall + floor the way the game stacks them (scenes.js drawArea), before and after, one row per picture.
"""
import glob, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ORIG = os.path.join(ROOT, 'assets/originals/warriors'); OUT = os.path.join(ROOT, 'assets/warriors')
# per picture: sky = cut out open sky from the top; fade = height of the top fade (fraction of the picture);
# wob = how uneven the fade's edge is (fraction of the fade); tol = sky colour tolerance
CFG = {
 'beach':       dict(sky=True,  fade=.30, wob=.5),
 'countryside': dict(sky=True,  fade=.20, wob=.5, tol=60),
 'desert':      dict(sky=False, fade=.22, wob=.4),
 'digital':     dict(sky=False, fade=.30, wob=.3),
 'forest':      dict(sky=False, fade=.62, wob=.6),
 'funhouse':    dict(sky=False, fade=.22, wob=.4),
 'gotham':      dict(sky=False, fade=.34, wob=.4),
 'gothic':      dict(sky=False, fade=.30, wob=.4),
 'graveyard':   dict(sky=True,  fade=.30, wob=.5, tol=34),
 'jungle':      dict(sky=False, fade=.62, wob=.6),
 'lava':        dict(sky=False, fade=.40, wob=.6),
 'mountains':   dict(sky=True,  fade=.22, wob=.4, tol=60),
 'nyc':         dict(sky=False, fade=.36, wob=.45),
 'snow':        dict(sky=True,  fade=.24, wob=.4, tol=34),
 'space':       dict(sky=False, fade=.30, wob=.3),
 'stage':       dict(sky=False, fade=.30, wob=.3),
 'suburb':      dict(sky=False, fade=.34, wob=.5),
 'themepark':   dict(sky=True,  fade=.24, wob=.4, tol=30),
}

def smooth(e0, e1, v):
    t = np.clip((v - e0) / np.maximum(1e-6, e1 - e0), 0, 1); return t * t * (3 - 2 * t)

def wobble(W, seed):
    """an uneven edge that repeats every W pixels (whole-number periods), 0..1"""
    r = np.random.default_rng(seed); x = np.arange(W) / W * 2 * np.pi; v = np.zeros(W)
    for k, a in ((2, .5), (3, .35), (5, .3), (9, .2), (17, .12), (31, .08)):
        v += a * np.sin(k * x + r.uniform(0, 6.3))
    return (v - v.min()) / (v.max() - v.min())

def sky_mask(rgb, tol):
    """open sky joined to the top edge: smooth and near the colour of the top rows (per column band)"""
    H, W = rgb.shape[:2]; f = rgb.astype(np.float64)
    L = f.mean(2); g = np.hypot(ndimage.sobel(ndimage.gaussian_filter(L, 1.2), 0), ndimage.sobel(ndimage.gaussian_filter(L, 1.2), 1))
    # sky colour per column: the median of the top rows, smoothed sideways (wrapping: the picture tiles)
    top = np.median(f[:max(3, H // 40)], axis=0)
    top = ndimage.uniform_filter1d(top, size=max(9, W // 16), axis=0, mode='wrap')
    # the sky gets lighter or darker down to the horizon: compare against the colour a little above, row by row
    ref = np.repeat(top[None], H, 0)
    near = np.sqrt(((f - ref) ** 2).sum(2)) < tol + np.linspace(0, tol * .8, H)[:, None]
    cand = near & (g < 22)
    lab, n = ndimage.label(cand)
    seeds = np.unique(lab[0][lab[0] > 0])
    m = np.isin(lab, seeds)
    # fill pin-holes (stars, a lit window in the far haze), then grow back off the edges a touch
    m = ndimage.binary_closing(m, iterations=2) & ~ndimage.binary_opening(~m, iterations=1) | m
    m = ndimage.binary_fill_holes(m | np.pad(np.ones((1, W), bool), ((0, H - 1), (0, 0))))
    return m

def process(name):
    c = CFG.get(name, dict(sky=False, fade=.3, wob=.4))
    src = os.path.join(ORIG, f'wall-{name}.png')
    if not os.path.exists(src): src = os.path.join(OUT, f'wall-{name}.webp')
    im = Image.open(src).convert('RGB'); rgb = np.asarray(im); H, W = rgb.shape[:2]
    a = np.ones((H, W))
    if c['sky']:
        m = sky_mask(rgb, c.get('tol', 40))
        # never cut below the lower 45% (the wall's foot stays solid)
        m[int(H * .55):] = False
        soft = ndimage.gaussian_filter(m.astype(np.float64), 2.2)
        a = np.minimum(a, 1 - np.clip(soft * 1.4, 0, 1))
    F = c['fade'] * H; wv = wobble(W, sum(map(ord, name))) * c['wob'] * F
    y = np.arange(H)[:, None]
    a = a * smooth(wv[None, :] * .6, wv[None, :] * .6 + F, y)
    out = np.dstack([rgb, (np.clip(a, 0, 1) * 255).astype(np.uint8)])
    return Image.fromarray(out, 'RGBA'), im

def stack(far, wall, floor, VW=700, K=1.4):
    """far + wall + floor like scenes.js drawArea (BACK 210, FRONT 340, camX 300)"""
    BACK, FRONT = 210, 340; cv = Image.new('RGBA', (int(VW * K), int(300 * K)), (0, 0, 0, 255))
    def tile(img, par, y, h):
        w = h * img.width / img.height; o = (300 * par) % w
        sc = img.resize((max(1, int(w * K) + 1), max(1, int(h * K))))
        X = -o
        while X < VW: cv.alpha_composite(sc, (int(X * K), int(y * K))) if 0 <= int(y * K) else cv.alpha_composite(sc.crop((0, -int(y * K), sc.width, sc.height)), (int(X * K), 0)); X += w
    tile(far.convert('RGBA'), .25, -40, BACK * .8 + 40)
    tile(wall.convert('RGBA'), 1, BACK * .46, BACK * .54)
    tile(floor.convert('RGBA'), 1, BACK, FRONT - BACK + 60)
    return cv.crop((0, int(10 * K), cv.width, int(260 * K)))

args = [a for a in sys.argv[1:] if not a.startswith('--') and not a.endswith('.png')]
names = args or [os.path.basename(f)[5:-5] for f in sorted(glob.glob(os.path.join(OUT, 'wall-*.webp')))]
prev = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
rows = []
for n in names:
    new, old = process(n)
    if not prev or '--write' in sys.argv:
        new.save(os.path.join(OUT, f'wall-{n}.webp'), lossless=True, quality=100, method=6)
    if prev:
        far = Image.open(os.path.join(OUT, f'far-{n}.webp')); floor = Image.open(os.path.join(OUT, f'floor-{n}.webp'))
        a, b = stack(far, old, floor), stack(far, new, floor)
        row = Image.new('RGB', (a.width * 2 + 8, a.height), (255, 0, 255)); row.paste(a.convert('RGB'), (0, 0)); row.paste(b.convert('RGB'), (a.width + 8, 0)); rows.append(row)
    print('wall-' + n, 'ok')
if prev and rows:
    sheet = Image.new('RGB', (rows[0].width, sum(r.height + 6 for r in rows)), (255, 0, 255)); y = 0
    for r in rows: sheet.paste(r, (0, y)); y += r.height + 6
    sheet.save(prev)
