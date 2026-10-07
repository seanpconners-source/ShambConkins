#!/usr/bin/env python3
"""Turns the black-box ShambConkins logo into a transparent one with a thick black outline.

Usage: python3 tools/brand-logo.py [src] [out]
  src defaults to assets/originals/brand/shambconkins-logo-black.webp (cream lettering on black)
  out defaults to assets/shambconkins-logo.webp (RGBA, trimmed to the outline)
The lettering is keyed out of the black by brightness, then grown by OUTLINE px with a round brush;
everything inside that outline keeps the original pixels (so the distressed texture stays), everything
outside becomes transparent. Works on any background.
"""
import sys
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'assets/originals/brand/shambconkins-logo-black.webp'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'assets/shambconkins-logo.webp'
SCALE = 2          # work at 2x so the outline edge is smooth, then downsample
OUTLINE = 11       # outline thickness in output pixels
PAD = OUTLINE + 4

im = Image.open(SRC).convert('RGB')
w, h = im.size
big = im.resize((w * SCALE, h * SCALE), Image.LANCZOS)
rgb = np.asarray(big).astype(np.float32)
lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
# Soft key: pure black -> 0, lettering (cream ~ 220) -> 1.
ink = np.clip((lum - 38) / 70, 0, 1)

p = PAD * SCALE
ink = np.pad(ink, p)
rgb = np.pad(rgb, ((p, p), (p, p), (0, 0)))
H, W = ink.shape

# Round-brush grayscale dilation of the soft key (keeps antialiasing on the outer edge).
r = OUTLINE * SCALE
grown = ink.copy()
for dy in range(-r, r + 1):
    for dx in range(-r, r + 1):
        d = (dx * dx + dy * dy) ** 0.5
        if d > r + 0.5:
            continue
        cover = min(1.0, r + 0.5 - d)  # fractional coverage at the rim of the brush
        shifted = np.zeros_like(ink)
        ys, yd = (slice(dy, H), slice(0, H - dy)) if dy >= 0 else (slice(0, H + dy), slice(-dy, H))
        xs, xd = (slice(dx, W), slice(0, W - dx)) if dx >= 0 else (slice(0, W + dx), slice(-dx, W))
        shifted[ys, xs] = ink[yd, xd] * cover
        np.maximum(grown, shifted, out=grown)
alpha = np.clip(grown * 1.6, 0, 1)

# Inside the outline: original pixels (black around the letters = the outline itself), forced to
# pure black where there is no lettering so the outline reads cleanly.
out_rgb = rgb * ink[..., None]
rgba = np.dstack([out_rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
res = Image.fromarray(rgba, 'RGBA')
res = res.resize((W // SCALE, H // SCALE), Image.LANCZOS)
res = res.crop(res.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
res.save(OUT, 'WEBP', quality=90, method=6)
print(OUT, res.size)
