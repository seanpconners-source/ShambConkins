#!/usr/bin/env python3
"""Import the owner's Simon pictures (brief docs/art-for-gpt/SIMON-ART.md, slots src/engines/simonArt.js).

  python3 tools/simon/import.py <picture> <slot> [--preview out.png]
    slot = simon-dim | simon-green | simon-red | simon-yellow | simon-blue | bg | bg-wide

Toy pictures: the background (transparent, or flat green #00FF00, or a flat light colour) is keyed out, the toy's round body
is found (largest blob: its bounding box gives centre + radius) and the picture is scaled/moved so the body is the template
circle (radius 481 px, centred on 1024x1024). Every toy picture is fitted on its own, so a lit picture that came back a
little bigger or shifted still lines up with simon-dim. Backgrounds: cover-cropped to 1080x1920 / 1920x1080.
Saved lossless to assets/simon/<slot>.webp, the original copied to assets/originals/simon/<slot>.<ext>.
"""
import sys, os, shutil
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TEMPLATE, BODY = 1024, 481
TOYS = {'simon-dim', 'simon-green', 'simon-red', 'simon-yellow', 'simon-blue'}
BGS = {'bg': (1080, 1920), 'bg-wide': (1920, 1080)}


def key_out(im):
    a = np.asarray(im.convert('RGBA')).astype(np.int32)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    if (al < 250).mean() > .05:            # already transparent
        return al > 40, a
    green = (g > 150) & (r < 90) & (b < 90) & (g - r > 90)
    if green.mean() > .05:
        a[..., 3] = np.where(green, 0, 255)
        # green spill on the edge: pull g down to max(r,b)
        edge = ~green
        a[..., 1] = np.where(edge, np.minimum(g, np.maximum(r, b) + 20), g)
        return ~green, a
    # flat background: colour of the corners
    corners = np.concatenate([a[:8, :8, :3].reshape(-1, 3), a[:8, -8:, :3].reshape(-1, 3), a[-8:, :8, :3].reshape(-1, 3), a[-8:, -8:, :3].reshape(-1, 3)])
    bgc = np.median(corners, 0)
    far = np.abs(a[..., :3] - bgc).sum(-1) > 60
    a[..., 3] = np.where(far, 255, 0)
    return far, a


def largest_blob_box(mask):
    # cheap: rows/cols that are mostly covered; the toy is by far the biggest thing in the picture
    ys, xs = np.nonzero(mask)
    if not len(xs):
        raise SystemExit('no toy found')
    rows = mask.sum(1); cols = mask.sum(0)
    rmax, cmax = rows.max(), cols.max()
    yy = np.nonzero(rows > rmax * .06)[0]; xx = np.nonzero(cols > cmax * .06)[0]
    return xx[0], yy[0], xx[-1], yy[-1]


def main():
    args = sys.argv[1:]
    prev = None
    if '--preview' in args:
        i = args.index('--preview'); prev = args[i + 1]; del args[i:i + 2]
    src, slot = args
    im = Image.open(src)
    os.makedirs(os.path.join(ROOT, 'assets/simon'), exist_ok=True)
    os.makedirs(os.path.join(ROOT, 'assets/originals/simon'), exist_ok=True)
    if slot in BGS:
        W, H = BGS[slot]; im = im.convert('RGB')
        k = max(W / im.width, H / im.height)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        l, t = (im.width - W) // 2, (im.height - H) // 2
        out = im.crop((l, t, l + W, t + H))
    elif slot in TOYS:
        mask, a = key_out(im)
        x0, y0, x1, y1 = largest_blob_box(mask)
        cx, cy, r = (x0 + x1) / 2, (y0 + y1) / 2, ((x1 - x0) + (y1 - y0)) / 4
        print(f'toy circle centre ({cx:.1f},{cy:.1f}) radius {r:.1f}  aspect {(x1 - x0) / max(1, y1 - y0):.3f}')
        k = BODY / r
        if im.size == (TEMPLATE, TEMPLATE) and abs(r - BODY) <= 1.5 and abs(cx - TEMPLATE / 2) <= 1.5 and abs(cy - TEMPLATE / 2) <= 1.5:
            k, cx, cy = 1.0, TEMPLATE / 2, TEMPLATE / 2      # already on the template: keep the pixels as delivered
        keyed = Image.fromarray(a.astype(np.uint8), 'RGBA')
        big = keyed.resize((round(keyed.width * k), round(keyed.height * k)), Image.LANCZOS)
        out = Image.new('RGBA', (TEMPLATE, TEMPLATE), (0, 0, 0, 0))
        if k == 1.0 and keyed.size == (TEMPLATE, TEMPLATE):
            out = keyed                                    # pasting would re-blend the soft edge's alpha
        else:
            out.paste(big, (round(TEMPLATE / 2 - cx * k), round(TEMPLATE / 2 - cy * k)), big)
    else:
        raise SystemExit('unknown slot ' + slot)
    dst = os.path.join(ROOT, 'assets/simon', slot + '.webp')
    out.save(dst, 'WEBP', lossless=True, quality=100, method=6)
    ext = os.path.splitext(src)[1].lower() or '.png'
    shutil.copyfile(src, os.path.join(ROOT, 'assets/originals/simon', slot + ext))
    print('saved', dst, out.size)
    if prev:
        p = out.convert('RGBA')
        if slot in TOYS:
            from PIL import ImageDraw
            d = ImageDraw.Draw(p); c = TEMPLATE / 2
            d.ellipse((c - BODY, c - BODY, c + BODY, c + BODY), outline=(255, 0, 0, 255), width=3)
        p.save(prev)


if __name__ == '__main__':
    main()
