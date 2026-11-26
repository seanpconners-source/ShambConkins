#!/usr/bin/env python3
# Templates for THE PRICE IS RIGHT EPISODE art (slots in src/data/showSprites.js, the '---- THE EPISODE' block; brief
# docs/art-for-gpt/TPIR-EPISODE-ART.md). Every slot gets <slot>-template.png at the exact size: pink guides on a checkerboard
# (= transparent) or grey (= opaque picture), labels saying what goes where. Style references copied next to them:
# host.png (the host as he is now), cr-body-1.png (a contestant body, for the family), stage-row.png (the studio look).
#   python3 tools/gameshow/episode-templates.py [outDir]   (default docs/art-for-gpt/tpir-episode-templates)
import os, sys, json, subprocess
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/art-for-gpt/tpir-episode-templates')
os.makedirs(OUT, exist_ok=True)
# the geometry straight from the game's own table
js = r"""const {req}=await import(process.argv[1]+'/tests/load.mjs');const S=req('src/data/showSprites.js');
console.log(JSON.stringify({SLOTS:S.SLOTS,TV:S.TV_GEOM,FAMILY:S.FAMILY,BYE:S.HOST_BYE,POD:S.SC_PODIUM,DOOR:S.DOOR,TT:S.TURNTABLE}));"""
G = json.loads(subprocess.run(['node', '--input-type=module', '-e', js, ROOT], capture_output=True, text=True, cwd=ROOT).stdout)
PINK = (255, 42, 106, 255)
def font(px):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def canvas(w, h, transparent):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if transparent:
        s = 32
        for y in range(0, h, s):
            for x in range(0, w, s):
                d.rectangle([x, y, x + s - 1, y + s - 1], fill=(236, 236, 236, 255) if (x // s + y // s) % 2 else (214, 214, 214, 255))
    else:
        d.rectangle([0, 0, w, h], fill=(150, 150, 160, 255))
    return im, d
def label(d, text, x, y, px=26):
    f = font(px); b = d.textbbox((x, y), text, font=f)
    d.rectangle([b[0] - 6, b[1] - 4, b[2] + 6, b[3] + 4], fill=(255, 255, 255, 235)); d.text((x, y), text, font=f, fill=PINK)
def box(d, r, dash=False, w=4):
    x, y, ww, hh = r
    d.rectangle([x, y, x + ww, y + hh], outline=PINK, width=w)
def circle(d, cx, cy, r, w=4): d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=PINK, width=w)
def save(im, slot): im.save(os.path.join(OUT, slot + '-template.png'))
S = G['SLOTS']
# ---- the TV set: screen hole
for slot, g in G['TV'].items():
    im, d = canvas(g['w'], g['h'], False); x, y, w, h = g['screen']
    d.rounded_rectangle([x, y, x + w, y + h], radius=int(w * .06), fill=(0, 0, 0, 0), outline=PINK, width=6)
    fs = max(20, w // 34); label(d, 'SCREEN = SEE-THROUGH HOLE', x + 30, y + 30, fs); label(d, '4:3, rounded corners like a real tube', x + 30, y + 30 + fs * 1.6, int(fs * .8))
    label(d, 'the game shows the TV listings through it', x + 30, y + 30 + fs * 3, int(fs * .8))
    label(d, slot + f'  {g["w"]} x {g["h"]}  the TV set + a dim 90s room around it', 20, g['h'] - 60, 28); save(im, slot)
# ---- promo stills (opaque 4:3)
for n in range(1, 5):
    slot = f'guide-promo-{n}'; im, d = canvas(640, 480, False); label(d, slot + ' 640 x 480 (4:3, opaque)', 20, 20, 24)
    label(d, 'shown small in the channel guide window', 20, 60, 20); label(d, 'soft 90s broadcast look', 20, 90, 20); save(im, slot)
# ---- studios (opaque)
for slot in ['stage-showcase', 'stage-showcase-tall', 'stage-showcase-fold']:
    w, h = S[slot]['w'], S[slot]['h']; im, d = canvas(w, h, False)
    tall = h > w * 1.15
    box(d, [int(w * .2), int(h * .18), int(w * .6), int(h * .48)] if not tall else [int(w * .06), int(h * .16), int(w * .88), int(h * .36)])
    label(d, 'the prizes are shown here: keep it calm (turntable floor)', int(w * .21) if not tall else int(w * .07), int(h * .19) if not tall else int(h * .17), 28)
    fy = int(h * .72) if not tall else int(h * .58); d.line([0, fy, w, fy], fill=PINK, width=4); label(d, 'the stage floor line', 20, fy + 8, 26)
    pr = [int(w * .62), int(h * .62), int(w * .36), int(h * .34)] if not tall else [int(w * .04), int(h * .62), int(w * .92), int(h * .3)]
    box(d, pr); label(d, 'the two showcase podiums go here (the game draws them)', pr[0] + 10, pr[1] + 10, 24)
    label(d, f'{slot} {w} x {h}  EMPTY: no people, no podiums, no prizes', 20, 20, 30); save(im, slot)
# ---- showcase podium
g = G['POD']; im, d = canvas(g['w'], g['h'], True); box(d, g['bid']); label(d, 'BID WINDOW (black, game prints)', g['bid'][0], g['bid'][1] + g['bid'][3] + 8, 22)
box(d, g['name']); label(d, 'NAME PANEL', g['name'][0], g['name'][1] - 40, 22); d.line([0, g['h'] - 6, g['w'], g['h'] - 6], fill=PINK, width=4); label(d, 'floor', 10, g['h'] - 44, 20); save(im, 'showcase-podium')
# ---- door half
g = G['DOOR']; im, d = canvas(g['w'], g['h'], False); d.line([g['w'] - 4, 0, g['w'] - 4, g['h']], fill=PINK, width=8)
label(d, 'LEFT half of the sliding stage door', 30, 30, 32); label(d, 'inner edge (meets the right half) -->', 30, g['h'] // 2, 30); label(d, 'opaque, fills the picture', 30, 90, 26); save(im, 'door-panel')
# ---- turntable
g = G['TT']; im, d = canvas(g['w'], g['h'], True); cx, cy, rx, ry = g['top']; d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=PINK, width=6)
label(d, 'TOP of the turntable: prizes stand on this ellipse', cx - rx + 40, cy - 20, 30); label(d, 'transparent around', 20, 20, 24); save(im, 'turntable')
# ---- family sheets (headless, 8 poses)
F = G['FAMILY']
for n in range(1, 5):
    slot = f'family-{n}'; im, d = canvas(F['w'] * 8, F['h'], True)
    for j, f in enumerate(F['frames']):
        x0 = j * F['w']; d.rectangle([x0, 0, x0 + F['w'] - 1, F['h'] - 1], outline=PINK, width=2)
        sy = F['spot'][1] + (60 if n == 4 else 0); r = int(F['w'] * F['faceW'] * 1.25)
        circle(d, x0 + F['spot'][0], sy, r); circle(d, x0 + F['feet'][0], F['feet'][1], 10)
        label(d, f.upper(), x0 + 12, 12, 26); label(d, 'FACE: leave empty', x0 + 12, sy + r + 12, 18)
    label(d, 'HEADLESS bodies: stop at the neck under the circle; feet on the dots; transparent', 12, F['h'] - 46, 26); save(im, slot)
# ---- host goodbye
B = G['BYE']; im, d = canvas(B['w'] * 3, B['h'], True)
for j, f in enumerate(B['frames']):
    x0 = j * B['w']; d.rectangle([x0, 0, x0 + B['w'] - 1, B['h'] - 1], outline=PINK, width=2); circle(d, x0 + B['feet'][0], B['feet'][1], 10); label(d, f.upper(), x0 + 12, 12, 30)
label(d, 'the SAME host as host.png, full body, feet on the dot, transparent', 12, B['h'] - 50, 26); save(im, 'host-bye')
# ---- commercials, credits, tally (opaque)
for slot in ['ad-fightmilk', 'ad-brawndo', 'ad-rumham', 'credits-bg', 'credits-bg-tall', 'tally-bg', 'tally-bg-tall']:
    w, h = S[slot]['w'], S[slot]['h']; im, d = canvas(w, h, False); label(d, f'{slot} {w} x {h} (opaque)', 20, 20, 30)
    if slot.startswith('ad-'): box(d, [0, int(h * .68), w - 1, int(h * .32) - 1]); label(d, 'bottom third: calm (game writes the slogan here)', 20, int(h * .68) + 16, 28)
    elif slot.startswith('credits'): box(d, [int(w * .2), int(h * .1), int(w * .6), int(h * .8)]); label(d, 'credits scroll here: darker, calm', int(w * .2) + 12, int(h * .1) + 12, 26)
    else: box(d, [int(w * .1), int(h * .14), int(w * .8), int(h * .74)]); label(d, 'the winnings table goes here: empty panel', int(w * .1) + 12, int(h * .14) + 12, 26)
    save(im, slot)
# ---- prize photos: one 512 x 512 per catalog prize (assets/prizes/<id>.webp -> prize:<id>; the games show the emoji until one is in)
im, d = canvas(512, 512, True); box(d, [40, 40, 432, 432]); label(d, 'the product, centred, fills the box', 50, 50, 22); label(d, 'transparent around, soft shadow ok', 50, 84, 20)
label(d, 'file name = the prize id', 50, 440, 20); save(im, 'prize-photo')
cat = json.loads(subprocess.run(['node', '--input-type=module', '-e', r"""const {req}=await import(process.argv[1]+'/tests/load.mjs');const P=req('src/data/showPrizes.js');
const L=[['small',P.PRIZES],['mid',P.MID_PRIZES],['one-bid',P.BID_PRIZES],['grand',P.GRAND_PRIZES],['car',P.CARS],['trip',P.TRIPS],['big',P.BIG]];
console.log(JSON.stringify(L.flatMap(([k,a])=>a.map(r=>[r[0],r[1],r[2],k,P.hasPhoto?0:0]))));""", ROOT], capture_output=True, text=True, cwd=ROOT).stdout)
have = set(f.rsplit('.', 1)[0] for f in os.listdir(os.path.join(ROOT, 'assets/prizes'))) if os.path.isdir(os.path.join(ROOT, 'assets/prizes')) else set()
todo = [r for r in cat if r[0] not in have]
with open(os.path.join(OUT, 'PRIZE-PHOTOS-TODO.csv'), 'w') as f:
    f.write('batch,file name,what it is,price,kind\n')
    for i, r in enumerate(todo): f.write(f'{i // 25 + 1},{r[0]}.png,"{r[1]}",{r[2]},{r[3]}\n')
print('prize photos to make:', len(todo), 'batches of 25:', (len(todo) + 24) // 25)
# style references
for src, dst in [('assets/gameshow/host.webp', 'REF-host.png'), ('assets/gameshow/cr-body-1.webp', 'REF-contestant-body.png'), ('assets/gameshow/stage-row.webp', 'REF-studio.png'), ('assets/gameshow/cr-podium.webp', 'REF-contestants-row-podium.png')]:
    p = os.path.join(ROOT, src)
    if os.path.exists(p):
        im = Image.open(p); im.thumbnail((1400, 1400)); im.save(os.path.join(OUT, dst))
print('templates in', OUT, len(os.listdir(OUT)))
