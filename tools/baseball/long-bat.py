#!/usr/bin/env python3
"""Repaint the bat in the batter sheets longer (GPT drew it ~.3 of the player's height; a real bat is ~.45, long enough to
reach across the plate). Reads assets/originals/baseball/batter-p1|p2.png, writes assets/baseball/batter-p1|p2.png.
Per frame: fit the drawn bat's line from its pixels near a hand-measured guide, erase it beyond the gloves, paint a new
pixel-art bat (outline, highlight, shadow, rounded end) from the same hands point along the same line, LEN px long.
Usage: python3 tools/baseball/long-bat.py [--check out.png]"""
import sys,math
from PIL import Image,ImageDraw
FW,FH=128,160
PADL,PADT,PADR=8,12,32;NW,NH=FW+PADL+PADR,FH+PADT
# hands (where the bat leaves the gloves) and the drawn tip, sprite px, per row/frame (stance 4, swing 6)
GUIDE={(0,0):((38,47),(14,11)),(0,1):((39,47),(15,13)),(0,2):((38,47),(14,10)),(0,3):((39,47),(15,13)),
 (1,0):((37,50),(6,20)),(1,1):((63,80),(33,50)),(1,2):((89,88),(120,88)),(1,3):((89,87),(127,85)),(1,4):((84,73),(109,58)),(1,5):((55,68),(25,68))}
LEN=64          # new bat length from the hands, px (player is 150 px tall)
def tanish(c):
 r,g,b,a=c;return a>100 and r>185 and g>125 and b>85 and 35<r-b<125 and g<r
def darkish(c):
 r,g,b,a=c;return a>0 and (r*.3+g*.59+b*.11)<125 and not jersey(c)
def jersey(c):
 r,g,b,a=c;return a>100 and ((r>140 and g<95 and b<95) or (b>140 and r<110 and g<150))
def body(c):
 r,g,b,a=c;return a>200 and not tanish(c) and not darkish(c)
def fit(im,ox,oy,h,t):
 hx,hy=h;tx,ty=t;dx,dy=tx-hx,ty-hy;L=math.hypot(dx,dy);ux,uy=dx/L,dy/L;pts=[]
 for y in range(NH):
  for x in range(NW):
   px,py=x-hx,y-hy;s=px*ux+py*uy;d=abs(-px*uy+py*ux)
   if 3<s<L+5 and d<6 and tanish(im.getpixel((ox+x,oy+y))):pts.append((x,y))
 if len(pts)<15:return (hx,hy),(ux,uy),L
 mx=sum(p[0] for p in pts)/len(pts);my=sum(p[1] for p in pts)/len(pts)
 sxx=sum((p[0]-mx)**2 for p in pts);syy=sum((p[1]-my)**2 for p in pts);sxy=sum((p[0]-mx)*(p[1]-my) for p in pts)
 a=.5*math.atan2(2*sxy,sxx-syy);vx,vy=math.cos(a),math.sin(a)
 if vx*ux+vy*uy<0:vx,vy=-vx,-vy
 # the line through the pixel centroid; the hands point = the guide's hands projected onto it
 s0=(hx-mx)*vx+(hy-my)*vy;H=(mx+s0*vx,my+s0*vy);tipS=max((p[0]-H[0])*vx+(p[1]-H[1])*vy for p in pts)
 return H,(vx,vy),tipS
def radius(s):   # handle 1.8 px, swelling to a 4.2 px barrel over the outer 45%, rounded end
 k=s/LEN;return 1.8 if k<.3 else 1.8+(4.2-1.8)*min(1,(k-.3)/.3)
def paint(im,ox,oy,H,v,oldL):
 hx,hy=H;vx,vy=v;nx,ny=-vy,vx;erased=[]
 # erase the old bat beyond the gloves (only bat-coloured and outline pixels)
 for y in range(NH):
  for x in range(NW):
   px,py=x+.5-hx,y+.5-hy;s=px*vx+py*vy;d=abs(px*nx+py*ny)
   if 2.5<s<oldL+5 and d<7.5:
    c=im.getpixel((ox+x,oy+y))
    if c[3]<220 or (not jersey(c) and not min(c[:3])>215): erased.append((x,y));im.putpixel((ox+x,oy+y),(0,0,0,0))
 # holes where the old bat crossed the body: fill from the body on both sides
 for x,y in erased:
  got=[]
  for sg in (1,-1):
   for k in range(1,8):
    qx,qy=round(x+sg*nx*k),round(y+sg*ny*k)
    if not(0<=qx<NW and 0<=qy<NH):break
    c=im.getpixel((ox+qx,oy+qy))
    if body(c):got.append((k,c));break
  if len(got)==2:im.putpixel((ox+x,oy+y),min(got)[1])
 # pinholes left inside the body: a clear pixel with 6+ solid body neighbours takes their colour
 for _ in range(2):
  for x,y in erased:
   if im.getpixel((ox+x,oy+y))[3]:continue
   nb=[im.getpixel((ox+x+i,oy+y+j)) for i in (-1,0,1) for j in (-1,0,1) if (i or j) and 0<=x+i<NW and 0<=y+j<NH]
   solid=[c for c in nb if body(c)]
   if len(solid)>=5:im.putpixel((ox+x,oy+y),tuple(sum(c[k] for c in solid)//len(solid) for k in range(3))+(255,))
 # light from the upper left: the side of the bat facing (-1,-1) is the highlight
 lit=1 if (nx*-1+ny*-1)>0 else -1
 for y in range(NH):
  for x in range(NW):
   px,py=x+.5-hx,y+.5-hy;s=px*vx+py*vy;d=px*nx+py*ny
   if s<1.5 or s>LEN+4.5:continue
   r=radius(min(s,LEN))
   if s>LEN:  # rounded end cap
    if math.hypot(s-LEN,d)>r+1:continue
    edge=math.hypot(s-LEN,d)>r
   else:
    if abs(d)>r+1:continue
    edge=abs(d)>r
   c=im.getpixel((ox+x,oy+y))
   if c[3]>200 and not (tanish(c) or darkish(c)) and s<6:continue   # keep the gloves on top of the handle
   if edge:col=(48,28,18,255)
   else:
    side=d*lit/max(r,1)
    col=(252,230,196,255) if side>.35 else (214,152,108,255) if side<-.45 else (240,200,158,255)
   im.putpixel((ox+x,oy+y),col)
def main():
 for n in ['batter-p1','batter-p2']:
  src=Image.open(f'assets/originals/baseball/{n}.png').convert('RGBA')
  im=Image.new('RGBA',(NW*6,NH*2),(0,0,0,0))
  for r in range(2):
   for f in range(6):im.alpha_composite(src.crop((f*FW,r*FH,f*FW+FW,r*FH+FH)),(f*NW+PADL,r*NH+PADT))
  for (r,f),(h,t) in GUIDE.items():
   ox,oy=f*NW,r*NH;h=(h[0]+PADL,h[1]+PADT);t=(t[0]+PADL,t[1]+PADT);H,v,L=fit(im,ox,oy,h,t);paint(im,ox,oy,H,v,L)
  im.save(f'assets/baseball/{n}.png',optimize=True);print(n,'done')
 if '--check' in sys.argv:
  out=sys.argv[sys.argv.index('--check')+1];a=Image.open('assets/baseball/batter-p1.png');b=Image.open('assets/baseball/batter-p2.png')
  bg=Image.new('RGBA',(a.width,a.height*2),(70,150,70,255));bg.alpha_composite(a,(0,0));bg.alpha_composite(b,(0,a.height));bg.resize((bg.width*2,bg.height*2),Image.NEAREST).save(out)
main()
