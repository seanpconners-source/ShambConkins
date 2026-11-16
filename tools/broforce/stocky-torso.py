#!/usr/bin/env python3
# usage: python3 -I tools/broforce/stocky-torso.py [out.webp]
# Owner, Nov 16: legs too small next to the arms, walk looked better before. GPT's armless bro-torso is a slimmer man than
# the old bro-body (chest ~35% narrower, waist 6 px higher, thin legs) while the arm sheets were drawn for the old body.
# This builds the armless body the arms fit: GPT's armless chest (bro-torso idle, stretched to the old chest's box) on the
# OLD body's chunky legs and its 6-frame run (idle 2, run 6 = walk too, jump, fall); climb/ladder = GPT rows stretched.
import sys,os,numpy as np,cv2
from PIL import Image
A=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','assets','broforce')+'/'
O=os.path.join(A,'..','originals','broforce')+'/'
out=sys.argv[1]   # (the game now uses GPT's body v2; this stitched stand-in was its master)
FW,FH=128,192                                      # 2x frames
tor=Image.open(O+'bro-torso-slim.png').convert('RGBA')   # GPT's corrected armless torso (was assets/broforce/bro-torso)
if tor.size!=(1024,1344):tor=tor.resize((1024,1344),Image.LANCZOS)
body=Image.open(A+'bro-body.webp').convert('RGBA')
fr=lambda im,r,c:im.crop((c*FW,r*FH,(c+1)*FW,(r+1)*FH))
# old body: chest box x 30..106, top 44, belt 112 (2x px); GPT torso: chest x 38..88, top 44, waist 102
T_TOP,T_WAIST,B_TOP,B_SEAM=44,104,44,114
KX=1.38;CX=62                                       # stretch round the body's middle line
def upper(src):
  u=src.crop((0,0,FW,T_WAIST));h=B_SEAM-B_TOP+6
  part=u.crop((0,T_TOP,FW,T_WAIST)).resize((round(FW*KX),h),Image.LANCZOS)
  im=Image.new('RGBA',(FW,FH));im.alpha_composite(part,(round(CX-CX*KX),B_TOP));return im
def classes(a):
  b=a.astype(int);R,G,B=b[...,0],b[...,1],b[...,2];mx=np.max(b[...,:3],2);mn=np.min(b[...,:3],2);sat=mx-mn;vis=b[...,3]>40
  # measured on bro-body: camo R-G <= 21 (p90) and G-B >= 10 (p10); arm skin R-G ~34; gloves neutral grey
  skin=(R-G>24)
  glove=(G-B<7)&(R-B<12)
  shirt=((R>G+45)&(R>120))|(mn>150)|(B>R+12)
  camo=vis&~skin&~glove&~shirt
  return vis,skin,glove,camo
def legs(src,seam=B_SEAM):
  """the old body under the belt, plus its legs where a raised thigh comes up over the belt line; the old arm dropped"""
  a=np.array(src);vis,skin,glove,camo=classes(a)
  yy,xx=np.mgrid[0:FH,0:FW]
  keep=(yy>=seam)|(camo&(yy>=seam-30))
  keep&=~((skin|glove)&(yy<seam+14)&(xx>CX+14))
  # only what is joined to the legs (a raised thigh is; flecks of the old arm/belt over the chest are not)
  n,lab,st,_=cv2.connectedComponentsWithStats((keep&vis).astype(np.uint8),8)
  ok=np.zeros(n,bool)
  for i in range(1,n):ok[i]=st[i,cv2.CC_STAT_TOP]+st[i,cv2.CC_STAT_HEIGHT]>seam+12 and st[i,cv2.CC_STAT_AREA]>=60
  keep&=ok[lab]
  a[~keep,3]=0
  for i in range(3):r=seam+i;a[r,:,3]=np.where(camo[r],a[r,:,3],(a[r,:,3]*(i+1)/4)).astype(np.uint8)
  return Image.fromarray(a)
up=upper(fr(tor,0,0))
rows=[('idle',0,2),('walk',1,6),('run',1,6),('jump',2,1),('fall',3,1)]
sheet=Image.new('RGBA',(FW*6,FH*7))
for ri,(name,br,n) in enumerate(rows):
  for c in range(n):
    f=Image.new('RGBA',(FW,FH));f.alpha_composite(up);f.alpha_composite(legs(fr(body,br,c)));sheet.alpha_composite(f,(c*FW,ri*FH))
def stretched(src):
  im=Image.new('RGBA',(FW,FH));s=src.resize((round(FW*KX),FH),Image.LANCZOS);im.alpha_composite(s,(round(CX-CX*KX),0));return im
for ri,(br,n) in [(5,(5,2)),(6,(6,2))]:
  for c in range(2):sheet.alpha_composite(stretched(fr(tor,br,c)),(c*FW,ri*FH))
sheet.save(out,lossless=True,quality=100);print('wrote',out,sheet.size)
