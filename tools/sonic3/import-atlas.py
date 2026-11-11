#!/usr/bin/env python3
"""Import the GPT art atlases for Seanic the Hedgehog (level objects, robots, bosses, terrain, props, backdrop, logo).
Each atlas is a picture on flat green with labels on the left (or above each item). The table below says where every
row/item sits on its atlas (y band, label column end) and which sprite slot it fills (src/data/sonic3Sprites.js).

  python3 tools/sonic3/import-atlas.py <folder with the atlases> [--only slot,slot] [--preview <dir>]

Sheets: every pose of a sheet is scaled by ONE factor (the first pose of the sheet's first row is scaled to `ref`
game px tall), then placed in its frame cell at 2x (RES) with its feet on the frame's foot point (anchor 'bottom') or
centred on it (anchor 'center'). Pictures: cropped, trimmed and scaled to the slot's width (or height). Tiles: the
inside of the square (border cut off), scaled to the tile size. Writes assets/sonic3/<slot>.webp (lossless),
assets/keyart/sonic-logo.webp (the Arcade logo) and copies the atlases to assets/originals/sonic3/."""
import sys, os, json, shutil, subprocess
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1]; PREV = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
RES = 2
ONLY = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
OUT = os.path.join(ROOT, 'assets/sonic3'); ORIG = os.path.join(ROOT, 'assets/originals/sonic3')
os.makedirs(OUT, exist_ok=True); os.makedirs(ORIG, exist_ok=True)
A_OBJ, B_OBJ = 'retro_level_objects_sprite_atlas.png', 'level_objects_b_pixel_atlas.png'
ROB, BOSS = 'robots_and_critters_sprite_atlas.png', 'neon_pixel_boss_atlas.png'
TERR, PROPS, BACK = 'jungle_terrain_tiles_atlas.png', 'retro_pixel_art_terrain_props_atlas.png', 'capas_de_fondo_de_jungla_pixel_art.png'
LOGO = 'seanic_the_hedgehog_pixel_logo.png'
# sheet: (atlas, ref game px (height of the first pose), anchor, [(sheet row(s), y0, y1, label end x, poses)])
# a list of rows in the first slot spreads the poses over several sheet rows, in order (row:count)
SHEETS = {
 'ring': (A_OBJ, 16, 'center', [('spin', 87, 190, 185, 8), ('sparkle', 218, 322, 185, 4)]),
 'spring': (A_OBJ, 26, 'bottom', [('yellow', 358, 486, 185, 3), ('red', 511, 638, 185, 3), ('yellowDiag', 661, 793, 185, 3), ('redDiag', 813, 945, 185, 3)]),
 'monitor': (A_OBJ, 30, 'bottom', [([('box', 2), ('broken', 1)], 1000, 1150, 160, 3)]),
 'icons': (A_OBJ, 13, 'center', [([(n, 1) for n in ('rings', 'shoes', 'star', 'fire', 'bubble', 'lightning', 'shield', 'trap')], 1198, 1330, 125, 8)]),
 'starpost': (B_OBJ, 46, 'bottom', [('idle', 80, 179, 168, 1), ('spin', 180, 277, 168, 8), ('lit', 283, 381, 168, 2)]),
 'sign': (B_OBJ, 58, 'bottom', [('done', 426, 538, 940, 1)]),
 'shields': (B_OBJ, 50, 'center', [('plain', 592, 670, 168, 4), ('fire', 670, 763, 168, 6), ('bubble', 766, 846, 168, 6), ('lightning', 850, 936, 168, 6), ('stars', 940, 1027, 168, 4)]),
 'fx': (B_OBJ, 22, 'center', [('pop', 1064, 1150, 168, 5), ('dust', 1166, 1212, 168, 4), ('spindust', 1222, 1290, 168, 6), ('rubble', 1304, 1356, 168, 4)]),
 'charger': (ROB, 26, 'bottom', [('roll', 64, 143, 325, 4), ('rev', 147, 218, 325, 2), ('charge', 223, 297, 325, 4)]),
 'thrower': (ROB, 26, 'center', [('idle', 314, 392, 325, 2), ('climb', 398, 501, 325, 4), ('throw', 504, 598, 325, 4)]),
 'shooter': (ROB, 28, 'bottom', [('closed', 615, 694, 335, 2), ('open', 695, 780, 335, 3), ('spit', 785, 866, 335, 2)]),
 'flyer': (ROB, 22, 'center', [('fly', 875, 959, 325, 4), ('dive', 969, 1058, 325, 2)]),
 'seed': (ROB, 12, 'center', [('spin', 1065, 1158, 335, 4)]),
 'critter': (ROB, 14, 'bottom', [('bird', 1170, 1240, 385, 2), ('rabbit', 1243, 1316, 385, 2), ('squirrel', 1321, 1392, 385, 2)]),
 'miniboss': (BOSS, 56, 'center', [('hover', 30, 136, 158, 2), ('attack', 138, 247, 128, 4), ('hit', 247, 345, 128, 1), ('wreck', 345, 464, 128, 3)]),
 'boss': (BOSS, 80, 'center', [('hover', 478, 610, 130, 2), ('attack', 618, 748, 128, 4), ('hit', 748, 862, 128, 1), ('wreck', 862, 990, 128, 3)]),
 'capsule': (BOSS, 56, 'bottom', [('shut', 1012, 1112, 158, 1), ('open', 1112, 1216, 158, 3)]),
 'flower': (PROPS, 26, 'bottom', [('sway', 866, 1020, 300, 4)]),
 'waterfall': (PROPS, 82, 'fit', [('flow', 1082, 1372, 0, 4)]),
}
# picture: (atlas, box x0,y0,x1,y1, 'w'|'h' game px to scale to, size, kind) kind: 'trim' (trim to the art) or 'tile' (inside of a bordered square)
PICTURES = {
 'jungle-soil': (TERR, (193, 124, 427, 357), 'w', 64, 'tile'),
 'jungle-rock': (TERR, (666, 124, 910, 357), 'w', 64, 'tile'),
 'jungle-grass': (TERR, (81, 428, 1040, 548), 'h', 30, 'trim'),
 'jungle-under': (TERR, (87, 611, 1031, 729), 'h', 26, 'trim'),
 'spikes': (TERR, (120, 783, 330, 957), 'w', 32, 'trim'),
 'rock-wall': (TERR, (520, 783, 845, 957), 'w', 40, 'trim'),
 'platform': (TERR, (100, 1024, 345, 1166), 'w', 64, 'trim'),
 'platform-crumble': (TERR, (480, 1024, 1020, 1166), 'w', 96, 'trim'),
 'bridge': (TERR, (60, 1232, 1060, 1370), 'h', 26, 'trim'),
 'vine-rope': (PROPS, (40, 114, 520, 232), 'h', 10, 'trim'),
 'vine-handle': (PROPS, (608, 114, 785, 232), 'w', 22, 'trim'),
 'zip-handle': (PROPS, (188, 296, 347, 484), 'w', 22, 'trim'),
 'zip-post': (PROPS, (610, 296, 782, 484), 'h', 44, 'trim'),
 'coconut': (PROPS, (66, 606, 174, 708), 'w', 12, 'trim'),
 'palm': (PROPS, (250, 545, 512, 786), 'h', 110, 'trim'),
 'bush': (PROPS, (560, 620, 772, 762), 'w', 52, 'trim'),
 'totem': (PROPS, (826, 552, 1082, 786), 'h', 56, 'trim'),
 'tree-trunk': (PROPS, (98, 866, 209, 1020), 'w', 24, 'trim'),
 'jungle-sky': (BACK, (23, 162, 1099, 328), 'w', 1024, 'trim'),
 'jungle-clouds': (BACK, (23, 397, 1099, 517), 'w', 1024, 'trim'),
 'jungle-sea': (BACK, (23, 614, 1099, 727), 'w', 1024, 'trim'),
 'jungle-island': (BACK, (23, 772, 1099, 928), 'w', 1024, 'trim'),
 'jungle-far': (BACK, (23, 1008, 1099, 1118), 'w', 1024, 'trim'),
 'jungle-near': (BACK, (23, 1200, 1099, 1367), 'w', 1024, 'trim'),
 'title-card': (BOSS, (126, 1230, 986, 1393), 'w', 300, 'trim'),
}
BLANK = {'jungle-island': [(0, 772, 245, 800)]}  # label text inside a crop box, painted out first

_cache = {}
def load(name):
    if name not in _cache:
        a = np.asarray(Image.open(os.path.join(SRC, name)).convert('RGB')).astype(int)
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        # the background is pure green (~4,249,5); the art's own greens (leaves, grass) carry red (64-150), so key tightly
        bg = (g > 150) & (r < 48) & (b < 48) & (g - r > 110)
        # one ring of blended edge pixels (still very green, little red) goes too
        edge = np.zeros_like(bg)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)): edge |= np.roll(np.roll(bg, dy, 0), dx, 1)
        bg |= edge & (r < 70) & (g > r + 50) & (g > b + 50)
        _cache[name] = (a.astype(np.uint8), ~bg)
    return _cache[name]
def runs(v):
    o, on = [], False
    for i, x in enumerate(v):
        if x and not on: on, s = True, i
        if not x and on: on = False; o.append([s, i])
    if on: o.append([s, len(v)])
    return o
def blobs(fg, y0, y1, x0, n):
    """the n poses of a row: column groups right of the label (gaps under 14 px joined), keeping the rightmost n"""
    cols = [list(c) for c in runs(fg[y0:y1, x0:].any(0))]
    for c in cols: c[0] += x0; c[1] += x0
    m = []
    for c in cols:
        if m and c[0] - m[-1][1] < 14: m[-1][1] = c[1]
        else: m.append(c)
    m = [c for c in m if c[1] - c[0] > 5]
    while len(m) > n and len(m) > 1:  # stray specks (motion lines, sparks) next to a pose: join the closest pair
        k = min(range(len(m) - 1), key=lambda i: m[i + 1][0] - m[i][1]); m[k:k + 2] = [[m[k][0], m[k + 1][1]]]
    if len(m) != n: raise SystemExit(f'expected {n} poses at y {y0}-{y1}, found {len(m)}: {m}')
    out = []
    for c0, c1 in m:
        ys = np.where(fg[y0:y1, c0:c1].any(1))[0]; out.append((c0, y0 + ys[0], c1, y0 + ys[-1] + 1))
    return out
def cut(atlas, box):
    a, fg = load(atlas); x0, y0, x1, y1 = box
    return Image.fromarray(np.dstack([a[y0:y1, x0:x1], (fg[y0:y1, x0:x1] * 255).astype(np.uint8)]), 'RGBA')
def scale(im, s):
    w, h = max(1, round(im.width * s)), max(1, round(im.height * s)); o = im.resize((w, h), Image.LANCZOS)
    al = np.asarray(o)[..., 3]; o.putalpha(Image.fromarray(((al > 100) * 255).astype(np.uint8))); return o
spec = json.loads(subprocess.check_output(['node', '-e', """const e={};new Function('exports','require',require('fs').readFileSync(process.argv[1],'utf8'))(e,()=>({}));
const o={};for(const n of Object.keys(e.SHEETS)){const d=e.sheetOf(n);if(d)o[n]={frame:d.frame,foot:d.foot,rows:d.rows};}console.log(JSON.stringify(o))""", os.path.join(ROOT, 'src/data/sonic3Sprites.js')]))
report = []
for name, (atlas, ref, anchor, rows) in SHEETS.items():
    if ONLY and name not in ONLY: continue
    d = spec[name]; fw, fh = d['frame']; fx, fy = d['foot']; srows = list(d['rows'].items()); cols = max(n for _, n in srows)
    poses = {}
    for target, y0, y1, x0, n in rows:
        got = blobs(load(atlas)[1], y0, y1, x0, n)
        names = target if isinstance(target, list) else [(target, n)]
        i = 0
        for row, cnt in names:
            poses[row] = got[i:i + cnt]; i += cnt
    for row, cnt in srows:
        if len(poses.get(row, [])) != cnt: raise SystemExit(f'{name}.{row}: {len(poses.get(row, []))} poses for {cnt} frames')
    first = poses[srows[0][0]][0]
    s = ref * RES / (first[3] - first[1]) if anchor != 'fit' else None
    sheet = Image.new('RGBA', (cols * fw * RES, len(srows) * fh * RES), (0, 0, 0, 0)); clip = 0
    for ri, (row, cnt) in enumerate(srows):
        for f, box in enumerate(poses[row]):
            im = cut(atlas, box)
            if anchor == 'fit': im = im.resize((fw * RES, fh * RES), Image.LANCZOS); px, py = 0, 0
            else:
                im = scale(im, s)
                px = fx * RES - im.width // 2
                py = fy * RES - (im.height if anchor == 'bottom' else im.height // 2)
                if px < 0 or py < 0 or px + im.width > fw * RES or py + im.height > fh * RES: clip += 1
            cell = Image.new('RGBA', (fw * RES, fh * RES), (0, 0, 0, 0)); cell.paste(im, (px, py), im)
            sheet.alpha_composite(cell, (f * fw * RES, ri * fh * RES))
    sheet.save(os.path.join(OUT, name + '.webp'), lossless=True, quality=100, method=6)
    report.append(f'{name}: {sum(c for _, c in srows)} frames' + (f', scale {s:.3f}' if s else '') + (f', {clip} poses run past the frame edge' if clip else ''))
for name, (atlas, box, axis, size, kind) in PICTURES.items():
    if ONLY and name not in ONLY: continue
    a, fg = load(atlas)
    for bx in BLANK.get(name, []):
        fg[bx[1]:bx[3], bx[0]:bx[2]] = False
    im = cut(atlas, box)
    al = np.asarray(im)[..., 3]; ys, xs = np.where(al > 0); im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    if kind == 'tile':  # cut the dark border off the square
        rgb = np.asarray(im)[..., :3].astype(int); dark = rgb.max(2) < 60; i = 0
        while i < min(im.size) // 4 and (dark[i, :].mean() > .5 or dark[:, i].mean() > .5 or dark[-1 - i, :].mean() > .5 or dark[:, -1 - i].mean() > .5): i += 1
        im = im.crop((i, i, im.width - i, im.height - i)).convert('RGB').resize((size, size), Image.LANCZOS)
        im.save(os.path.join(OUT, name + '.webp'), lossless=True, quality=100, method=6); report.append(f'{name}: tile {size}x{size}'); continue
    s = size * RES / (im.width if axis == 'w' else im.height); im = scale(im, s)
    im.save(os.path.join(OUT, name + '.webp'), lossless=True, quality=100, method=6); report.append(f'{name}: {im.width // RES}x{im.height // RES}')
if ONLY and 'logo' not in ONLY: print('\n'.join(report)); sys.exit(0)
# the game logo: the Arcade logo slot for the whole Seanic family (keyart:<family>-logo), trimmed, 1100 px wide
lg = cut(LOGO, (0, 0) + Image.open(os.path.join(SRC, LOGO)).size); al = np.asarray(lg)[..., 3]; ys, xs = np.where(al > 0)
lg = lg.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)); lg = scale(lg, 1100 / lg.width)
lg.save(os.path.join(ROOT, 'assets/keyart/sonic-logo.webp'), lossless=True, quality=100, method=6); report.append(f'logo: {lg.size}')
for f in os.listdir(SRC):
    if f.endswith('.png'): shutil.copy(os.path.join(SRC, f), os.path.join(ORIG, 'atlas-' + f))
print('\n'.join(report))
if PREV:
    os.makedirs(PREV, exist_ok=True)
    for n in list(SHEETS) + list(PICTURES):
        im = Image.open(os.path.join(OUT, n + '.webp')).convert('RGBA'); bg = Image.new('RGBA', im.size, (40, 60, 110, 255)); bg.alpha_composite(im); bg.save(os.path.join(PREV, n + '.png'))
