#!/usr/bin/env python3
"""Import Arcade pictures from a folder (owner, Nov 3: "I need icons and images for each game").

    python3 tools/import-arcade-art.py <folder> [--dry-run]

Name each picture after its slot (list: assets/tiles/SLOTS.md, prompts: docs/arcade-art/PROMPTS.md):
    <slot>-art.png / <slot>-key.png / <slot>.png  → assets/keyart/<slot>.webp  (big picture, longest side 1280 px)
    <slot>-icon.png / <slot>-tile.png             → assets/tiles/<slot>.webp   (tile icon, 512 px square, transparency kept)
Any of .png .jpg .jpeg .webp. Spaces and capitals in names are fine ("Paddys Hole - icon.PNG" → paddys-hole icon).
Unknown slots are listed and skipped. Originals are not changed. Then rebuild the game (node tools/build.mjs).
"""
import json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
DRY = '--dry-run' in sys.argv
if not args:
    print(__doc__); sys.exit(1)
src = args[0]
slots = {p['slot'] for p in json.load(open(os.path.join(ROOT, 'docs/arcade-art/prompts.json')))}
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
done, skipped = [], []
for name in sorted(os.listdir(src)):
    base, ext = os.path.splitext(name)
    if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
        continue
    s = slug(base)
    kind = 'key'
    m = re.match(r'^(.*?)-(icon|tile|art|key|keyart)$', s)
    if m:
        s, kind = m.group(1), 'icon' if m.group(2) in ('icon', 'tile') else 'key'
    if s not in slots:
        skipped.append(name); continue
    im = Image.open(os.path.join(src, name))
    if kind == 'icon':
        im = im.convert('RGBA')
        bbox = im.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
        if bbox and bbox != (0, 0, im.width, im.height):
            im = im.crop(bbox)  # trim empty transparent margins so the subject fills the tile
        side = max(im.width, im.height)
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(im, ((side - im.width) // 2, side - im.height))
        sq = sq.resize((512, 512), Image.LANCZOS)
        out = os.path.join(ROOT, 'assets/tiles', s + '.webp')
        if not DRY: sq.save(out, 'WEBP', quality=88, method=6)
    else:
        im = im.convert('RGB'); im.thumbnail((1280, 1280), Image.LANCZOS)
        out = os.path.join(ROOT, 'assets/keyart', s + '.webp')
        if not DRY: im.save(out, 'WEBP', quality=80, method=6)
    done.append(f'{name} → {os.path.relpath(out, ROOT)}')
print('\n'.join(done) or 'Nothing imported.')
if skipped:
    print('\nSkipped (no slot with that name; see assets/tiles/SLOTS.md):\n  ' + '\n  '.join(skipped))
if done and not DRY:
    os.system(f'node "{os.path.join(ROOT, "tools/arcade-art-slots.mjs")}"')
if any('keyart' in d and '-logo' not in d for d in done):
    print('\nNEW BACKGROUNDS: every new or replaced key art goes through the Background Picker before it ships:'
          '\n  add its faces box to KEY_BOX, then follow tools/bg-picker/README.md (measure, assemble, publish, owner locks, apply.py).')
