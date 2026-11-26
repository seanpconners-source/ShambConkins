# studio-masks.py: cr-seats* = studio picture with the dark seat gaps see-through; cr-audience-front (wide only) = rails kept as big connected chrome parts + the ledge below y 898 (the checked-in webp used a component filter: small chrome bits dropped)
# run from the repo root; writes /tmp files (seat table -> STUDIO in src/engines/gameshow/audience.js, masks -> assets/gameshow/*.webp lossless)
import json,numpy as np
from PIL import Image
T='assets/originals/gameshow/'
F={'wide':'cr-audience','tall':'cr-audience-tall','fold':'cr-audience-fold'}
SUF={'wide':'','tall':'-tall','fold':'-fold'}
LEDGE={'wide':898,'tall':None,'fold':None}
S=json.load(open('/tmp/seats.json'))
for sh,f in F.items():
  a=np.asarray(Image.open(T+f+'.png').convert('RGB')).astype(float);H,W=a.shape[:2]
  V=a.max(2);mn=a.min(2);sat=(V-mn)/(V+1)
  # seats: the dark gaps between seat backs see-through
  al=np.clip((V-92)/30,0,1)
  out=np.dstack([a,al*255]).astype('uint8')
  Image.fromarray(out,'RGBA').save(f'/tmp/cr-seats{SUF[sh]}.png')
  # front: chrome rails (grey, bright) in front of the first row + the ledge and floor below it
  r0=S[sh][0];top=r0['t']-int(r0['p']*.5)
  ch=((sat<.2)&(V>105)).astype(float)
  yy=np.arange(H)[:,None]*np.ones((1,W))
  fa=np.where(yy>=top,ch,0)
  if LEDGE[sh]:fa=np.where(yy>=LEDGE[sh],1,fa)
  # soften
  from PIL import ImageFilter
  m=Image.fromarray((fa*255).astype('uint8')).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1))
  out=np.dstack([a,np.asarray(m)]).astype('uint8')
  Image.fromarray(out,'RGBA').save(f'/tmp/cr-audience-front{SUF[sh]}.png')
  print(sh,'done')
# studio data for the game
D={}
for sh,R in S.items():
  D[sh]=[[r['t'],r['p'],r['s'],r['a']] for r in R]
open('/tmp/studio.json','w').write(json.dumps(D,separators=(',',':')))
print(len(open('/tmp/studio.json').read()))
