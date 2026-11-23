#!/usr/bin/env python3
"""Fold-size background kit for GPT.

Every game backdrop that comes as a TALL (phone, 1080x1920) and/or WIDE (16:9, 1920x1080) picture can also have a FOLD picture
(1504x1670 = 2x the owner's open Galaxy Fold, 752x835): src/bgShape.js picks it on near-square screens (width/height .78-1.3).
This script lists every fold slot that has a tall or wide picture already in the game, and writes a kit folder:
  <out>/BRIEF.md                         paste-ready instructions + the list
  <out>/templates/<game>-fold-template.png   1504x1670 frame: what shows upright, what shows sideways
  <out>/references/<game>/<slot>.jpg    the existing tall/wide pictures (small JPEG copies) to match
  <out>/list.json                        slot -> asset folder, references
Usage: python3 tools/fold-bg-kit.py <out dir>      (then zip it for the owner)
Import: finished pictures go to assets/<folder>/<slot>.webp (lossless; originals in assets/originals/<folder>/).
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FW, FH = 1504, 1670

def ex(folder, name):
    for e in ('webp', 'png'):
        p = os.path.join(ROOT, 'assets', folder, f'{name}.{e}')
        if os.path.exists(p): return p
    return None

def slots():
    out = []  # (game, folder, fold slot, [reference slots], what the game draws on top)
    out.append(('sqwordle', 'sqwordle', 'bg-fold', ['bg', 'bg-wide'], 'light mode. The word grid sits in the middle, the keyboard along the bottom third, a title bar at the top.'))
    out.append(('sqwordle', 'sqwordle', 'bg-fold-dark', ['bg-dark', 'bg-wide-dark'], 'dark mode. The word grid sits in the middle, the keyboard along the bottom third, a title bar at the top.'))
    out.append(('simon', 'simon', 'bg-fold', ['bg', 'bg-wide'], "the kid's bedroom floor seen from straight above; the Simon toy is drawn by the game in the middle (leave the middle 60% plain floor/carpet)."))
    out.append(('battleship', 'battleship', 'board-bg-fold', ['board-bg', 'board-bg-wide'], 'behind the two 8x8 sea grids (they fill most of the middle).'))
    out.append(('strands', 'strands', 'table-fold', ['table', 'table-wide'], 'the table the board game sits on; the square board covers the middle ~85% of the width.'))
    for lv in ('stand', 'penthouse', 'modelhome'):
        out.append(('tapper', 'tapper', f'bg-{lv}-fold', [f'bg-{lv}', f'bg-{lv}-wide'], 'the back wall of the room behind the four bars (the game draws bars, doors and people over it).'))
    sys.path.insert(0, ROOT)
    keys = sorted(f[:-5] for f in os.listdir(os.path.join(ROOT, 'assets/crappycrush')) if f.endswith('.webp') and not f[:-5].endswith(('-fold', '-wide')))
    for k in keys:
        out.append(('crappycrush', 'crappycrush', f'{k}-fold', [k], 'the world backdrop behind the match-3 board (the board covers the middle; HUD at the top).'))
    return [s for s in out if any(ex(s[1], r) for r in s[3])]

def font(n):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, n)
    return ImageFont.load_default()

def template(path, title):
    im = Image.new('RGB', (FW, FH), (236, 236, 240)); d = ImageDraw.Draw(im); pink = (255, 0, 160)
    d.rectangle([2, 2, FW - 3, FH - 3], outline=pink, width=4)
    side = round(FW / (835 / 752))  # height still seen when the Fold is turned sideways (835x752)
    y0 = (FH - side) // 2
    for x in range(0, FW, 40): d.line([(x, y0), (x + 20, y0)], fill=pink, width=3); d.line([(x, y0 + side), (x + 20, y0 + side)], fill=pink, width=3)
    f1, f2 = font(54), font(34)
    d.text((FW / 2, FH * .42), title, fill=(60, 60, 70), font=f1, anchor='mm')
    d.text((FW / 2, FH * .48), f'FOLD BACKGROUND  {FW} x {FH}', fill=(60, 60, 70), font=f2, anchor='mm')
    d.text((FW / 2, FH * .53), 'whole picture = the open Fold held upright', fill=(90, 90, 100), font=f2, anchor='mm')
    d.text((FW / 2, y0 + 40), 'inside the dashed lines = what still shows when the Fold is turned sideways', fill=pink, font=font(28), anchor='mm')
    im.save(path)

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'fold-kit'
    os.makedirs(os.path.join(out, 'templates'), exist_ok=True)
    S = slots(); listing = []
    for game in sorted(set(s[0] for s in S)):
        template(os.path.join(out, 'templates', f'{game}-fold-template.png'), game.upper())
    for game, folder, slot, refs, what in S:
        rd = os.path.join(out, 'references', game); os.makedirs(rd, exist_ok=True); got = []
        for r in refs:
            p = ex(folder, r)
            if not p: continue
            im = Image.open(p).convert('RGB'); im.thumbnail((1000, 1000)); im.save(os.path.join(rd, f'{r}.jpg'), quality=82); got.append(f'references/{game}/{r}.jpg')
        listing.append({'game': game, 'slot': slot, 'file': f'{slot}.png', 'size': [FW, FH], 'import_to': f'assets/{folder}/{slot}.webp', 'match': got, 'game_draws': what})
    json.dump(listing, open(os.path.join(out, 'list.json'), 'w'), indent=1)
    rows = '\n'.join(f"| {i+1} | {e['game']} | `{e['file']}` | {', '.join(os.path.basename(m) for m in e['match'])} | {e['game_draws']} |" for i, e in enumerate(listing))
    brief = open(os.path.join(ROOT, 'docs/art-for-gpt/FOLD-BACKGROUNDS.md')).read().split('<!-- LIST -->')[0]
    open(os.path.join(out, 'BRIEF.md'), 'w').write(brief + '\n| # | Game | File to make | Match these | What the game draws on top |\n|---|---|---|---|---|\n' + rows + '\n')
    print(len(listing), 'fold slots ->', out)

if __name__ == '__main__':
    main()
