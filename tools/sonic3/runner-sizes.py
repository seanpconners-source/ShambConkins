"""Seanic runner sizes: prints, from the imported sheets, what render.js's size constants are based on.

  python tools/sonic3/runner-sizes.py

- stand/walk/run rows: opaque box (y0..y1, x0..x1, frame px) + the face spot from src/data/sonic3Heads.js.
  The face spot's height above the feet (foot y 74) is what BODY_K compares: equal BODY_K = equal faces.
- ball rows: outline width per roll frame and the diameter of a disc with the same filled area. BALL_SRC in
  render.js is set so the balls match by filled AREA (a spiky outline looks smaller than a solid one of the same width).
- walk rows: a real walk cycle changes width a lot (legs apart / together); a walk row that hardly changes width
  is a shuffle (the Nov 11 sheets: the hedgehog's walk frames are 26-28 px wide, its run frames 28-33).
"""
import sys, json, re, os
from PIL import Image
root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', '..')
H = json.loads(re.search(r'const HEADS=(\{.*?\});', open(root + '/src/data/sonic3Heads.js', encoding='utf8').read(), re.S).group(1))
rows1 = ['stand','wait','lookUp','crouch','walk','run','dash','skid','push','balance','spring','fall','hurt','hang','win','dead']
R = 2
def stats(img, fx, fy, fw, fh):
    c = img.crop((fx*fw*R, fy*fh*R, (fx+1)*fw*R, (fy+1)*fh*R))
    a = c.getchannel('A').point(lambda v: 255 if v > 128 else 0)
    bb = a.getbbox()
    if not bb: return None
    n = a.histogram()[255]
    return dict(y0=bb[1]/R, y1=bb[3]/R, x0=bb[0]/R, x1=bb[2]/R, area=n/R/R)
for nm in ('runner-p1', 'runner-p2'):
    im = Image.open(f'{root}/assets/sonic3/{nm}.webp')
    for r in ('stand', 'walk', 'run'):
        ri = rows1.index(r); out = []
        for f in range(1 if r == 'stand' else 8):
            s = stats(im, f, ri, 96, 80)
            if not s: continue
            sp = H.get(nm, {}).get(r, [[None, None]]); sp = sp[min(f, len(sp)-1)]
            out.append(f'{f}: y {s["y0"]:.0f}-{s["y1"]:.0f} w {s["x1"]-s["x0"]:.1f} face {sp}')
        print(nm, r, ' | '.join(out))
for nm in ('ball-p1', 'ball-p2'):
    im = Image.open(f'{root}/assets/sonic3/{nm}.webp')
    ws, eq = [], []
    for f in range(8):
        s = stats(im, f, 0, 48, 48)
        ws.append(s['x1']-s['x0']); eq.append((s['area']/3.14159)**.5*2)
    print(nm, f'outline avg {sum(ws)/8:.1f}  filled-area diameter avg {sum(eq)/8:.1f}')
