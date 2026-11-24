#!/usr/bin/env python3
"""Templates for the Warriors CYCLONE SPIN KICK strips spin-p1 / spin-p2 (src/data/ddSprites.js; owner, Nov 24: "make sprites
for the spinning kick instead of just rotating the character ... make templates for gpt, dont try to make it yourself").
8 frames of 256 x 256 = one full turn of the Double Dragon-style airborne spin kick: kicking leg held straight out the whole
time, the body turning. Writes <out>/spin-p1-template.png, spin-p2-template.png and spin-reference.png (the hero's look).
  python3 tools/warriors/spin-template.py [out]   (default docs/art-for-gpt/warriors-templates)
"""
import os, sys, math
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/art-for-gpt/warriors-templates')
C, PINK = 256, (255, 42, 106)
FACING = ['RIGHT (side)', 'right, turning\ntoward camera', 'CHEST to camera', 'left, turning\nfrom camera', 'LEFT (side)', 'left, turning\naway', 'BACK to camera', 'right, turning\nback']
def font(n):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f, n)
    return ImageFont.load_default()
def template(name, who):
    im = Image.new('RGBA', (C * 8, C), (226, 230, 234, 255)); d = ImageDraw.Draw(im); f1, f2 = font(15), font(11)
    for i in range(8):
        x0 = i * C; ang = i * math.pi / 4
        d.rectangle((x0 + 1, 1, x0 + C - 2, C - 2), outline=PINK + (120,), width=2)
        d.text((x0 + 6, 5), f'frame {i}', fill=PINK, font=f1)
        d.multiline_text((x0 + 6, 24), 'facing ' + FACING[i], fill=(60, 60, 70), font=f2, spacing=2)
        # top-down compass: which way the chest points (down = toward the camera)
        cx, cy, r = x0 + 220, 36, 22
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(90, 90, 100), width=2)
        ex, ey = cx + math.cos(ang) * r, cy + math.sin(ang) * r
        d.line((cx, cy, ex, ey), fill=PINK, width=4); d.ellipse((ex - 4, ey - 4, ex + 4, ey + 4), fill=PINK)
        d.text((cx - 26, cy + r + 3), 'seen from above', fill=(90, 90, 100), font=font(9))
        # the face circle (left EMPTY), the hip line the kicking leg runs along, the ground point under him
        fx, fy = x0 + 128, 56
        d.ellipse((fx - 22, fy - 22, fx + 22, fy + 22), outline=PINK, width=3)
        d.text((fx + 25, fy - 6), 'face (empty)', fill=PINK, font=f2)
        hip = 150; reach = 104 * abs(math.cos(ang)) + 22
        lx = x0 + 128 + (reach if math.cos(ang) >= 0 else -reach)
        for xx in range(int(min(x0 + 128, lx)), int(max(x0 + 128, lx)), 12): d.line((xx, hip, xx + 6, hip), fill=PINK, width=2)
        d.text((x0 + 6, hip + 6), 'kicking leg straight out\nalong the dashed line', fill=(60, 60, 70), font=f2, spacing=2)
        d.ellipse((x0 + 123, 239, x0 + 133, 249), fill=PINK); d.text((x0 + 138, 234), 'ground under him', fill=PINK, font=f2)
    d.text((8, C - 16), f'{name}: {who} - 8 frames of 256 x 256, transparent background, headless (stop at the neck), body in the air above the dot', fill=(40, 40, 48), font=f2)
    return im
os.makedirs(OUT, exist_ok=True)
template('spin-p1', "Sean's Warrior (leather vest, bare arms, brown trousers)").save(os.path.join(OUT, 'spin-p1-template.png'))
template('spin-p2', "Amber's Warrior").save(os.path.join(OUT, 'spin-p2-template.png'))
# the look to keep: each hero's standing, jump-kick and old spin cells from the game's sheets
ref = Image.new('RGBA', (C * 6, C + 24), (40, 44, 56, 255)); d = ImageDraw.Draw(ref)
POS = {'stand': 0, 'jkick': 20, 'spin': 21}
for j, sheet in enumerate(['hero-p1', 'hero-p2']):
    sh = Image.open(os.path.join(ROOT, 'assets/warriors', sheet + '.webp')).convert('RGBA')
    for k, (p, i) in enumerate(POS.items()):
        cell = sh.crop(((i % 8) * C, (i // 8) * C, (i % 8) * C + C, (i // 8) * C + C)); ref.alpha_composite(cell, ((j * 3 + k) * C, 24))
        d.text(((j * 3 + k) * C + 6, 4), f'{sheet} {p}', fill=(255, 255, 255), font=font(13))
ref.save(os.path.join(OUT, 'spin-reference.png'))
print('wrote', OUT)
