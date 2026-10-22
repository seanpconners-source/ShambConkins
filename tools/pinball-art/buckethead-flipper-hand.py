#!/usr/bin/env python3
# Bucketheadland: Buckethead plays the left flipper. Builds assets/pinball/buckethead/playfield.webp and flipper-left.webp
# from the owner's GPT pictures in assets/originals/pinball/buckethead/ (gpt-01 empty stage, gpt-02 Buckethead with his
# right hand hanging clear of the guitar, gpt-03 the picking hand) on top of playfield-before-flipper-hand.webp.
# His wrist sits on the left flipper's pivot; the hand picture swings with the flipper (dropins.js drawFlipperImage).
# Needs: pip install pillow numpy opencv-python-headless, and node (reads the lamp positions from the table).
# Usage: python3 tools/pinball-art/buckethead-flipper-hand.py [scale .5]
import json, math, subprocess, sys, os
import numpy as np, cv2
from PIL import Image, ImageFilter, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = ROOT + '/assets/originals/pinball/buckethead/'; OUT = ROOT + '/assets/pinball/buckethead/'
K = float(sys.argv[1]) if len(sys.argv) > 1 else .5          # Buckethead's size (playfield px per GPT px)
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
# 2) soft dark spots under the lamps in the new area (the old art has them; the inserts must read over busy art)
arr = np.asarray(pf).astype(np.float32); H, W = arr.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]
fac = np.ones((H, W), np.float32)
for x, y, r in LAMPS:
  if y < Y0 + 40: continue
  R = r * 2.2; dd = np.sqrt((xx - x) ** 2 + (yy - y) ** 2) / R
  fac = np.minimum(fac, np.where(dd < 1, 1 - .55 * (.5 + .5 * np.cos(np.pi * np.clip(dd, 0, 1))), 1))
arr[..., :3] *= fac[..., None]; pf = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
# 3) the sign (owner's logo.webp) between the ramps, above the 2X-6X row
logo = Image.open(OUT + 'logo.webp').convert('RGBA')
LW = 510; logo = logo.resize((LW, round(LW * logo.height / logo.width)), Image.LANCZOS)
sh = Image.new('RGBA', logo.size, (0, 0, 0, 0)); sh.putalpha(logo.getchannel('A').point(lambda v: v * .6))
sh = sh.filter(ImageFilter.GaussianBlur(6)); pf.alpha_composite(sh, (472 - LW // 2 + 4, 1287 + 6)); pf.alpha_composite(logo, (472 - LW // 2, 1287))
# 4) Buckethead: hanging right hand erased (inpainted), bottom faded, wrist (345,795) on the left flipper pivot (296,1892)
bh = Image.open(SRC + 'gpt-02-buckethead-new-pose.webp').convert('RGBA'); a = np.asarray(bh).copy()
hand = [(307,785),(372,780),(388,825),(400,865),(406,892),(398,904),(382,918),(360,926),(334,918),(315,892),(309,850),(305,810)]
mk = Image.new('L', bh.size, 0); ImageDraw.Draw(mk).polygon(hand, fill=255); mk = np.asarray(mk.filter(ImageFilter.MaxFilter(5)))
rgb = cv2.inpaint(np.ascontiguousarray(a[..., :3]), mk, 9, cv2.INPAINT_TELEA); a[..., :3] = np.where(mk[..., None] > 0, rgb, a[..., :3])
# alpha inside the hand: the robe/guitar fill only where the surroundings were solid (left of the robe edge it stays clear)
al = a[..., 3].astype(np.float32); alf = cv2.inpaint(al.astype(np.uint8), mk, 9, cv2.INPAINT_TELEA); a[..., 3] = np.where(mk > 0, alf, a[..., 3])
for y in range(930, 1024): a[y, :, 3] = (a[y, :, 3] * max(0, 1 - (y - 930) / 70)).astype(np.uint8)
bh = Image.fromarray(a)
WX, WY = 345, 795; PX, PY = 296, 1892
bw = bh.resize((round(1024 * K), round(1024 * K)), Image.LANCZOS); ox, oy = round(PX - WX * K), round(PY - WY * K)
sh = Image.new('RGBA', bw.size, (0, 0, 0, 0)); sh.putalpha(bw.getchannel('A').point(lambda v: v * .55)); sh = sh.filter(ImageFilter.GaussianBlur(8))
pf.alpha_composite(sh, (ox + 6, oy + 8)); pf.alpha_composite(bw, (ox, oy))
print('Buckethead at', ox, oy, 'size', bw.size, 'bucket top y', oy + round(22 * K))
pf.convert('RGB').save(OUT + 'playfield.webp', quality=90)
# 5) the hand for flipper-left (600 x 200, pivot (120,100), flipper end (510,100)): cuff edge -> pivot, pick tip -> ~545
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
