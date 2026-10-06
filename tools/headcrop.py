#!/usr/bin/env python3
"""Turn a photo into a head cutout like the portraits supplied with the game.

  pip install opencv-python-headless numpy pillow
  python tools/headcrop.py photo.jpg --id chuck-norris
  python tools/headcrop.py a.jpg b.jpg c.jpg --id beatles-john beatles-paul beatles-george
  python tools/headcrop.py happy.jpg --id chuck-norris --mood win

It finds the largest face, grows the box to include hair and chin, removes the background
with GrabCut, and writes assets/portraits/<id>[.<mood>].webp (transparent, tight crop).
Then run `npm run build`. Use --no-cutout to crop only; --show to write a preview next to the output.
"""
import argparse, os, sys
import cv2, numpy as np

CASCADES = ['haarcascade_frontalface_default.xml', 'haarcascade_frontalface_alt2.xml', 'haarcascade_profileface.xml']

def find_face(gray):
    best = None
    for name in CASCADES:
        det = cv2.CascadeClassifier(cv2.data.haarcascades + name)
        for flip in (False, True):
            g = cv2.flip(gray, 1) if flip else gray
            faces = det.detectMultiScale(g, scaleFactor=1.08, minNeighbors=5, minSize=(max(40, gray.shape[1] // 14),) * 2)
            for (x, y, w, h) in faces:
                if flip: x = gray.shape[1] - x - w
                if best is None or w * h > best[2] * best[3]: best = (x, y, w, h)
        if best: return best
    return None

def head_rect(face, shape):
    x, y, w, h = face; H, W = shape[:2]
    cx = x + w / 2
    nw, nh = w * 1.75, h * 2.0
    top = y - h * .62
    x0, y0 = int(max(0, cx - nw / 2)), int(max(0, top))
    x1, y1 = int(min(W, cx + nw / 2)), int(min(H, top + nh))
    return x0, y0, x1 - x0, y1 - y0

def head_mask(shape, face):
    x, y, w, h = face; m = np.zeros(shape[:2], np.uint8)
    cv2.ellipse(m, (int(x + w / 2), int(y + h * .21)), (int(w * .98), int(h * .93)), 0, 0, 360, 255, -1)
    return cv2.GaussianBlur(m, (15, 15), 0)

def cutout(img, rect):
    H, W = img.shape[:2]
    scale = min(1.0, 700 / max(H, W))
    small = cv2.resize(img[:, :, :3], (int(W * scale), int(H * scale)), interpolation=cv2.INTER_AREA)
    r = tuple(int(v * scale) for v in rect)
    mask = np.zeros(small.shape[:2], np.uint8)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(small, mask, r, bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
    # Hair and face centre are definitely foreground: anchor them and run again.
    cx, cy = r[0] + r[2] // 2, r[1] + int(r[3] * .5)
    cv2.ellipse(mask, (cx, cy), (int(r[2] * .22), int(r[3] * .26)), 0, 0, 360, cv2.GC_FGD, -1)
    cv2.grabCut(small, mask, None, bgd, fgd, 4, cv2.GC_INIT_WITH_MASK)
    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
    if n > 1: fg = np.where(lab == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    fg = cv2.GaussianBlur(fg, (5, 5), 0)
    return cv2.resize(fg, (W, H), interpolation=cv2.INTER_CUBIC)

def process(path, out_path, no_cutout=False, show=False):
    raw = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if raw is None: raise SystemExit(f'cannot read {path}')
    if raw.ndim == 2: raw = cv2.cvtColor(raw, cv2.COLOR_GRAY2BGR)
    has_alpha = raw.shape[2] == 4 and raw[:, :, 3].min() < 250
    img = raw if raw.shape[2] == 4 else cv2.cvtColor(raw, cv2.COLOR_BGR2BGRA)
    gray = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2GRAY)
    face = find_face(gray)
    if face is None:
        print(f'  {os.path.basename(path)}: no face found, using the middle of the image'); H, W = gray.shape; s = min(H, W) * .6; face = (int(W / 2 - s / 2), int(H * .2), int(s), int(s))
    rect = head_rect(face, gray.shape)
    if has_alpha or no_cutout:
        alpha = img[:, :, 3]
    else:
        alpha = (cutout(img, rect).astype(np.float32) * head_mask(img.shape, face) / 255.0).astype(np.uint8)
    img[:, :, 3] = alpha
    # crop to the cutout's bounds with a small margin, but never outside the head box
    ys, xs = np.where(alpha > 40)
    if len(xs):
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max(); m = int(.03 * max(x1 - x0, y1 - y0))
        x0, y0, x1, y1 = max(0, x0 - m), max(0, y0 - m), min(img.shape[1], x1 + m), min(img.shape[0], y1 + m)
    else:
        x0, y0, w, h = rect; x1, y1 = x0 + w, y0 + h
    # keep the top/bottom of the head box so shoulders do not creep in
    rx, ry, rw, rh = rect; x0, x1 = max(x0, rx), min(x1, rx + rw); y0, y1 = max(y0, ry), min(y1, ry + rh)
    crop = img[y0:y1, x0:x1]
    if crop.shape[0] > 520: crop = cv2.resize(crop, (int(crop.shape[1] * 520 / crop.shape[0]), 520), interpolation=cv2.INTER_AREA)
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    cv2.imwrite(out_path, crop, [cv2.IMWRITE_WEBP_QUALITY, 90])
    if show:
        bg = np.full((crop.shape[0], crop.shape[1], 3), 120, np.uint8); a = crop[:, :, 3:4] / 255.0
        cv2.imwrite(out_path.rsplit('.', 1)[0] + '.preview.png', (crop[:, :, :3] * a + bg * (1 - a)).astype(np.uint8))
    print(f'  {os.path.basename(path)} -> {out_path}  ({crop.shape[1]}x{crop.shape[0]})')

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('images', nargs='+'); ap.add_argument('--id', nargs='+', help='character id(s), one per image (default: file name)')
    ap.add_argument('--mood', default='', help='normal|win|silly|angry|sad|think|walk'); ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', 'assets', 'portraits'))
    ap.add_argument('--no-cutout', action='store_true'); ap.add_argument('--show', action='store_true')
    a = ap.parse_args()
    ids = a.id or [os.path.splitext(os.path.basename(p))[0] for p in a.images]
    if len(ids) != len(a.images): sys.exit('give one --id per image')
    for path, cid in zip(a.images, ids):
        process(path, os.path.join(a.out, f'{cid}.{a.mood}.webp' if a.mood else f'{cid}.webp'), a.no_cutout, a.show)

if __name__ == '__main__': main()
