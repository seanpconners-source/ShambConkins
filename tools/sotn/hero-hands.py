#!/usr/bin/env python3
"""Where the sword hand is on the owner's hero sheets (assets/originals/sotn/hero-p1.png, hero-p2.png).
The owner's frames draw Alucard with a bare fist (no sword: the game draws the sword, it changes when Death takes your
gear), and that fist is not where the template's yellow sword-hand ring was, so a sword drawn at the template's hand
floated above the real one. This finds the fist in every frame of the rows that swing the sword: the clumps of skin
pixels (warm and light: not grey hair, not gold trim), and of those the one furthest up-and-forward (the sword arm is
raised for the wind-up and reaches forward for the cut), skipping the drawn face. It prints the fist centres in frame px
as a `HERO_HANDS` table for src/data/sotnSprites.js; the game puts the middle of the sword's grip there.
Usage: python3 tools/sotn/hero-hands.py [--debug out.png] [sheet.png ...]  (one table per sheet; re-run if one is redrawn)"""
import sys,json
import numpy as np
from PIL import Image,ImageDraw
ROWS=[('stand',4),('walk',8),('crouch',2),('crouchSlash',4),('jump',3),('fall',3),('flip',8),('land',2),('dash',4),('kick',2),
      ('hurt',2),('cast',4),('slash',4),('stab',5),('cleave',6),('dead',6)]
SWING=['crouchSlash','slash','stab','cleave']   # the rows the game draws the sword in
def clumps(mask):
  """connected clumps (8-neighbour) of a boolean mask: list of [[y,x],...] arrays"""
  seen=np.zeros_like(mask);out=[];H,W=mask.shape
  for y0,x0 in zip(*np.nonzero(mask)):
    if seen[y0,x0]:continue
    st=[(y0,x0)];seen[y0,x0]=True;pts=[]
    while st:
      y,x=st.pop();pts.append((y,x))
      for dy in(-1,0,1):
        for dx in(-1,0,1):
          v,u=y+dy,x+dx
          if 0<=v<H and 0<=u<W and mask[v,u] and not seen[v,u]:seen[v,u]=True;st.append((v,u))
    out.append(np.array(pts))
  return out
def skin(fr):
  al=fr[:,:,3]>60;rgb=fr[:,:,:3].astype(int);r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
  return al&(r>195)&(g>145)&(b>120)&(r>=g)&(g>=b)&(r-b>=18)&(r-b<=110)
def hand(fr,face):
  """fist centre [x,y] (frame px): the skin clump furthest up-and-forward, not on the face"""
  best=None
  for c in clumps(skin(fr)):
    if len(c)<3:continue
    cy,cx=c[:,0].mean(),c[:,1].mean()
    if face and (cx-face[0])**2+(cy-face[1])**2<9**2:continue   # the drawn head's own face
    sc=cx-cy*.8
    if best is None or sc>best[0]:best=(sc,cx,cy)
  return [round(float(best[1]),1),round(float(best[2]),1)] if best else None
def face(fr):
  """the drawn head: centre of the grey hair in the top part of the body (hero-heads.py does the same)"""
  al=fr[:,:,3]>60;rgb=fr[:,:,:3].astype(int);hair=al&(rgb.min(2)>150)&(rgb.max(2)-rgb.min(2)<40)
  hy,hx=np.nonzero(hair)
  if not len(hx):return None
  top=hy<hy.min()+18;return (hx[top].mean()+3,hy[top].mean()+4)   # the face sits just in front of / under the hair
args=sys.argv[1:];dbg=None
if args[:1]==['--debug']:dbg=args[1];args=args[2:]
paths=args or ['assets/originals/sotn/hero-p1.png','assets/originals/sotn/hero-p2.png']
K=4;sheet=Image.new('RGBA',(128*K*6,92*K*len(SWING)*len(paths)),(40,60,40,255)) if dbg else None
for pi,path in enumerate(paths):
  a=np.array(Image.open(path).convert('RGBA'));out={}
  for r,(name,n) in enumerate(ROWS):
    if name not in SWING:continue
    out[name]=[]
    for f in range(n):
      fr=a[r*144:(r+1)*144,f*128:(f+1)*128];fc=face(fr);h=hand(fr,fc);out[name].append(h)
      if dbg and h:
        im=Image.fromarray(fr[40:132]).resize((128*K,92*K),Image.NEAREST);d=ImageDraw.Draw(im)
        x,y=h[0]*K,(h[1]-40)*K;d.ellipse([x-6,y-6,x+6,y+6],outline=(0,255,255,255),width=2)
        if fc:d.ellipse([fc[0]*K-4,(fc[1]-40)*K-4,fc[0]*K+4,(fc[1]-40)*K+4],outline=(255,0,255,255),width=2)
        d.text((4,4),f'{path[-6:-4]} {name}{f} {h}',fill=(255,255,255,255))
        sheet.alpha_composite(im,(f*128*K,(pi*len(SWING)+SWING.index(name))*92*K))
  print(path);print(json.dumps(out,separators=(',',':')))
if dbg:sheet.save(dbg)
