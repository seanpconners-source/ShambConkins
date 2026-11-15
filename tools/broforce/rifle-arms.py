#!/usr/bin/env python3
# usage: python3 tools/broforce/rifle-arms.py assets/broforce/arms-rifle.webp   (needs opencv-python-headless)
# arms-rifle: GPT's image tool refused every rifle; built from the laser arms (straight two-hand hold) with the owner's
# gun-rifle picture: big skin patches (arms) at the back, the rifle over them, then the gloved hands + fingers on top.
import sys,numpy as np,cv2
from PIL import Image
A='/home/user/ShambConkins/assets/broforce/'
src=np.array(Image.open(A+'arms-laser.webp').convert('RGBA')).astype(np.int16)
rifle=Image.open(A+'gun-rifle.webp').convert('RGBA')          # 2x template, grip anchor (96,48)
FW,FH=320,160;GRIP=(124,84)
HANDS=[(118,86,24,18),(192,81,28,17)]   # front glove on the grip, back hand on the fore-end (2x frame px)
def comps(mask,minA):
  n,lab,st,_=cv2.connectedComponentsWithStats(mask.astype(np.uint8),8)
  keep=np.zeros_like(mask)
  for i in range(1,n):
    if st[i,cv2.CC_STAT_AREA]>=minA:keep|=lab==i
  return keep
def frame(fx,fy):
  f=src[fy:fy+FH,fx:fx+FW];R,G,B,Al=f[...,0],f[...,1],f[...,2],f[...,3];vis=Al>40
  skin=comps(vis&(R>G+12)&(G>=B-6)&(R>85)&((R-B)>28),60)
  skin=cv2.morphologyEx(skin.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))>0
  # fill holes inside the arm patches
  inv=(~skin).astype(np.uint8);n,lab,st,_=cv2.connectedComponentsWithStats(inv,4)
  for i in range(1,n):
    x,y,w,h,a=st[i];
    if x>0 and y>0 and x+w<FW and y+h<FH and a<400:skin|=lab==i
  yy,xx=np.mgrid[0:FH,0:FW];hand=np.zeros_like(vis)
  for cx,cy,rx,ry in HANDS:hand|=((xx-cx)/rx)**2+((yy-cy)/ry)**2<=1
  dark=vis&(R<100)&(G<100)&(B<100)&(np.abs(R-B)<32)&(B<=R+8)
  top=hand&(dark|skin)&vis
  top=comps(top,30)
  col=f.astype(np.uint8)
  def layer(m):
    L=np.zeros((FH,FW,4),np.uint8);L[m]=col[m];L[m,3]=np.where(vis[m],col[m][:,3],255);return Image.fromarray(L)
  base=Image.new('RGBA',(FW,FH))
  base.alpha_composite(layer(skin&~top))
  base.alpha_composite(rifle,(GRIP[0]-96,GRIP[1]-48))
  base.alpha_composite(layer(top))
  return np.array(base)
out=np.zeros((src.shape[0],src.shape[1],4),np.uint8)
for fy,cnt in [(0,1),(160,4)]:
  for i in range(cnt):out[fy:fy+FH,i*FW:(i+1)*FW]=frame(i*FW,fy)
Image.fromarray(out).save(sys.argv[1])
