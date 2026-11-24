#!/usr/bin/env python3
"""Templates for THE WARRIORS radio DJ cutscene pictures (src/data/warriorsDJ.js).

Writes into docs/art-for-gpt/warriors-templates (or the folder given):
  dj-<wide|tall|fold>-template.png  the picture size, where the face / eyes / mouth go, what the game covers
  dj-mouths-reference.png           the 6 frames to make (closed, small, ah, ee, oo, blink)
Usage: python3 tools/warriors/dj-templates.py [outDir]
"""
import json, os, re, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/art-for-gpt/warriors-templates')
os.makedirs(OUT, exist_ok=True)
src = open(os.path.join(ROOT, 'src/data/warriorsDJ.js')).read()
DJ = json.loads(re.search(r'/\*@@DJ\*/(.*?)/\*@@\*/', src, re.S).group(1))
PINK, GREY, DARK = (255, 42, 106), (226, 230, 234), (60, 60, 70)
def font(px, bold=False):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else '')
    try: return ImageFont.truetype(f, px)
    except OSError: return ImageFont.load_default()

def hatch(d, box, col, step=26):
    x0, y0, x1, y1 = box
    for k in range(int(x0 - (y1 - y0)), int(x1), step):
        d.line([(k, y1), (k + (y1 - y0), y0)], fill=col, width=2)

for shape, g in DJ['guide'].items():
    W, H = g['size']
    im = Image.new('RGB', (W, H), GREY); d = ImageDraw.Draw(im)
    s = min(W, H) / 1080
    bar = int(H * .08)
    # covered by the game: letterbox bars + the subtitle box
    for box in [(0, 0, W, bar), (0, H - bar, W, H)]:
        d.rectangle(box, fill=(200, 204, 210)); hatch(d, box, (170, 174, 182))
    sub = (int(W * .03), g['subtitles'], int(W * .97), H - bar)
    d.rectangle(sub, outline=(150, 150, 160), width=3); hatch(d, sub, (200, 200, 206), 34)
    d.text((sub[0] + 20 * s, sub[1] + 16 * s), 'SUBTITLE BOX covers this (keep it calm and darker: desk, records, mixer)', fill=DARK, font=font(int(26 * s)))
    d.text((20 * s, bar * .25), 'black bar (covered)', fill=DARK, font=font(int(22 * s)))
    d.text((20 * s, H - bar * .75), 'black bar (covered)', fill=DARK, font=font(int(22 * s)))
    # the DJ
    fx, fy, rx, ry = g['face']
    d.ellipse((fx - rx, fy - ry, fx + rx, fy + ry), outline=PINK, width=5)
    d.ellipse((fx - rx * 1.9, fy + ry * .9, fx + rx * 1.9, fy + ry * 3.2), outline=(255, 150, 180), width=4)
    ex, ey, ew, eh = g['eyes']; d.rectangle((ex, ey, ex + ew, ey + eh), outline=(80, 140, 255), width=4)
    d.text((ex + ew + 14 * s, ey + 10 * s), 'EYES (blink frame)', fill=(40, 90, 220), font=font(int(24 * s), True))
    mx, my, mw, mh = g['mouth']; d.rectangle((mx, my, mx + mw, my + mh), outline=PINK, width=5)
    d.text((mx + mw + 14 * s, my + 16 * s), 'MOUTH (the frames change ONLY this)', fill=PINK, font=font(int(24 * s), True))
    d.text((fx - rx, fy - ry - 40 * s), 'THE DJ\'S FACE: big, facing us, close to the mic', fill=PINK, font=font(int(26 * s), True))
    d.text((fx - rx * 1.6, fy + ry * 1.7), 'shoulders / headphones / top', fill=(200, 90, 130), font=font(int(22 * s)))
    # prop suggestions
    side = 1 if fx < W * .55 else -1
    tips = [('ON AIR light (lit red)', (int(W * .06), int(bar + 40 * s))),
            ('window: the city at night, rain', (int(W * .06), int(H * .28))),
            ('microphone on a boom arm, near the mouth', (int(min(W - 560 * s, fx + rx * 1.15)), int(fy + ry * .2)))]
    for t, (tx, ty) in tips:
        d.rectangle((tx - 8, ty - 6, tx + len(t) * 14 * s + 8, ty + 36 * s), outline=(120, 120, 130), width=2)
        d.text((tx, ty), t, fill=DARK, font=font(int(24 * s)))
    title = f'dj-{shape}.png  {W} x {H}   (+ the 5 frames: dj-{shape}-small/ah/ee/oo/blink.png)'
    d.text((20 * s, bar + 6 * s), title, fill=DARK, font=font(int(30 * s), True))
    im.save(os.path.join(OUT, f'dj-{shape}-template.png'))

# the mouth chart: drawn simply, our own shapes
W, H = 1800, 420
im = Image.new('RGB', (W, H), GREY); d = ImageDraw.Draw(im)
frames = [('closed', 'dj-<shape>.png\nthe main picture', 0, 0),
          ('small', 'm n t d s l r', .35, 0),
          ('ah', '"a" (wide open)', 1, 0),
          ('ee', '"e" "i" (wide, teeth)', .45, 1),
          ('oo', '"o" "u" "w" (round)', .8, 2),
          ('blink', 'eyes shut,\nmouth closed', 0, 0)]
for i, (name, what, open_, kind) in enumerate(frames):
    cx, cy = 150 + i * 300, 170
    if name == 'blink':
        for dx in (-50, 50): d.arc((cx + dx - 34, cy - 60, cx + dx + 34, cy - 10), 20, 160, fill=DARK, width=6)
    else:
        for dx in (-50, 50): d.ellipse((cx + dx - 22, cy - 56, cx + dx + 22, cy - 26), outline=DARK, width=5)
    w = 110 if kind != 2 else 60; h = 8 + 70 * open_
    if kind == 1: w = 140
    d.ellipse((cx - w / 2, cy + 40 - h / 2, cx + w / 2, cy + 40 + h / 2), fill=(200, 40, 80), outline=(120, 10, 40), width=4)
    if open_ > .2: d.ellipse((cx - w / 2 + 12, cy + 40 - h / 2 + 8, cx + w / 2 - 12, cy + 40 + h / 2 - 8), fill=(40, 10, 20))
    if kind == 1: d.rectangle((cx - w / 2 + 16, cy + 40 - h / 2 + 6, cx + w / 2 - 16, cy + 40 - h / 2 + 18), fill=(250, 250, 245))
    d.text((cx - 110, 260), f'dj-<shape>-{name}.png' if name != 'closed' else name, fill=PINK, font=font(22, True))
    d.multiline_text((cx - 110, 300), what, fill=DARK, font=font(20))
d.text((20, 14), 'Make the main picture first (mouth closed). Then 5 copies of THAT SAME picture, changing ONLY the mouth (or the eyes for blink).', fill=DARK, font=font(24, True))
im.save(os.path.join(OUT, 'dj-mouths-reference.png'))
print('dj templates ->', OUT)
