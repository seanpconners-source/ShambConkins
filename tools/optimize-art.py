#!/usr/bin/env python3
"""Shrink drop-in art so the single-file game stays small.
Big PNG/JPG files in assets/portraits, assets/items and assets/locations are resized
(longest side 480px), saved as WebP with transparency, and the originals are moved to
assets/originals/<folder>/ (which the build ignores).  Usage: python3 tools/optimize-art.py"""
import os, shutil
from PIL import Image
root = os.path.join(os.path.dirname(__file__), '..')
for folder in ('portraits', 'items', 'locations'):
    d = os.path.join(root, 'assets', folder)
    if not os.path.isdir(d): continue
    for name in sorted(os.listdir(d)):
        base, ext = os.path.splitext(name)
        if ext.lower() not in ('.png', '.jpg', '.jpeg'): continue
        src = os.path.join(d, name); size = os.path.getsize(src)
        im = Image.open(src)
        if max(im.size) <= 480 and size < 120_000: continue
        im.thumbnail((480, 480), Image.LANCZOS)
        out = os.path.join(d, base + '.webp')
        im.save(out, 'WEBP', quality=88, method=6)
        keep = os.path.join(root, 'assets', 'originals', folder); os.makedirs(keep, exist_ok=True)
        shutil.move(src, os.path.join(keep, name))
        print(f'{name}: {size//1024} KB -> {os.path.basename(out)} {os.path.getsize(out)//1024} KB')
