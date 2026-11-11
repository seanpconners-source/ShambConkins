#!/usr/bin/env python3
"""Where the face goes on the owner's hero sheet (assets/originals/sotn/hero-p1.png).
The owner's Alucard frames draw a small head of their own (silver hair) on a body that fills only the lower part of the
128x144 frame, so the face circle of the template would float above it. This finds the drawn head in every frame (the
centroid of the light grey hair pixels near the top of the figure) and prints a `headRows` table for src/data/sotnSprites.js
that puts the face (headSize px across) a little above it, covering the drawn head and resting on the shoulders.
Usage: python3 tools/sotn/hero-heads.py [sheet.png]"""
import sys,json,math
import numpy as np
from PIL import Image
ROWS=[('stand',4),('walk',8),('crouch',2),('crouchSlash',4),('jump',3),('fall',3),('flip',8),('land',2),('dash',4),('kick',2),
      ('hurt',2),('cast',4),('slash',4),('stab',5),('cleave',6),('dead',6)]
LIFT=8   # face centre this many px above the drawn head's centre (along the body: flip/dead rows turn round)
ease=lambda u:u*u*(3-2*u)
def rot(name,f,n):
  if name=='flip':return ease((f+.5)/n)*2*math.pi          # the somersault (same as flipHeads in sotnSprites.js)
  if name=='dead':return -1.45*(f/(n-1) if n>1 else 1)       # falling onto the back (deadHeads)
  return 0
a=np.array(Image.open(sys.argv[1] if len(sys.argv)>1 else 'assets/originals/sotn/hero-p1.png').convert('RGBA'))
out={}
for r,(name,n) in enumerate(ROWS):
  fr_list=[]
  for f in range(n):
    fr=a[r*144:(r+1)*144,f*128:(f+1)*128];al=fr[:,:,3]>60;ys,xs=np.nonzero(al)
    if not len(ys):fr_list.append([61,44]);continue
    y0=ys.min();rgb=fr[:,:,:3].astype(int)
    hair=al&(rgb.min(2)>150)&(rgb.max(2)-rgb.min(2)<40);a_=rot(name,f,n)
    if a_:hy,hx=np.nonzero(hair);hy=hy-y0                       # turned: the hair may be anywhere in the frame
    else:hy,hx=np.nonzero(hair[y0:y0+22])
    if len(hx):cx,cy=hx.mean()+2*math.cos(a_),hy.mean()+y0
    else:cx,cy=xs.mean(),y0+7
    e=[round(float(cx+LIFT*math.sin(a_))),round(float(cy-LIFT*math.cos(a_)))]
    fr_list.append(e+[round(a_,2)] if a_ else e)
  out[name]=fr_list
# Frames this measuring gets wrong, read by hand off a gridded zoom of the sheet (Nov 11, owner: faces must sit on the necks):
# the face spot = the top of the drawn hair dome (stand0: 1 px above it, 2 px forward of its middle). The raised sword arm
# (slash0, cleave0/1, crouchSlash0, cast2/3) is the top of the figure there, the dive kick's hair streams above the head, and
# in fall1/2 the cape flaps up over it (spot over the coat, not the cape). Both sheets share the layout.
FIX={'slash':{0:[58,64]},'cleave':{0:[59,65],1:[59,62],2:[61,64]},'crouchSlash':{0:[57,79]},'fall':{0:[59,66],1:[62,66],2:[61,66]},
     'cast':{1:[62,66],2:[61,65],3:[65,65]},'kick':{0:[62,65],1:[63,65]}}
for name,fx in FIX.items():
  for f,v in fx.items():out[name][f]=v
print(json.dumps(out,separators=(',',':')))
