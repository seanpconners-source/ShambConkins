#!/usr/bin/env python3
"""Import Arcade pictures from a folder (owner, Nov 3: "I need icons and images for each game").

    python3 tools/import-arcade-art.py <folder> [--dry-run]

Name each picture after its slot (list: assets/tiles/SLOTS.md, prompts: docs/arcade-art/PROMPTS.md):
    <slot>-art.png / <slot>-key.png / <slot>.png  → assets/keyart/<slot>.webp  (big picture, longest side 1600 px)
    <slot>-icon.png / <slot>-tile.png             → assets/tiles/<slot>.webp   (tile icon, 512 px square, transparency kept)
    <slot>-logo.png                               → assets/keyart/<slot>-logo.webp (trimmed, longest side 1100 px)
Icons and logos without transparency on a flat pure-green (#00FF00) background are keyed out (Grok can't always do
transparency; docs/art-for-gpt/GROK.md asks for flat green instead).
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

def green_out(im):
    """A picture with no real transparency on a flat green screen: green → transparent, soft edge, green spill removed."""
    rgba = im.convert('RGBA')
    if im.mode in ('RGBA', 'LA') and min(rgba.getchannel('A').getextrema()) < 128: return rgba  # already transparent
    px = rgba.load(); w, h = rgba.size
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    if not all(c[1] > 180 and c[0] < 110 and c[2] < 110 for c in corners): return rgba
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]; ex = g - max(r, b)  # how much greener than the other channels
            if ex > 90: px[x, y] = (r, g, b, 0)
            elif ex > 25:
                k = (ex - 25) / 65; px[x, y] = (r, max(r, b), b, int(255 * (1 - k)))
            elif ex > 0: px[x, y] = (r, max(r, b) + ex // 3, b, a)
    return rgba
for name in sorted(os.listdir(src)):
    base, ext = os.path.splitext(name)
    if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
        continue
    s = slug(base)
    kind = 'key'
    m = re.match(r'^(.*?)-(icon|tile|art|key|keyart|logo)$', s)
    if m:
        s, kind = m.group(1), 'icon' if m.group(2) in ('icon', 'tile') else 'logo' if m.group(2) == 'logo' else 'key'
    if s not in slots:
        skipped.append(name); continue
    im = Image.open(os.path.join(src, name))
    if kind in ('icon', 'logo'): im = green_out(im)
    if kind == 'logo':
        im = im.convert('RGBA'); bbox = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        if bbox: im = im.crop(bbox)
        im.thumbnail((1100, 1100), Image.LANCZOS)
        out = os.path.join(ROOT, 'assets/keyart', s + '-logo.webp')
        if not DRY: im.save(out, 'WEBP', lossless=True, quality=100, method=6)
        done.append(f'{name} → {os.path.relpath(out, ROOT)}'); continue
    if kind == 'icon':
        im = im.convert('RGBA')
        bbox = im.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
        if bbox and bbox != (0, 0, im.width, im.height):
            im = im.crop(bbox)  # trim empty transparent margins so the subject fills the tile
        side = max(im.width, im.height)
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(im, ((side - im.width) // 2, side - im.height))
        sq = sq.resize((512, 512), Image.LANCZOS)
        out = os.path.join(ROOT, 'assets/tiles', s + '.webp')
        if not DRY: sq.save(out, 'WEBP', lossless=True, quality=100, method=6)  # lossless (owner, Nov 6)
    else:
        im = im.convert('RGB'); im.thumbnail((1600, 1600), Image.LANCZOS)
        out = os.path.join(ROOT, 'assets/keyart', s + '.webp')
        if not DRY: im.save(out, 'WEBP', lossless=True, quality=100, method=6)  # lossless (owner, Nov 6)
    done.append(f'{name} → {os.path.relpath(out, ROOT)}')
print('\n'.join(done) or 'Nothing imported.')
if skipped:
    print('\nSkipped (no slot with that name; see assets/tiles/SLOTS.md):\n  ' + '\n  '.join(skipped))
if done and not DRY:
    os.system(f'node "{os.path.join(ROOT, "tools/arcade-art-slots.mjs")}"')
if any('keyart' in d and '-logo' not in d for d in done):
    print('\nNEW BACKGROUNDS: every new or replaced key art goes through the Background Picker before it ships:'
          '\n  add its faces box to KEY_BOX, then follow tools/bg-picker/README.md (measure, assemble, publish, owner locks, apply.py).')
