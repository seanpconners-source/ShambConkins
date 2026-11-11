#!/usr/bin/env python3
"""HEAD CHECK: where the face sits in every character picture, and which way it looks.

Games paste portrait heads onto bodies (Seanic, SotN, Broforce, Sundown, baseball, DOOM, bosses). Centring the whole
picture puts big hair, hats and ears where the face should be, and a head looking left rides a runner going right.
This tool reads every portrait once, offline, and writes src/data/headFacts.js:

  HEAD_FACTS[key] = [fx,fy,fw,fh, hx,hy,hw,hh, look, conf, found, aspect]
    fx..fh  face box (brow to chin, cheek to cheek), fractions of the picture
    hx..hh  head box = everything drawn (hair, ears, hat, beard), fractions of the picture
    look    -1 = the face points to the picture's LEFT, 1 = RIGHT, 0 = straight on
    conf    0..1, how sure the look is
    found   1 = a face detector found the face, 0 = estimated from the outline (cartoons, masks, animals: check by eye)
    aspect  picture width / height

Keys are the game's own picture keys: 'photo:char:<id>' / 'char:<id>:<mood>' (assets/portraits, same rules as
tools/build.mjs), built-in raster art from src/data/art.js ('char:sean:win', ...) and the face pack ('face:043').
src/headFacts.js turns a character + mood into these numbers at runtime (no detection in the game).

Needs: pip install opencv-python-headless (4.x: OpenCV 5 dropped the Haar face files) pillow numpy.
Usage:  python tools/head-check.py                 all pictures -> src/data/headFacts.js + contact sheets
        python tools/head-check.py --only ace,sean    just those ids (prints the facts, writes nothing)
        python tools/head-check.py --sheets DIR      where the contact sheets go (default local-test-reports/head-check)
Hand fixes: tools/head-check-fixes.json {"<key>": {"look": -1|0|1, "face": [x,y,w,h]}} are applied last (conf 1).
"""
import argparse, glob, json, os, re, sys
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORTRAITS = os.path.join(ROOT, 'assets', 'portraits')
OUT = os.path.join(ROOT, 'src', 'data', 'headFacts.js')
FIXES = os.path.join(ROOT, 'tools', 'head-check-fixes.json')
NAME = re.compile(r'^([a-z0-9-]+)(?:\.(normal|win|silly|angry|mad|sad|think|walk))?\.(webp|png|jpe?g)$', re.I)
RASTER = re.compile(r'\.(webp|png|jpe?g)$', re.I)


def pictures():
    """[(key, file)] for every character picture the game can show, keyed like the game keys them."""
    out = {}
    for f in sorted(os.listdir(PORTRAITS)):  # same order as build.mjs: a later file of the same key wins
        m = NAME.match(f)
        if not m:
            continue
        mood = (m.group(2) or '').lower()
        norm = 'angry' if mood == 'mad' else mood
        key = f'char:{m.group(1)}:{norm}' if norm else f'photo:char:{m.group(1)}'
        if mood == 'mad' and key in out:
            continue
        out[key] = os.path.join(PORTRAITS, f)
    # built-in art (Sean, Amber, ...) and the face pack: "@@asset:assets/x.webp@@" lists + {"key":index} maps
    for js, keep in (('src/data/art.js', lambda k: k.startswith(('char:', 'photo:char:'))), ('src/data/faceArt.js', lambda k: k.startswith('face:'))):
        t = open(os.path.join(ROOT, js), encoding='utf8').read()
        data = json.loads(re.search(r'const assetData=(\[.*?\]);', t, re.S).group(1))
        mp = json.loads(re.search(r'Object\.entries\((\{.*?\})\)', t, re.S).group(1))
        for k, i in mp.items():
            if not keep(k) or k in out:
                continue
            a = re.match(r'@@asset:(.*)@@', data[i])
            if a and RASTER.search(a.group(1)):
                out[k] = os.path.join(ROOT, a.group(1))
    return sorted(out.items())


# ---------- detection ----------
_casc = {}


def cascades():
    if not _casc:
        d = cv2.data.haarcascades
        for n in ('frontalface_default', 'frontalface_alt2', 'profileface', 'eye'):
            _casc[n] = cv2.CascadeClassifier(os.path.join(d, f'haarcascade_{n}.xml'))
    return _casc


def load(path):
    """RGBA array; pictures without transparency get the game's own dark-backdrop cut (src/headCutouts.js)."""
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    if (a[..., 3] < 16).mean() < .02:
        h, w = a.shape[:2]
        dark = a[..., :3].max(axis=2) <= 28
        n, lab = cv2.connectedComponents(dark.astype(np.uint8), connectivity=4)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        cut = np.isin(lab, list(edge)) & dark
        a[cut, 3] = 0
    return a


def head_mask(a):
    m = (a[..., 3] > 100).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    if n <= 1:
        return m.astype(bool)
    big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    keep = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] >= st[big, cv2.CC_STAT_AREA] * .08]
    return np.isin(lab, keep)


def bbox(m):
    ys, xs = np.nonzero(m)
    if not len(xs):
        return 0, 0, m.shape[1], m.shape[0]
    return xs.min(), ys.min(), xs.max() + 1 - xs.min(), ys.max() + 1 - ys.min()


def detect(gray, mask, hb):
    """Best face rectangle (x,y,w,h) in gray's pixels and the detector that found it, or None."""
    C = cascades()
    hx, hy, hw, hh = hb
    # head pictures are cut tight round the hair: the detectors want some room round a face
    P = int(max(gray.shape) * .3)
    pad = cv2.copyMakeBorder(gray, P, P, P, P, cv2.BORDER_CONSTANT, value=128)
    lo = int(max(24, min(hw, hh) * .3))
    cands = []
    for name, img, flip in (('frontalface_default', pad, False), ('frontalface_alt2', pad, False),
                            ('profileface', pad, False), ('profileface', pad[:, ::-1].copy(), True)):
        try:
            r, _, w8 = C[name].detectMultiScale3(img, scaleFactor=1.05, minNeighbors=3, minSize=(lo, lo), outputRejectLevels=True)
        except cv2.error:
            continue
        for (x, y, w, h), s in zip(r, np.ravel(w8) if len(r) else []):
            if flip:
                x = pad.shape[1] - x - w
            x, y = x - P, y - P
            cx, cy = x + w / 2, y + h / 2
            iy, ix = int(min(gray.shape[0] - 1, max(0, cy))), int(min(gray.shape[1] - 1, max(0, cx)))
            # a face in a head cut-out is most of its width, never a speck in the hair or the chin
            if not mask[iy, ix] or w > hw * 1.2 or w < hw * .38 or cy < hy + hh * .2:
                continue
            inside = mask[max(0, y):y + h, max(0, x):x + w].mean() if w and h else 0
            score = float(s) + 3 * inside + 4 * w / hw + (2 if 'frontal' in name else 0)
            cands.append((score, (x, y, w, h), name + (':flip' if flip else '')))
    if not cands:
        return None
    cands.sort(key=lambda c: -c[0])
    best = cands[0]
    # two frontal cascades agreeing beat a lone profile hit
    return best[1], best[2], [c[2] for c in cands]


def outline_face(mask, hb):
    """No detector hit: the face is the lower middle of the outline (hair/hat on top)."""
    hx, hy, hw, hh = hb
    rows = np.arange(int(hy + hh * .45), int(hy + hh * .8))
    xs = [np.nonzero(mask[r])[0] for r in rows if mask[r].any()]
    if xs:
        l = np.median([x.min() for x in xs]); r = np.median([x.max() for x in xs])
    else:
        l, r = hx, hx + hw
    w = (r - l) * .86
    h = min(hh * .72, w * 1.25)
    return (l + (r - l - w) / 2, hy + hh - h - hh * .04, w, h)


def chin_box(face, mask):
    """Haar boxes run brow to lower lip: stretch to the chin (stop at the bottom of the drawing)."""
    x, y, w, h = face
    bottom = bbox(mask)[1] + bbox(mask)[3]
    y0 = y + h * .06
    y1 = min(bottom, y + h * 1.12)
    return x + w * .04, y0, w * .92, y1 - y0


def yaw(a, gray, mask, face, hb):
    """Look direction score (<0 = the face points left) from three cues:
    nose line vs cheek edges, where the face sits in the whole head, and which profile detector fired."""
    H, W = gray.shape
    x, y, w, h = [float(v) for v in face]
    # skin = colour close to the nose/cheek centre
    lab = cv2.cvtColor(np.ascontiguousarray(a[..., :3]), cv2.COLOR_RGB2LAB).astype(np.float32)
    cy0, cy1 = int(y + h * .45), int(y + h * .75)
    cx0, cx1 = int(x + w * .35), int(x + w * .65)
    patch = lab[max(0, cy0):cy1, max(0, cx0):cx1].reshape(-1, 3)
    pm = mask[max(0, cy0):cy1, max(0, cx0):cx1].reshape(-1)
    if pm.sum() < 10:
        return 0.0, {}
    ref = np.median(patch[pm], axis=0)
    dist = np.sqrt(((lab - ref) ** 2 * np.array([.35, 1, 1])).sum(axis=2))
    skin = (dist < 22) & mask
    skin = cv2.morphologyEx(skin.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    # cheek edges on the cheek/mouth rows, searched a little past the box
    r0, r1 = int(y + h * .42), int(min(H - 1, y + h * .9))
    xa, xb = int(max(0, x - w * .3)), int(min(W, x + w * 1.3))
    L, R = [], []
    for r in range(r0, r1):
        cols = np.nonzero(skin[r, xa:xb])[0]
        if len(cols) > w * .3:
            # the run containing the box centre
            c = int(x + w / 2) - xa
            row = skin[r, xa:xb]
            if not row[min(len(row) - 1, max(0, c))]:
                continue
            l = c
            while l > 0 and row[l - 1]:
                l -= 1
            rr = c
            while rr < len(row) - 1 and row[rr + 1]:
                rr += 1
            L.append(l + xa); R.append(rr + xa)
    feat = {}
    s_cheek = 0.0
    if len(L) > 4:
        l, r = float(np.median(L)), float(np.median(R))
        # nose line: the mirror axis of the face's light/dark pattern between the eyes and the mouth
        g = cv2.GaussianBlur(gray, (0, 0), max(1, w / 60)).astype(np.float32)
        gy0, gy1 = int(y + h * .25), int(y + h * .8)
        best, ax = 1e9, x + w / 2
        hwid = int(w * .22)
        for c in range(int(x + w * .28), int(x + w * .72)):
            if c - hwid < 0 or c + hwid >= W:
                continue
            A = g[gy0:gy1, c - hwid:c]
            B = g[gy0:gy1, c + 1:c + 1 + hwid][:, ::-1]
            mm = mask[gy0:gy1, c - hwid:c] & mask[gy0:gy1, c + 1:c + 1 + hwid][:, ::-1]
            if mm.mean() < .6:
                continue
            d = np.abs(A - B)[mm].mean() + abs(c - (x + w / 2)) / w * 6  # small pull to the middle
            if d < best:
                best, ax = d, c
        ratio = min(1.0, max(0.0, (ax - l) / max(1, r - l)))
        # trust it only when the skin run is about face wide (beards, masks and make-up break the skin match)
        trust = min(1.0, max(0.0, ((r - l) / w - .35) / .3))
        s_cheek = (ratio - .5) * 2 * trust  # -1..1
        feat.update(cheekL=l, cheekR=r, axis=ax, ratio=ratio, trust=trust)
    hx, hy, hw, hh = hb
    s_head = ((x + w / 2) - (hx + hw / 2)) / hw * 4  # face pushed to one side of the hair = looking that way
    feat.update(s_cheek=s_cheek, s_head=s_head)
    return s_cheek, feat


def analyse(item):
    key, path = item
    try:
        a = load(path)
    except Exception as e:  # noqa
        return key, None, str(e)
    H0, W0 = a.shape[:2]
    k = 480 / max(H0, W0)
    if abs(k - 1) > .05:
        a = np.array(Image.fromarray(a).resize((max(1, round(W0 * k)), max(1, round(H0 * k))), Image.LANCZOS))
    H, W = a.shape[:2]
    mask = head_mask(a)
    hb = bbox(mask)
    rgb = a[..., :3].astype(np.float32)
    al = (a[..., 3:4] / 255.0)
    comp = (rgb * al + 128 * (1 - al)).astype(np.uint8)
    gray = cv2.equalizeHist(cv2.cvtColor(comp, cv2.COLOR_RGB2GRAY))
    det = detect(gray, mask, hb)
    if det:
        face0, how, all_ = det
        face = chin_box(face0, mask)
        found = 1
    else:
        face0 = face = outline_face(mask, hb)
        how, all_, found = 'outline', [], 0
    s_cheek, feat = yaw(a, cv2.cvtColor(comp, cv2.COLOR_RGB2GRAY), mask, face0, hb)
    s_head = feat.get('s_head', 0.0)
    prof = 0.0
    if 'profileface' in how:
        prof = 1.0 if how.endswith(':flip') else -1.0  # calibrated below via SIGN
    score = SIGN_CHEEK * s_cheek * .6 + SIGN_HEAD * s_head * .4 + SIGN_PROF * prof * .5
    look = 0 if abs(score) < .12 else (1 if score > 0 else -1)
    conf = min(1.0, abs(score) / .45) if look else min(1.0, (.12 - abs(score)) / .12)
    if not found:
        conf *= .5
    fx, fy, fw, fh = face
    hx, hy, hw, hh = hb
    r3 = lambda v: round(float(v), 3)
    facts = [r3(fx / W), r3(fy / H), r3(fw / W), r3(fh / H), r3(hx / W), r3(hy / H), r3(hw / W), r3(hh / H), look, round(float(conf), 2), found, r3(W0 / H0)]
    return key, facts, dict(how=how, all=all_, score=round(score, 3), **{k2: (round(v, 3) if isinstance(v, float) else v) for k2, v in feat.items()})


# signs found by checking pictures by eye (see --calibrate): +1 means a positive cue = looking right
SIGN_CHEEK, SIGN_HEAD, SIGN_PROF = 1, 1, 1


# ---------- output ----------
def write_js(facts):
    lines = ['// HEAD FACTS, written by tools/head-check.py (do not edit by hand: put fixes in tools/head-check-fixes.json).',
             '// key -> [fx,fy,fw,fh, hx,hy,hw,hh, look, conf, found, aspect]: face box (brow..chin) and head box (all drawn,',
             '// hair/hat/ears) as fractions of the picture; look -1 = face points to the picture\'s left, 1 = right, 0 = straight on;',
             '// conf 0..1; found 1 = face detector, 0 = guessed from the outline; aspect = width/height. Read via src/headFacts.js.',
             'const HEAD_FACTS={']
    for k in sorted(facts):
        lines.append(json.dumps(k) + ':' + json.dumps(facts[k], separators=(',', ':')).replace('0.', '.') + ',')
    lines.append('};')
    lines.append('Object.assign(exports,{HEAD_FACTS});')
    open(OUT, 'w', encoding='utf8', newline='\n').write('\n'.join(lines) + '\n')


def sheet(rows, path, title, cell=150, cols=10):
    """rows = [(key, file, facts, info)]: picture on grey, head box (blue), face box (yellow; dashed red = guessed), look arrow."""
    n = len(rows)
    lab = 30
    img = Image.new('RGB', (cols * cell, 40 + ((n + cols - 1) // cols) * (cell + lab)), (44, 48, 58))
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype('arial.ttf', 11); big = ImageFont.truetype('arialbd.ttf', 18)
    except OSError:
        font = big = ImageFont.load_default()
    d.text((10, 10), title, fill=(255, 255, 255), font=big)
    for i, (key, f, fa, info) in enumerate(rows):
        x0, y0 = (i % cols) * cell, 40 + (i // cols) * (cell + lab)
        try:
            a = load(f)
        except Exception:  # noqa
            continue
        im = Image.fromarray(a)
        s = (cell - 10) / max(im.size)
        im = im.resize((max(1, round(im.size[0] * s)), max(1, round(im.size[1] * s))), Image.LANCZOS)
        ox, oy = x0 + (cell - im.size[0]) // 2, y0 + (cell - im.size[1]) // 2
        bg = Image.new('RGB', im.size, (110, 140, 110))
        bg.paste(im, (0, 0), im)
        img.paste(bg, (ox, oy))
        W, H = im.size
        fx, fy, fw, fh, hx, hy, hw, hh, look, conf, found = fa[:11]
        d.rectangle([ox + hx * W, oy + hy * H, ox + (hx + hw) * W, oy + (hy + hh) * H], outline=(80, 160, 255))
        d.rectangle([ox + fx * W, oy + fy * H, ox + (fx + fw) * W, oy + (fy + fh) * H], outline=(255, 220, 0) if found else (255, 60, 60), width=2)
        cx, cy = ox + (fx + fw / 2) * W, oy + (fy + fh * .45) * H
        if look:
            L = fw * W * .45
            ex = cx + look * L
            col = (255, 80, 200) if conf < .5 else (60, 255, 120)
            d.line([cx, cy, ex, cy], fill=col, width=3)
            d.polygon([(ex + look * 7, cy), (ex, cy - 6), (ex, cy + 6)], fill=col)
        else:
            d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], outline=(60, 255, 120), width=2)
        name = key.replace('photo:char:', '').replace('char:', '')
        d.text((x0 + 4, y0 + cell - 2), name[:24], fill=(230, 230, 230), font=font)
        d.text((x0 + 4, y0 + cell + 11), f"{'LRC'[[-1, 1, 0].index(look)]} {conf:.2f} {info.get('how', '')[:16]}", fill=(170, 170, 190), font=font)
    img.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--sheets', default=os.path.join(ROOT, 'local-test-reports', 'head-check'))
    ap.add_argument('--sheet', default='', help='with --only: draw a contact sheet to this png')
    ap.add_argument('--jobs', type=int, default=max(1, (os.cpu_count() or 2) - 1))
    o = ap.parse_args()
    items = pictures()
    if o.only:
        ids = set(o.only.split(','))
        items = [it for it in items if re.sub(r'^(photo:)?char:|:[a-z]+$', '', it[0]) in ids or it[0] in ids]
    res = {}
    with ProcessPoolExecutor(o.jobs) as ex:
        for i, (key, fa, info) in enumerate(ex.map(analyse, items, chunksize=8)):
            res[key] = (fa, info)
            if i % 200 == 0:
                print(f'{i}/{len(items)}', file=sys.stderr)
    files = dict(items)
    fixes = json.load(open(FIXES, encoding='utf8')) if os.path.exists(FIXES) else {}
    for k, fx in fixes.items():
        if k in res and res[k][0]:
            fa = res[k][0]
            if 'face' in fx:
                fa[0:4] = fx['face']; fa[10] = 1
            if 'look' in fx:
                fa[8] = fx['look']
            fa[9] = 1.0
            res[k][1]['how'] = 'hand fix'
    if o.only:
        for k, (fa, info) in res.items():
            print(k, fa, {a: (float(b) if isinstance(b, np.floating) else b) for a, b in info.items() if a != 'all'})
        if o.sheet:
            sheet([(k, files[k], fa, info) for k, (fa, info) in res.items() if fa], o.sheet, 'trial', cols=8)
        return
    facts = {k: fa for k, (fa, _) in res.items() if fa}
    write_js(facts)
    os.makedirs(o.sheets, exist_ok=True)
    for f in glob.glob(os.path.join(o.sheets, '*.png')):
        os.remove(f)
    rows = [(k, files[k], fa, info) for k, (fa, info) in res.items() if fa]
    # worth an eye: faces only guessed from the outline, and left/right calls the game may act on but is unsure of
    review = [r for r in rows if not r[2][10] or (r[2][8] and .45 <= r[2][9] < .7)]
    per = 120
    for p in range(0, len(rows), per):
        sheet(rows[p:p + per], os.path.join(o.sheets, f'all-{p // per + 1:02d}.png'), f'Head check {p + 1}-{min(len(rows), p + per)} of {len(rows)}   yellow = face, blue = head, red dashed = guessed, arrow = looks that way')
    for p in range(0, len(review), per):
        sheet(review[p:p + per], os.path.join(o.sheets, f'review-{p // per + 1:02d}.png'), f'Check by eye {p + 1}-{min(len(review), p + per)} of {len(review)} (no face found or unsure look)')
    json.dump({k: info for k, (_, info) in res.items()}, open(os.path.join(o.sheets, 'details.json'), 'w'), indent=0)
    n = len(rows)
    print(f'{n} pictures: face found {sum(r[2][10] for r in rows)}, guessed {sum(1 - r[2][10] for r in rows)}; '
          f'look L {sum(r[2][8] == -1 for r in rows)} R {sum(r[2][8] == 1 for r in rows)} C {sum(r[2][8] == 0 for r in rows)}; '
          f'review list {len(review)} -> {o.sheets}')


if __name__ == '__main__':
    main()
