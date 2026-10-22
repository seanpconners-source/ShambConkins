#!/usr/bin/env python3
# Bucketheadland: Buckethead plays the left flipper. Builds assets/pinball/buckethead/playfield.webp and flipper-left.webp
# from the owner's GPT pictures in assets/originals/pinball/buckethead/ (gpt-01 empty stage, gpt-02 Buckethead with his
# right hand hanging clear of the guitar, gpt-03 the picking hand) on top of playfield-before-flipper-hand.webp.
# His wrist sits on the left flipper's pivot; the hand picture swings with the flipper (dropins.js drawFlipperImage).
# Needs: pip install pillow numpy opencv-python-headless, and node (reads the lamp positions from the table).
# Usage: python3 tools/pinball-art/buckethead-flipper-hand.py [scale .9] [lean degrees 0] [wrist|elbow]
import json, math, subprocess, sys, os
import numpy as np, cv2
from PIL import Image, ImageFilter, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = ROOT + '/assets/originals/pinball/buckethead/'; OUT = ROOT + '/assets/pinball/buckethead/'
K = float(sys.argv[1]) if len(sys.argv) > 1 else .9          # Buckethead's size (playfield px per GPT px)
ROT = float(sys.argv[2]) if len(sys.argv) > 2 else 0          # lean (degrees clockwise about his wrist), brings the strings under the pick
LAMPS_JS = """const fs=require('fs'),path=require('path'),root=process.argv[1],c={};
function req(id){if(c[id])return c[id];const e=c[id]={};const src=id==='src/data/userPortraits.js'?'Object.assign(exports,{USER_PORTRAITS:{}});':fs.readFileSync(path.join(root,id),'utf8');new Function('exports','require',src)(e,req);return e;}
console.log(JSON.stringify(req('src/engines/pinball/tables/buckethead.js').buildTable().lamps.map(l=>[l.x*2,l.y*2,l.r*2])));"""
LAMPS = json.loads(subprocess.check_output(['node', '-e', LAMPS_JS, ROOT]))
pf = Image.open(SRC + 'playfield-before-flipper-hand.webp').convert('RGBA')
# 1) empty stage over the lower playfield (x 0..1028, y 1100..2134), black borders cropped, top edge blended
st = Image.open(SRC + 'gpt-01-empty-stage.webp').convert('RGBA').crop((14, 0, 1000, 1024)).resize((1028, 1034), Image.LANCZOS)
Y0, BL = 1100, 150
m = Image.new('L', st.size, 255); d = ImageDraw.Draw(m)
for y in range(BL): d.line([(0, y), (1028, y)], fill=int(255 * (.5 - .5 * math.cos(math.pi * y / BL))))
pf.paste(st, (0, Y0), m)
# 4) Buckethead on the left flipper pivot (296,1892): by his wrist (default) or by his elbow
# the guitar's lower left edge where his hand hung over it (gpt-02 px): the fill is split along it so cream never smears into the robe
GUITAR = [(380,690),(372,715),(367,740),(366,770),(368,800),(372,825),(380,850),(390,868),(403,881),(420,893),(445,904),(480,912),(530,918),(640,700)]
def fill_split(a, hole):
  """Fills hole (uint8 mask) in RGBA array a: the guitar side is inpainted from guitar pixels only; the robe side is his robe in
  the shadow of the arm (cloth borrowed from his robe right of the guitar, x 615-650, darker near the cuff), ending at his body's
  soft left edge (red rim light lower down, then background)."""
  H2, W2 = a.shape[:2]; yy2, xx2 = np.mgrid[0:H2, 0:W2].astype(np.float32)
  g = Image.new('L', (W2, H2), 0); ImageDraw.Draw(g).polygon(GUITAR, fill=255); g = np.asarray(g) > 0
  band = cv2.dilate(hole, np.ones((25, 25), np.uint8)) > 0
  gm = ((hole > 0) | (band & ~g)).astype(np.uint8) * 255
  fg = cv2.inpaint(np.ascontiguousarray(a[..., :3]), gm, 9, cv2.INPAINT_TELEA).astype(np.float32)
  ex = 302 + (yy2 - 760) * 28 / 160 + 3 * np.sin(yy2 / 23) - xx2   # body's left edge (seen below the sleeve at y 900, x ~330)
  rim = (np.exp(-np.clip(-ex, 0, None) / 4) * np.clip((yy2 - 790) / 90, 0, 1))[..., None]; body = np.clip(.5 - ex / 3.5, 0, 1)
  sx = np.clip(615 + (xx2 - 290) * .4, 0, W2 - 1); sy = np.clip(yy2 - 15, 725, 930)   # robe cloth, stretched across
  cloth = cv2.remap(np.ascontiguousarray(a[..., :3]), sx.astype(np.float32), sy.astype(np.float32), cv2.INTER_LINEAR).astype(np.float32)
  dark = (.7 + .3 * np.clip((yy2 - 760) / 110, 0, 1))[..., None]   # deepest in the shadow right under the cuff
  fr = cloth * dark + rim * np.array([85, 20, 14], np.float32)
  gs = cv2.GaussianBlur(g.astype(np.float32), (5, 5), 1.2)                       # 3 px blend across the guitar outline
  shade = 1 - .4 * np.clip(cv2.GaussianBlur(g.astype(np.float32), (13, 13), 4) - g, 0, 1)   # robe darker against the guitar
  mix = fg * gs[..., None] + fr * shade[..., None] * (1 - gs[..., None])
  al = np.maximum(gs, body) * 255
  w = cv2.GaussianBlur((hole > 0).astype(np.float32), (7, 7), 1.5)[..., None]     # feathered into the untouched picture
  a[..., :3] = (a[..., :3] * (1 - w) + mix * w).clip(0, 255).astype(np.uint8)
  a[..., 3] = (a[..., 3] * (1 - w[..., 0]) + al * w[..., 0]).clip(0, 255).astype(np.uint8)
ELBOW = len(sys.argv) > 3 and sys.argv[3] == 'elbow'   # default: the hand is the flipper; 'elbow' = forearm version (gpt-04/05, owner passed on it)
PX, PY = 296, 1892
DY = 0 if ELBOW else 44   # owner, Oct 22: he sits lower (with the 2X-6X lamps) so the pick rides over the strings
if ELBOW:
  # 4) Buckethead (gpt-04): his right arm ends at the elbow in a sleeve opening; its centre (222,615) sits on the flipper pivot,
  # upright, so the forearm picture swings from the elbow and the pick rides over the strings from the bridge to the neck.
  bh = Image.open(SRC + 'gpt-04-buckethead-elbow.webp').convert('RGBA'); a = np.asarray(bh).copy()
  for y in range(930, 1024): a[y, :, 3] = (a[y, :, 3] * max(0, 1 - (y - 930) / 70)).astype(np.uint8)
  bh = Image.fromarray(a); WX, WY = 222, 615
else:
  # 4) Buckethead (gpt-02) with his hanging hand removed; he sits DY lower but his wrist stays on the pivot, so the hanging
  # sleeve is shortened (squashed up from mid-arm, the cuff lifted by the full amount). Everything the hand and the old
  # sleeve end uncover is filled in one go (fill_split).
  bh = Image.open(SRC + 'gpt-02-buckethead-new-pose.webp').convert('RGBA'); a = np.asarray(bh).copy(); H2, W2 = a.shape[:2]
  WX, WY = 345, 795
  hand = [(307,785),(372,780),(388,825),(400,865),(406,892),(398,904),(382,918),(360,926),(334,918),(315,892),(309,850),(305,810)]
  mk = Image.new('L', bh.size, 0); ImageDraw.Draw(mk).polygon(hand, fill=255); mk = np.asarray(mk.filter(ImageFilter.MaxFilter(5)))
  arm = [(240,365),(205,450),(188,540),(184,620),(203,700),(214,780),(222,852),(260,870),(304,868),(304,812),(376,800),
         (378,760),(370,705),(356,690),(334,610),(322,520),(318,365)]
  am = Image.new('L', (W2, H2), 0); ImageDraw.Draw(am).polygon(arm, fill=255); am = np.asarray(am.filter(ImageFilter.GaussianBlur(2))).astype(np.float32)
  gd = Image.new('L', (W2, H2), 0); ImageDraw.Draw(gd).polygon(GUITAR, fill=255); gd = np.asarray(gd.filter(ImageFilter.GaussianBlur(1)))
  am = am * (1 - mk / 255) * (1 - gd / 255)                     # no skin or guitar in the sleeve layer
  dg = DY / K; yy2 = np.arange(H2, dtype=np.float32); t = np.clip((yy2 - 520) / (790 - 520), 0, 1); f = t * t * (3 - 2 * t)
  mapy = np.repeat((yy2 + dg * f)[:, None], W2, 1).astype(np.float32); mapx = np.repeat(np.arange(W2, dtype=np.float32)[None], H2, 0)
  layer = np.dstack([a[..., :3], (a[..., 3] * am / 255).astype(np.uint8)])
  wl = cv2.remap(layer, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
  wm = cv2.remap(am, mapx, mapy, cv2.INTER_LINEAR)               # where the shortened sleeve still covers
  hole = ((mk > 0) | ((am > 40) & (wm < 200))).astype(np.uint8) * 255
  fill_split(a, cv2.dilate(hole, np.ones((5, 5), np.uint8)))
  base = Image.fromarray(a); base.alpha_composite(Image.fromarray(wl)); a = np.asarray(base).copy()   # cuff now dg higher: on the pivot
  for y in range(930, 1024): a[y, :, 3] = (a[y, :, 3] * max(0, 1 - (y - 930) / 70)).astype(np.uint8)
  bh = Image.fromarray(a)
if ROT:   # lean about the wrist (padded so nothing is clipped)
  pad = Image.new('RGBA', (2048, 2048), (0, 0, 0, 0)); pad.alpha_composite(bh, (512, 512))
  bh = pad.rotate(-ROT, resample=Image.BICUBIC, center=(WX + 512, WY + 512)); WX, WY = WX + 512, WY + 512
bw = bh.resize((round(bh.width * K), round(bh.height * K)), Image.LANCZOS); ox, oy = round(PX - WX * K), round(PY - WY * K) + DY
sh = Image.new('RGBA', bw.size, (0, 0, 0, 0)); sh.putalpha(bw.getchannel('A').point(lambda v: v * .55)); sh = sh.filter(ImageFilter.GaussianBlur(8))
def paste(im, x, y): pf.alpha_composite(im, (max(x, 0), max(y, 0)), (max(-x, 0), max(-y, 0)))   # he may hang off the left edge
paste(sh, ox + 6, oy + 8); paste(bw, ox, oy)
print('Buckethead at', ox, oy, 'size', bw.size, 'scale', K, 'lean', ROT, 'elbow' if ELBOW else 'wrist')
# 5) soft dark spots under the lamps in the new area, over Buckethead too (the old art has them; the inserts must read over busy art)
arr = np.asarray(pf).astype(np.float32); H, W = arr.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]
fac = np.ones((H, W), np.float32)
for x, y, r in LAMPS:
  if y < Y0 + 40: continue
  R = r * 2.2; dd = np.sqrt((xx - x) ** 2 + (yy - y) ** 2) / R
  fac = np.minimum(fac, np.where(dd < 1, 1 - .55 * (.5 + .5 * np.cos(np.pi * np.clip(dd, 0, 1))), 1))
arr[..., :3] *= fac[..., None]; pf = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
# 6) the sign (owner's logo.webp) in the night sky at the top of the arch, above the B-O-T lanes (owner, Oct 22: it used to
#    sit between the ramps over Buckethead's bucket at x 472, y 1287, 510 wide)
logo = Image.open(OUT + 'logo.webp').convert('RGBA')
LX, LY, LW = 514, 34, 460; logo = logo.resize((LW, round(LW * logo.height / logo.width)), Image.LANCZOS)
sh = Image.new('RGBA', logo.size, (0, 0, 0, 0)); sh.putalpha(logo.getchannel('A').point(lambda v: v * .6))
sh = sh.filter(ImageFilter.GaussianBlur(6)); pf.alpha_composite(sh, (LX - LW // 2 + 4, LY + 6)); pf.alpha_composite(logo, (LX - LW // 2, LY))
pf.convert('RGB').save(OUT + 'playfield.webp', quality=90)
# 7) flipper-left (600 x 200, pivot (120,100), flipper end (510,100)): the forearm (elbow mode) or the hand alone (wrist mode)
if ELBOW:
  # flipper-left = the forearm (gpt-05): elbow end (150,470) on the pivot (120,100), pick tip (1470,524) at ~545
  hd = Image.open(SRC + 'gpt-05-strumming-forearm.webp').convert('RGBA')
  P0, P1 = (150, 470), (1470, 524)
  ang = math.degrees(math.atan2(P1[1] - P0[1], P1[0] - P0[0])); hd = hd.rotate(ang, resample=Image.BICUBIC, center=P0)
  sc = (545 - 120) / math.hypot(P1[0] - P0[0], P1[1] - P0[1]); SQ = .95
  hs = hd.resize((round(hd.width * sc), round(hd.height * sc * SQ)), Image.LANCZOS)
  fl = Image.new('RGBA', (600, 200), (0, 0, 0, 0)); fl.alpha_composite(hs, (round(120 - P0[0] * sc), round(100 - P0[1] * sc * SQ)))
else:
  hd = Image.open(SRC + 'gpt-03-left-flipper-picking-hand.webp').convert('RGBA')
  P0, P1 = (600, 468), (1390, 505)               # cuff edge (wrist) and pick tip in the GPT picture
  ang = math.degrees(math.atan2(P1[1] - P0[1], P1[0] - P0[0]))
  hd = hd.rotate(ang, resample=Image.BICUBIC, center=P0)   # tip now level with the wrist
  sc = (545 - 120) / math.hypot(P1[0] - P0[0], P1[1] - P0[1]); SQ = .85   # slimmer across, so it hugs the flipper
  hd = hd.crop((P0[0] - 40, 0, hd.width, hd.height))         # keep only a lip of the cuff; the sleeve is on the playfield
  hs = hd.resize((round(hd.width * sc), round(hd.height * sc * SQ)), Image.LANCZOS)
  fl = Image.new('RGBA', (600, 200), (0, 0, 0, 0)); fl.alpha_composite(hs, (round(120 - 40 * sc), round(100 - P0[1] * sc * SQ)))
  fa = np.asarray(fl).copy(); x0 = round(120 - 40 * sc)
  for x in range(x0, x0 + 50): fa[:, x, 3] = (fa[:, x, 3] * ((x - x0) / 50) ** .8).astype(np.uint8)   # wrist melts into the sleeve
  fa[:, :x0, 3] = 0; fl = Image.fromarray(fa)
# outline so the hand reads as a flipper on a phone: a dark edge (on the cream guitar) inside a soft warm glow (on the robe)
A = fl.getchannel('A'); edge = A.filter(ImageFilter.MaxFilter(9)); glow = A.filter(ImageFilter.MaxFilter(17)).filter(ImageFilter.GaussianBlur(5))
ol = Image.new('RGBA', fl.size, (255, 214, 140, 0)); ol.putalpha(glow.point(lambda v: v * .55))
dk = Image.new('RGBA', fl.size, (20, 6, 10, 0)); dk.putalpha(edge.point(lambda v: v * .9)); ol.alpha_composite(dk); ol.alpha_composite(fl); fl = ol
fl.save(OUT + 'flipper-left.webp', quality=92); print('hand scale', round(sc, 3))
