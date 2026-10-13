#!/usr/bin/env python3
"""Photo Hunt pair maker (Megatouch-style spot-the-difference rounds).

Every round is two photos the size of the cabinet's photo windows (37:32) plus
the difference ellipses. Pairs live in assets/photohunt/:
  <id>.a.webp  <id>.b.webp  <id>.json   ({id,title,regions:[{x,y,rx,ry,kind}]}, 0..1 coords)
build.mjs embeds the images; `index` regenerates src/data/photoHuntPairs.js.

  make   PHOTO --id ID [--title T] [--focus X,Y] [--auto N | --spots SPEC] [--seed S]
         One photo in; the tool edits 5 spots to make the "B" side.
         SPEC = "kind@x,y,rx[,ry];..." in 0..1 photo coords after cropping, kinds:
         remove color flip grow rotate add (add@x,y,rx,ry<sx,sy copies the spot at sx,sy;
         color@x,y,rx,ry#d4a017 paints that colour instead of a random one).
  import A B --id ID [--title T] [--focus X,Y] [--threshold 28]
         A finished pair in (you made B yourself); differences are found by pixel diff.
  index  Rebuild src/data/photoHuntPairs.js from every assets/photohunt/*.json.
  preview ID [--out FILE]  Side-by-side contact image with the answer circles.
  inbox  make (auto) every photo in assets/photohunt/inbox/ and import every X.a/X.b pair there.
"""
import argparse, json, math, random, re, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'photohunt'
PAIRS_JS = ROOT / 'src' / 'data' / 'photoHuntPairs.js'
W, H = 740, 640          # photo window, same 37:32 shape as the cabinet
ASPECT = W / H
KINDS = ('remove', 'color', 'flip', 'grow', 'rotate', 'add')
IMG_EXT = ('.jpg', '.jpeg', '.png', '.webp')


# ---------- loading ----------
def load_crop(path, focus=(.5, .45), size=None):
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    w, h = im.size
    cw, ch = (round(h * ASPECT), h) if w / h > ASPECT else (w, round(w / ASPECT))
    x0 = min(max(round(focus[0] * w - cw / 2), 0), w - cw)
    y0 = min(max(round(focus[1] * h - ch / 2), 0), h - ch)
    im = im.crop((x0, y0, x0 + cw, y0 + ch))
    target = size or ((W, H) if cw > W else (cw, ch))
    if im.size != target:
        im = im.resize(target, Image.LANCZOS)
    return np.asarray(im).astype(np.float32)


def save_webp(arr, path):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(path, 'WEBP', quality=84, method=6)


# ---------- helpers ----------
def grid(img):
    h, w = img.shape[:2]
    return np.mgrid[0:h, 0:w].astype(np.float32)


def ell(img, cx, cy, rx, ry):
    Y, X = grid(img)
    return np.sqrt(((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2)


def soft(d, feather=.3):
    t = np.clip((1 - d) / feather, 0, 1)
    return t * t * (3 - 2 * t)


def sample(img, xs, ys):
    """Bilinear sample img at float coords (clamped)."""
    h, w = img.shape[:2]
    xs = np.clip(xs, 0, w - 1.001); ys = np.clip(ys, 0, h - 1.001)
    x0 = np.floor(xs).astype(int); y0 = np.floor(ys).astype(int)
    fx = (xs - x0)[..., None]; fy = (ys - y0)[..., None]
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def lum(img):
    return img[..., 0] * .299 + img[..., 1] * .587 + img[..., 2] * .114


def box(a, r):
    """Box blur of a 2D array with radius r (integral image)."""
    r = max(1, int(r))
    p = np.pad(a, r + 1, mode='edge')
    s = p.cumsum(0).cumsum(1)
    k = 2 * r + 1
    out = s[k:, k:] - s[:-k, k:] - s[k:, :-k] + s[:-k, :-k]
    return out[:a.shape[0], :a.shape[1]] / (k * k)


def detail_map(img):
    L = lum(img)
    gx = np.abs(np.diff(L, axis=1, append=L[:, -1:]))
    gy = np.abs(np.diff(L, axis=0, append=L[-1:, :]))
    return gx + gy


def rgb2hsv(c):
    r, g, b = c[..., 0] / 255, c[..., 1] / 255, c[..., 2] / 255
    mx = np.max(c, -1) / 255; mn = np.min(c, -1) / 255; df = mx - mn + 1e-6
    h = np.where(mx == r, (g - b) / df % 6, np.where(mx == g, (b - r) / df + 2, (r - g) / df + 4)) / 6
    s = np.where(mx > 0, (mx - mn) / (mx + 1e-6), 0)
    return h % 1, s, mx


def hsv2rgb(h, s, v):
    i = np.floor(h * 6).astype(int) % 6; f = h * 6 - np.floor(h * 6)
    p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s)
    choices = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]
    out = np.zeros(h.shape + (3,), np.float32)
    for k, (r, g, b) in enumerate(choices):
        m = i == k
        out[m, 0] = r[m]; out[m, 1] = g[m]; out[m, 2] = b[m]
    return out * 255


# ---------- edits: each returns the edited image ----------
def edit_remove(img, cx, cy, rx, ry, rng, **_):
    """Clone a matching patch of nearby background over the spot (clone stamp)."""
    h, w = img.shape[:2]
    d = ell(img, cx, cy, rx, ry)
    ring = (d > 1.05) & (d < 1.45)
    ys, xs = np.nonzero(ring)
    det = detail_map(img)
    ring_det = float(det[ring].mean())
    iy, ix = np.nonzero(d < 1)
    best = None
    for ang in range(0, 360, 15):
        for dist in (2.3, 2.8, 3.4, 4.2):
            dx = round(math.cos(math.radians(ang)) * dist * rx)
            dy = round(math.sin(math.radians(ang)) * dist * ry)
            if not (0 <= cx + dx - 1.5 * rx and cx + dx + 1.5 * rx < w and 0 <= cy + dy - 1.5 * ry and cy + dy + 1.5 * ry < h):
                continue
            src_ring = img[ys + dy, xs + dx]
            tgt_ring = img[ys, xs]
            delta = tgt_ring.mean(0) - src_ring.mean(0)
            # the patch must look like the surroundings: no busy texture (an eye) pasted over a plain cheek
            busy = max(0.0, float(det[iy + dy, ix + dx].mean()) - ring_det * 1.15)
            score = ((src_ring + delta - tgt_ring) ** 2).mean() + 2.5 * (np.abs(delta).sum()) ** 1.2 + 40 * busy ** 2
            if best is None or score < best[0]:
                best = (score, dx, dy, delta)
    if best is None:
        return None
    _, dx, dy, delta = best
    Y, X = grid(img)
    shifted = sample(img, X + dx, Y + dy) + delta * .85
    m = soft(d / 1.12, .35)[..., None]
    return img * (1 - m) + shifted * m


def edit_color(img, cx, cy, rx, ry, rng, tint=None, **_):
    """Recolour the object at the centre (pixels that look like the centre colour)."""
    d = ell(img, cx, cy, rx, ry)
    core = img[d < .45]
    ref = np.median(core, 0)
    dist = np.sqrt(((img - ref) ** 2).sum(-1))
    spread = max(22.0, float(np.percentile(np.sqrt(((core - ref) ** 2).sum(-1)), 75)) * 1.3)
    sim = np.exp(-(dist / spread) ** 2)
    m = (soft(d, .3) * sim)[..., None]
    h, s, v = rgb2hsv(img)
    if tint is not None:                # explicit colour, e.g. a gold tooth: keep the shading, take the hue
        th, ts, _ = rgb2hsv(np.array(tint, np.float32).reshape(1, 1, 3))
        rec = hsv2rgb(np.full_like(h, float(th[0, 0])), np.maximum(s, float(ts[0, 0]) * .85), v)
        return img * (1 - m) + rec * m
    if np.median(s[d < .6]) < .18:      # grey/white/black object: give it a strong colour
        hue = rng.random()
        nh = np.full_like(h, hue); ns = np.clip(s + .55, 0, .75)
        nv = np.clip(v * .9 + .08, 0, 1) if np.median(v[d < .6]) < .25 else v
    else:
        nh = (h + rng.uniform(.3, .7)) % 1; ns = np.clip(s * 1.15, 0, 1); nv = v
    rec = hsv2rgb(nh, ns, nv)
    return img * (1 - m) + rec * m


def edit_flip(img, cx, cy, rx, ry, rng, **_):
    d = ell(img, cx, cy, rx, ry)
    Y, X = grid(img)
    src = sample(img, 2 * cx - X, Y)
    m = soft(d, .3)[..., None]
    return img * (1 - m) + src * m


def edit_grow(img, cx, cy, rx, ry, rng, **_):
    k = rng.uniform(1.35, 1.6)
    d = ell(img, cx, cy, rx, ry)
    Y, X = grid(img)
    src = sample(img, cx + (X - cx) / k, cy + (Y - cy) / k)
    m = soft(d, .35)[..., None]
    return img * (1 - m) + src * m


def edit_rotate(img, cx, cy, rx, ry, rng, **_):
    a = math.radians(rng.choice((-1, 1)) * rng.uniform(35, 70))
    d = ell(img, cx, cy, rx, ry)
    Y, X = grid(img)
    ca, sa = math.cos(a), math.sin(a)
    src = sample(img, cx + (X - cx) * ca - (Y - cy) * sa, cy + (X - cx) * sa + (Y - cy) * ca)
    m = soft(d, .35)[..., None]
    return img * (1 - m) + src * m


def edit_add(img, cx, cy, rx, ry, rng, src=None, **_):
    """Copy the object at src onto the spot (a duplicate appears)."""
    if src is None:
        return None
    sx, sy = src
    d = ell(img, cx, cy, rx, ry)
    Y, X = grid(img)
    copy = sample(img, X - cx + sx, Y - cy + sy)
    m = soft(d, .35)[..., None]
    return img * (1 - m) + copy * m


EDITS = {'remove': edit_remove, 'color': edit_color, 'flip': edit_flip, 'grow': edit_grow,
         'rotate': edit_rotate, 'add': edit_add}


def visible(before, after, cx, cy, rx, ry):
    if after is None:
        return 0.0
    d = ell(before, cx, cy, rx, ry) < .85
    return float(np.abs(after[d] - before[d]).max(-1).mean())


# ---------- automatic spot choice ----------
def auto_spots(img, n, rng, kinds=None):
    h, w = img.shape[:2]
    det = detail_map(img)
    spots, tries = [], 0
    plan = list(kinds) if kinds else []
    if not plan:
        plan = ['remove', 'color', 'flip', 'remove', 'color', 'grow', 'rotate', 'flip']
        rng.shuffle(plan)
    base = min(w, h)
    while len(spots) < n and tries < 400:
        tries += 1
        rx = base * rng.uniform(.065, .1); ry = rx * rng.uniform(.8, 1.25)
        cx = rng.uniform(rx * 1.6, w - rx * 1.6); cy = rng.uniform(ry * 1.6, h - ry * 1.6)
        if any(math.hypot((cx - s['cx']) / (rx + s['rx']), (cy - s['cy']) / (ry + s['ry'])) < 1.5 for s in spots):
            continue
        d = ell(img, cx, cy, rx, ry)
        inner = float(det[d < 1].mean()); ring = float(det[(d > 1.1) & (d < 1.6)].mean())
        if inner < 9 and tries < 300:                  # flat sky/wall: nothing to spot
            continue
        order = [plan[len(spots) % len(plan)]] + [k for k in ('color', 'remove', 'flip', 'grow', 'rotate') if k != plan[len(spots) % len(plan)]]
        if inner < ring * .9 and order[0] == 'remove':  # object should stand out from its surroundings
            order = order[1:] + order[:1]
        for kind in order:
            out = EDITS[kind](img, cx, cy, rx, ry, rng)
            if visible(img, out, cx, cy, rx, ry) > 20:
                spots.append(dict(kind=kind, cx=cx, cy=cy, rx=rx, ry=ry, out=out))
                img = out
                break
    return img, spots


def parse_spots(spec, w, h):
    out = []
    for part in filter(None, (p.strip() for p in spec.split(';'))):
        m = re.match(r'^(\w+)@([\d.,]+)(?:<([\d.]+),([\d.]+))?(?:#([0-9a-fA-F]{6}))?$', part)
        if not m or m.group(1) not in KINDS:
            sys.exit(f'bad spot "{part}" (kind@x,y,rx[,ry][<sx,sy][#rrggbb], kinds {",".join(KINDS)})')
        nums = [float(v) for v in m.group(2).split(',')]
        x, y, rx = nums[:3]; ry = nums[3] if len(nums) > 3 else rx * w / h
        src = (float(m.group(3)) * w, float(m.group(4)) * h) if m.group(3) else None
        tint = tuple(int(m.group(5)[i:i + 2], 16) for i in (0, 2, 4)) if m.group(5) else None
        out.append(dict(kind=m.group(1), cx=x * w, cy=y * h, rx=rx * w, ry=ry * h, src=src, tint=tint))
    return out


# ---------- pair files ----------
def regions_json(spots, w, h, pad=1.12):
    return [{'x': round(s['cx'] / w, 4), 'y': round(s['cy'] / h, 4), 'rx': round(min(.2, s['rx'] * pad / w), 4),
             'ry': round(min(.2, s['ry'] * pad / h), 4), **({'kind': s['kind']} if s.get('kind') else {})} for s in spots]


def write_pair(pid, title, a, b, regions, source=''):
    OUT.mkdir(parents=True, exist_ok=True)
    save_webp(a, OUT / f'{pid}.a.webp'); save_webp(b, OUT / f'{pid}.b.webp')
    meta = {'id': pid, 'title': title or pid.replace('-', ' ').title(), 'regions': regions}
    if source:
        meta['source'] = source
    (OUT / f'{pid}.json').write_text(json.dumps(meta, indent=1) + '\n')
    print(f'{pid}: {len(regions)} differences -> assets/photohunt/{pid}.a/.b.webp')


def check_id(pid):
    if not re.match(r'^[a-z0-9][a-z0-9-]{0,60}$', pid):
        sys.exit(f'id "{pid}" must be lowercase letters, digits and dashes')


def cmd_make(photo, pid, title='', focus=(.5, .45), auto=5, spots=None, seed=None):
    check_id(pid)
    rng = random.Random(seed if seed is not None else pid)
    img = load_crop(photo, focus)
    h, w = img.shape[:2]
    if spots:
        out, done = img, []
        for s in parse_spots(spots, w, h):
            res = EDITS[s['kind']](out, s['cx'], s['cy'], s['rx'], s['ry'], rng, src=s['src'], tint=s['tint'])
            if res is None:
                sys.exit(f'{s["kind"]} spot could not be edited (too close to the edge?)')
            v = visible(out, res, s['cx'], s['cy'], s['rx'], s['ry'])
            if v < 12:
                print(f'warning: {s["kind"]} at {s["cx"]/w:.2f},{s["cy"]/h:.2f} barely changes anything ({v:.0f})')
            out = res; done.append(s)
    else:
        out, done = auto_spots(img, auto, rng)
        if len(done) < auto:
            print(f'warning: only found {len(done)} good spots')
    write_pair(pid, title, img, out, regions_json(done, w, h))


def components(mask):
    """4-connected components of a boolean grid -> list of (ys, xs)."""
    seen = np.zeros_like(mask, bool); comps = []
    H_, W_ = mask.shape
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        stack = [(y0, x0)]; seen[y0, x0] = True; pts = []
        while stack:
            y, x = stack.pop(); pts.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < H_ and 0 <= nx < W_ and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; stack.append((ny, nx))
        comps.append(np.array(pts))
    return comps


def find_differences(a, b, threshold=28, cell=4):
    h, w = a.shape[:2]
    diff = np.abs(a - b).max(-1)
    diff = box(diff, 1)
    gh, gw = h // cell, w // cell
    g = diff[:gh * cell, :gw * cell].reshape(gh, cell, gw, cell).max((1, 3)) > threshold
    for _ in range(3):  # close small gaps so one object is one blob
        p = np.pad(g, 1)
        g = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    blobs = [c for c in components(g) if len(c) >= 6]
    spots = []
    for c in blobs:
        y0, x0 = c.min(0) * cell; y1, x1 = (c.max(0) + 1) * cell
        rx = max((x1 - x0) / 2, w * .04); ry = max((y1 - y0) / 2, h * .04)
        spots.append(dict(cx=(x0 + x1) / 2, cy=(y0 + y1) / 2, rx=rx, ry=ry, area=len(c)))
    spots.sort(key=lambda s: -s['area'])
    return spots


def cmd_import(pa, pb, pid, title='', focus=(.5, .45), threshold=28):
    check_id(pid)
    a = load_crop(pa, focus)
    b = load_crop(pb, focus, size=(a.shape[1], a.shape[0]))
    h, w = a.shape[:2]
    spots = find_differences(a, b, threshold)
    if not spots:
        sys.exit('no differences found; lower --threshold?')
    if len(spots) > 8:
        print(f'warning: {len(spots)} difference blobs; keeping the 8 biggest (raise --threshold if this is noise)')
        spots = spots[:8]
    write_pair(pid, title, a, b, regions_json(spots, w, h, pad=1.08))


def cmd_index():
    pairs = []
    for f in sorted(OUT.glob('*.json')):
        meta = json.loads(f.read_text())
        if not ((OUT / f'{meta["id"]}.a.webp').exists() and (OUT / f'{meta["id"]}.b.webp').exists()):
            print(f'skip {f.name}: images missing'); continue
        pairs.append({k: meta[k] for k in ('id', 'title', 'source', 'regions') if k in meta})
    body = ',\n '.join(json.dumps(p, separators=(',', ':'), ensure_ascii=False) for p in pairs)
    PAIRS_JS.write_text('// Generated by `python3 tools/photohunt.py index` from assets/photohunt/*.json (edit those, not this).\n'
                        '// Images are embedded by tools/build.mjs as USER_PORTRAITS["photohunt:<id>:a|b"].\n'
                        f'const PHOTO_HUNT_PAIRS=[{body and chr(10) + " " + body + chr(10)}];\n\nObject.assign(exports,{{PHOTO_HUNT_PAIRS}});\n')
    print(f'{len(pairs)} pairs -> {PAIRS_JS.relative_to(ROOT)}')


def cmd_preview(pid, out=None):
    meta = json.loads((OUT / f'{pid}.json').read_text())
    a = Image.open(OUT / f'{pid}.a.webp').convert('RGB'); b = Image.open(OUT / f'{pid}.b.webp').convert('RGB')
    w, h = a.size
    sheet = Image.new('RGB', (w * 2 + 12, h), 'white'); sheet.paste(a, (0, 0)); sheet.paste(b, (w + 12, 0))
    dr = ImageDraw.Draw(sheet)
    for i, r in enumerate(meta['regions']):
        for ox in (0, w + 12):
            box_ = (ox + (r['x'] - r['rx']) * w, (r['y'] - r['ry']) * h, ox + (r['x'] + r['rx']) * w, (r['y'] + r['ry']) * h)
            dr.ellipse(box_, outline=(60, 230, 60), width=4)
            dr.text((box_[0] + 4, box_[1] + 2), f'{i + 1}{r.get("kind", "")[:1]}', fill=(255, 255, 0))
    out = out or str(Path('/tmp') / f'photohunt-{pid}-preview.png')
    sheet.save(out); print(out)


def cmd_inbox(auto=5):
    inbox = OUT / 'inbox'
    files = sorted(p for p in inbox.glob('*') if p.suffix.lower() in IMG_EXT)
    pairs = {}
    for p in files:
        m = re.match(r'^(.*)\.(a|b)$', p.stem, re.I)
        if m:
            pairs.setdefault(m.group(1), {})[m.group(2).lower()] = p
    for stem, ab in pairs.items():
        if 'a' in ab and 'b' in ab:
            cmd_import(ab['a'], ab['b'], slug(stem))
    for p in files:
        if not re.match(r'^.*\.(a|b)$', p.stem, re.I):
            cmd_make(p, slug(p.stem), auto=auto)
    cmd_index()


def slug(s):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')[:60] or 'photo'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    m = sub.add_parser('make'); m.add_argument('photo'); m.add_argument('--id', required=True); m.add_argument('--title', default='')
    m.add_argument('--focus', default='.5,.45'); m.add_argument('--auto', type=int, default=5); m.add_argument('--spots'); m.add_argument('--seed')
    i = sub.add_parser('import'); i.add_argument('a'); i.add_argument('b'); i.add_argument('--id', required=True); i.add_argument('--title', default='')
    i.add_argument('--focus', default='.5,.45'); i.add_argument('--threshold', type=float, default=28)
    sub.add_parser('index')
    p = sub.add_parser('preview'); p.add_argument('id'); p.add_argument('--out')
    b = sub.add_parser('inbox'); b.add_argument('--auto', type=int, default=5)
    args = ap.parse_args()
    focus = tuple(float(v) for v in getattr(args, 'focus', '.5,.45').split(','))
    if args.cmd == 'make':
        cmd_make(args.photo, args.id, args.title, focus, args.auto, args.spots, args.seed); cmd_index()
    elif args.cmd == 'import':
        cmd_import(args.a, args.b, args.id, args.title, focus, args.threshold); cmd_index()
    elif args.cmd == 'index':
        cmd_index()
    elif args.cmd == 'preview':
        cmd_preview(args.id, args.out)
    elif args.cmd == 'inbox':
        cmd_inbox(args.auto)


if __name__ == '__main__':
    main()
