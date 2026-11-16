#!/usr/bin/env python3
# usage: python3 -I tools/broforce/compose-guns.py   (needs opencv-python-headless + pillow)
# Owner, Nov 15: redo the shotgun (the bell cannon is kept as arms-elephant-gun for later), the boomerang becomes a
# BOOMERANG GUN, and the rocket should be seen leaving the launcher. Built from our own pictures, no new GPT art:
#  - arms-shotgun: the laser arms' straight two-hand hold with the gun-shotgun picture (like tools/broforce/rifle-arms.py);
#    fire frames rack the pump (fore-end + back hand slide back, then forward)
#  - gun-boomerang: the rifle with the boomerang mounted across the muzzle like a crossbow (apex forward);
#    arms-boomerang: hold = loaded, fire frames = the boomerang gone (the game shows them while it is out)
#  - arms-rocket-empty: arms-rocket with the warhead cut off at the tube mouth (shown until the reload)
import numpy as np,cv2,os
from PIL import Image
A=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','assets','broforce')+'/'
O=os.path.join(A,'..','originals','broforce')+'/'
FW,FH=320,160;GRIP=(124,84)
HANDS=[(118,86,24,18),(192,81,28,17)]
src=np.array(Image.open(A+'arms-laser.webp').convert('RGBA')).astype(np.int16)

def comps(mask,minA):
  n,lab,st,_=cv2.connectedComponentsWithStats(mask.astype(np.uint8),8);keep=np.zeros_like(mask)
  for i in range(1,n):
    if st[i,cv2.CC_STAT_AREA]>=minA:keep|=lab==i
  return keep

def layers(fx,fy):
  """skin (arms) layer and the gloved hands on top, cut from one frame of the laser arms"""
  f=src[fy:fy+FH,fx:fx+FW];R,G,B,Al=f[...,0],f[...,1],f[...,2],f[...,3];vis=Al>40
  skin=comps(vis&(R>G+12)&(G>=B-6)&(R>85)&((R-B)>28),60)
  skin=cv2.morphologyEx(skin.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))>0
  inv=(~skin).astype(np.uint8);n,lab,st,_=cv2.connectedComponentsWithStats(inv,4)
  for i in range(1,n):
    x,y,w,h,a=st[i]
    if x>0 and y>0 and x+w<FW and y+h<FH and a<400:skin|=lab==i
  yy,xx=np.mgrid[0:FH,0:FW];col=f.astype(np.uint8)
  dark=vis&(R<100)&(G<100)&(B<100)&(np.abs(R-B)<32)&(B<=R+8)
  def L(m):
    out=np.zeros((FH,FW,4),np.uint8);out[m]=col[m];out[m,3]=np.where(vis[m],col[m][:,3],255);return Image.fromarray(out)
  tops=[]
  for cx,cy,rx,ry in HANDS:
    e=((xx-cx)/rx)**2+((yy-cy)/ry)**2<=1;tops.append(comps(e&(dark|skin)&vis,30))
  allTop=tops[0]|tops[1]
  return L(skin&~allTop),L(tops[0]),L(tops[1])

def arms(gunFrames,backDx=(0,0,0,0,0),out=None):
  """gunFrames: 5 gun pictures (hold + 4 fire); backDx: how far the back hand slides per frame (2x px)"""
  sheet=Image.new('RGBA',(FW*4,FH*2))
  for k,(fx,fy) in enumerate([(0,0),(0,160),(320,160),(640,160),(960,160)]):
    skin,front,back=layers(fx,fy);fr=Image.new('RGBA',(FW,FH))
    fr.alpha_composite(skin);fr.alpha_composite(gunFrames[k],(GRIP[0]-96,GRIP[1]-48));fr.alpha_composite(front)
    fr.alpha_composite(back,(backDx[k],0));sheet.alpha_composite(fr,(fx,fy))
  sheet.save(A+out+'.webp',lossless=True,quality=100);print('wrote',out)

# ---- shotgun: pump action
shot=Image.open(A+'gun-shotgun.webp').convert('RGBA');S=np.array(shot)
PUMP=(154,31,201,47)   # fore-end box in the 224x96 picture
def racked(dx):
  if not dx:return shot
  a=S.copy();x0,y0,x1,y1=PUMP;pump=a[y0:y1,x0:x1].copy()
  tube=S[35:46,203:208];a[y0:y1,x0:x1]=0;a[y0:y1,x0:x1,3]=0
  # bare magazine tube where the pump was: repeat a slice of the tube seen in front of the pump
  for x in range(x0,x1,tube.shape[1]):w=min(tube.shape[1],x1-x);a[35:46,x:x+w]=tube[:,:w]
  im=Image.fromarray(a);im.alpha_composite(Image.fromarray(pump),(x0+dx,y0));return im
P=[0,0,-14,-16,-6]
arms([racked(d) for d in P],P,'arms-shotgun')

# ---- boomerang gun
rifle=Image.open(A+'gun-rifle.webp').convert('RGBA');boom=Image.open(O+'gun-boomerang.png').convert('RGBA')
bb=boom.getbbox();boom=boom.crop(bb).rotate(-90,expand=True,resample=Image.BICUBIC)   # apex points forward (right)
k=56/boom.height;boom=boom.resize((max(1,round(boom.width*k*1.25)),56),Image.LANCZOS)
gun=Image.new('RGBA',(224,96));gun.alpha_composite(rifle)
bx=214-boom.width;by=0
gun.alpha_composite(boom,(bx,by));gun.save(A+'gun-boomerang.webp',lossless=True,quality=100);print('wrote gun-boomerang',(bx,by,boom.size))
arms([gun,rifle,rifle,rifle,rifle],out='arms-boomerang')

# ---- rocket launcher with the warhead gone
R=np.array(Image.open(A+'arms-rocket.webp').convert('RGBA')).astype(np.int16)
out=R.copy()
for fx,fy in [(0,0),(0,160),(320,160),(640,160),(960,160)]:
  f=R[fy:fy+FH,fx:fx+FW];r,g,b,al=f[...,0],f[...,1],f[...,2],f[...,3];vis=al>40
  gold=vis&(r>165)&(g>125)&(b<70)&(r>b+100);gold[:,:150]=False
  ys,xs=np.where(gold)
  band=xs.min();cy=int(np.median(ys));y0,y1=cy-16,cy+16
  cut=band+3   # the first gold is the ring round the tube mouth: keep it, the warhead starts right after
  m=np.zeros(vis.shape,bool);m[y0:y1,cut:]=True
  o=out[fy:fy+FH,fx:fx+FW];o[m,3]=0
  print('rocket frame',fx,fy,'mouth',cut,'row',cy)
Image.fromarray(out.astype(np.uint8)).save(A+'arms-rocket-empty.webp',lossless=True,quality=100);print('wrote arms-rocket-empty')
