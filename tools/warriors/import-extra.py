#!/usr/bin/env python3
"""Paste GPT's extra fighter rows (the weapon poses etc., brief docs/art-for-gpt/WARRIORS-ROUND2.md) under a delivered sheet.

  python3 tools/warriors/import-extra.py <sheet> <extra.png>      e.g.  hero-p1 hero-p1-extra.png

hero sheets: the extra picture holds cells 40..49 (2 rows), gang sheets cells 26..44 (3 rows), 256 px cells, 8 per row, in the
sheet's POSES order (src/data/ddSprites.js). The sheet grows to fit; the old cells stay byte for byte. Then re-measure the necks
and fists: node <scratch>/joints.mjs + python3 tools/warriors/measure-necks.py joints.json (see that file).
"""
import os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CELL, COLS = 256, 8
sheet, extra = sys.argv[1], sys.argv[2]
start = 40 if sheet.startswith('hero-') else 26
dst = os.path.join(ROOT, 'assets/warriors', sheet + '.webp')
base = Image.open(dst).convert('RGBA')
ex = Image.open(extra).convert('RGBA')
if ex.width != CELL * COLS: ex = ex.resize((CELL * COLS, round(ex.height * CELL * COLS / ex.width)), Image.LANCZOS)
rows = ex.height // CELL
y0 = (start // COLS) * CELL
out = Image.new('RGBA', (CELL * COLS, max(base.height, y0 + rows * CELL)), (0, 0, 0, 0))
out.paste(base, (0, 0))
out.paste(Image.new('RGBA', (CELL * COLS, rows * CELL), (0, 0, 0, 0)), (0, y0))
out.alpha_composite(ex.crop((0, 0, CELL * COLS, rows * CELL)), (0, y0))
os.makedirs(os.path.join(ROOT, 'assets/originals/warriors'), exist_ok=True)
ex.save(os.path.join(ROOT, 'assets/originals/warriors', sheet + '-extra.png'))
out.save(dst, lossless=True, quality=100, method=6)
print(sheet, base.size, '->', out.size)
