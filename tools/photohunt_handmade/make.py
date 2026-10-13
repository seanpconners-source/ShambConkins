#!/usr/bin/env python3
# Hand-edited Photo Hunt pairs from the owner's phone screenshots (assets/originals/photohunt/<id>.jpg):
# crop screenshot chrome, paint out watermarks, denoise/sharpen, resize to a 1200px base, apply the five
# differences from pairs.py, cut the cabinet's 37:32 window and save assets/photohunt/<id>.a|b.webp + <id>.json
# (740x640, the same format tools/photohunt.py writes). Then run `python3 tools/photohunt.py index`.
# Needs: pip install opencv-python-headless pillow numpy.   Usage: python3 tools/photohunt_handmade/make.py [ids...]
import json,os,sys,numpy as np,cv2
from PIL import Image, ImageFilter
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from pairs import PAIRS
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
MAX,OW,OH=1200,740,640
KIND={'recolor':'color','remove':'remove','inpaint':'remove','inpaint_line':'remove','vfill':'remove','mirror':'flip','swap':'flip'}
def clean(path,c):
  a=cv2.imread(path);h,w=a.shape[:2]
  if c.get('star'):  # Gemini sparkle sits 150px in from the bottom-right corner
    yy,xx=np.mgrid[0:h,0:w];cx,cy,R=w-150,h-150,66
    m=((np.abs(xx-cx)/R)**(2/3)+(np.abs(yy-cy)/R)**(2/3)<=1).astype(np.uint8)*255
    a=cv2.inpaint(a,cv2.dilate(m,np.ones((9,9),np.uint8)),9,cv2.INPAINT_TELEA)
  l,t,r,b=c['crop'];a=a[t:h-b,l:w-r]
  if c.get('dn'):a=cv2.fastNlMeansDenoisingColored(a,None,c['dn'],c['dn'],7,21)
  h,w=a.shape[:2];k=MAX/max(w,h);a=cv2.resize(a,(round(w*k),round(h*k)),interpolation=cv2.INTER_AREA)
  im=Image.fromarray(cv2.cvtColor(a,cv2.COLOR_BGR2RGB)).filter(ImageFilter.UnsharpMask(radius=1.4,percent=70,threshold=2))
  return cv2.cvtColor(np.asarray(im),cv2.COLOR_RGB2BGR).astype(np.float32)
class Rec:  # records which op made each region (for the json "kind")
  def __init__(s,mod):s.mod=mod;s.kinds=[]
  def __getattr__(s,n):
    f=getattr(s.mod,n)
    def g(*a,**k):s.kinds.append(KIND.get(n,'color'));return f(*a,**k)
    return g
import pairs as P
def window(img,x0,y0):
  H,W=img.shape[:2];cw,ch=(round(H*37/32),H) if W/H>37/32 else (W,round(W*32/37))
  assert 0<=x0<=W-cw and 0<=y0<=H-ch,(x0,y0,W,H,cw,ch)
  return img[y0:y0+ch,x0:x0+cw],cw,ch
def webp(img,path):
  im=cv2.resize(np.clip(img,0,255).astype(np.uint8),(OW,OH),interpolation=cv2.INTER_AREA)
  Image.fromarray(cv2.cvtColor(im,cv2.COLOR_BGR2RGB)).save(path,'WEBP',quality=86,method=6)
only=set(sys.argv[1:])
for pid,title,cfg,(x0,y0),edits in PAIRS:
  if only and pid not in only:continue
  left=clean(f'{ROOT}/assets/originals/photohunt/{pid}.jpg',cfg);right=left.copy()
  rec=Rec(P);g=edits.__globals__;saved={k:g[k] for k in KIND};g.update({k:getattr(rec,k) for k in KIND})
  try:regs=edits(right)
  finally:g.update(saved)
  a,cw,ch=window(left,x0,y0);b,_,_=window(right,x0,y0)
  regions=[]
  for (x,y,r),kind in zip(regs,rec.kinds):
    nx,ny=(x-x0)/cw,(y-y0)/ch;assert 0<nx<1 and 0<ny<1,(pid,x,y)
    R=min(r*1.1+6,.16*cw)  # answer ellipse in px: a little bigger than the edit
    regions.append({'x':round(nx,4),'y':round(ny,4),'rx':round(max(R,.03*cw)/cw,4),'ry':round(max(R,.03*cw)/ch,4),'kind':kind})
  webp(a,f'{ROOT}/assets/photohunt/{pid}.a.webp');webp(b,f'{ROOT}/assets/photohunt/{pid}.b.webp')
  json.dump({'id':pid,'title':title,'regions':regions},open(f'{ROOT}/assets/photohunt/{pid}.json','w'),indent=1,ensure_ascii=False)
  print(pid,cw,ch,[r['kind'] for r in regions])
