#!/usr/bin/env python3
"""Flappy Disaster art templates for GPT.

Writes docs/art-for-gpt/flappy-templates/:
  bg-template.png      2048 x 1248  every bg-<stage> picture: what the game draws on top, the seam rule
  ground-template.png   512 x 192   every ground-<stage> strip
  (ref-<stage>.jpg = screenshots of the game's own drawn stage, made by a separate browser script; see FLAPPY-ART.md)
Usage: python3 tools/flappy-templates.py [out dir]
Import: finished PNGs -> assets/flappy/<slot>.webp lossless, originals in assets/originals/flappy/.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/art-for-gpt/flappy-templates')
PINK = (255, 0, 160)

def font(n):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, n)
    return ImageFont.load_default()

def bg():
    # world units x2: the scenery is 624 units tall (sky top to the ground line), one tile is 1024 units wide
    W, H = 2048, 1248
    im = Image.new('RGB', (W, H), (226, 232, 238)); d = ImageDraw.Draw(im)
    d.rectangle([2, 2, W - 3, H - 3], outline=PINK, width=4)
    # pipes the game draws over the picture (128 px wide = 64 units; gaps ~150-176 units tall), one every ~200-236 units
    for i, px in enumerate(range(260, W, 460)):
        gy = (420, 760, 560, 900, 640)[i % 5]
        for y0, y1 in ((0, gy - 160), (gy + 160, H)):
            d.rectangle([px, y0, px + 128, y1], fill=(206, 214, 222), outline=(170, 180, 190), width=3)
    d.line([(0, H - 4), (W, H - 4)], fill=PINK, width=8)
    f1, f2 = font(56), font(30)
    d.text((W / 2, 140), 'FLAPPY DISASTER  bg-<stage>  2048 x 1248', fill=(60, 60, 70), font=f1, anchor='mm')
    lines = ['The scenery behind the pipes, from the top of the screen down to the ground line (bottom edge).',
             'It REPEATS side to side: the right edge must continue into the left edge with no seam.',
             'Grey columns = where the game draws its pipes (they move): keep the scene behind them simple,',
             'no strong vertical lines or bright spots the bird could be confused with. No text, no UI, no bird.',
             'Pink line at the bottom = the ground line: the game draws the ground strip below it.']
    for i, l in enumerate(lines): d.text((W / 2, 260 + i * 46), l, fill=(70, 70, 80), font=f2, anchor='mm')
    d.text((40, H / 2), '<- joins the right edge', fill=PINK, font=f2, anchor='lm')
    d.text((W - 40, H / 2), 'joins the left edge ->', fill=PINK, font=f2, anchor='rm')
    return im

def ground():
    W, H = 512, 192
    im = Image.new('RGB', (W, H), (226, 232, 238)); d = ImageDraw.Draw(im)
    d.rectangle([2, 2, W - 3, H - 3], outline=PINK, width=3)
    d.line([(0, 3), (W, 3)], fill=PINK, width=6)
    f = font(20)
    for i, l in enumerate(['ground-<stage>  512 x 192', 'top edge = the ground line (pipes stand on it)',
                           'repeats side to side: seamless left/right', 'no text, no UI']):
        d.text((W / 2, 44 + i * 34), l, fill=(70, 70, 80), font=f, anchor='mm')
    return im

def pipe_body():
    W, H = 192, 256
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W - 1, H - 1], outline=PINK, width=2)
    d.rectangle([32, 0, 159, H - 1], fill=(206, 214, 222, 255), outline=(150, 160, 170, 255), width=2)
    for y in (2, H - 3): d.line([(32, y), (159, y)], fill=PINK, width=3)
    f = font(13)
    for i, l in enumerate(['pipe-<stage>', '192 x 256', 'BODY of the', 'obstacle', 'solid middle', '128 px', 'REPEATS top', 'to bottom:', 'top edge joins', 'bottom edge', 'sides 0-32 /', '160-192 = small', 'overhangs only,', 'else transparent']):
        d.text((96, 22 + i * 16), l, fill=(60, 60, 70, 255), font=f, anchor='mm')
    return im

def pipe_end():
    W, H = 192, 160
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W - 1, H - 1], outline=PINK, width=2)
    d.rectangle([32, 40, 159, H - 1], fill=(206, 214, 222, 255), outline=(150, 160, 170, 255), width=2)
    d.rectangle([8, 0, 183, 44], fill=(186, 196, 206, 255), outline=(150, 160, 170, 255), width=2)
    d.line([(0, 2), (W, 2)], fill=PINK, width=4)
    f = font(11)
    for i, l in enumerate(['pipe-<stage>-end', '192 x 160', 'top = GAP edge', 'cap: full width', 'body: middle', '128 px, joins', 'the body below', 'top obstacle:', 'game flips it']):
        d.text((96, 54 + i * 12), l, fill=(60, 60, 70, 255), font=f, anchor='mm')
    return im

if __name__ == '__main__':
    pipe_body().save(os.path.join(OUT, 'pipe-template.png'))
    pipe_end().save(os.path.join(OUT, 'pipe-end-template.png'))
    os.makedirs(OUT, exist_ok=True)
    bg().save(os.path.join(OUT, 'bg-template.png'))
    ground().save(os.path.join(OUT, 'ground-template.png'))
    print('templates ->', OUT)
