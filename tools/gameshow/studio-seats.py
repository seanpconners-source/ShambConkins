# run from the repo root; writes /tmp files (seat table -> STUDIO in src/engines/gameshow/audience.js, masks -> assets/gameshow/*.webp lossless)
import json,numpy as np
from PIL import Image,ImageDraw
T='assets/originals/gameshow/'
F={'wide':'cr-audience','tall':'cr-audience-tall','fold':'cr-audience-fold'}
TOPS={'wide':[655,559,476,412,357,310,270,236,206,182],
 'tall':[1291,1137,1007,893,806,732,669,615,559,513,467,426,387,352,321,295,272],
 'fold':[1087,953,793,698,615,550,490,440,400,362,330,300]}
AISLE={'wide':[(182,868,1032),(559,805,1110),(655,728,1212)],
 'tall':[(272,470,556),(893,375,700),(1137,300,850),(1291,232,925)],
 'fold':[(300,655,785),(793,515,935),(953,480,960),(1087,305,1245)]}
PRIOR={'wide':[(182,60),(559,127),(655,172)],'tall':[(272,57),(806,118),(893,128),(1007,155),(1137,175),(1291,230)],
 'fold':[(300,88),(550,128),(615,138),(698,152),(793,170),(953,195),(1087,235)]}
def prior(sh,y):
  P=PRIOR[sh]
  if y<=P[0][0]:return P[0][1]
  for (y0,a),(y1,b) in zip(P,P[1:]):
    if y<=y1:return a+(b-a)*(y-y0)/(y1-y0)
  return P[-1][1]
def aisle(sh,y):
  P=AISLE[sh]
  if y<=P[0][0]:return P[0][1:]
  for (y0,l0,r0),(y1,l1,r1) in zip(P,P[1:]):
    if y<=y1:u=(y-y0)/(y1-y0);return (l0+(l1-l0)*u,r0+(r1-r0)*u)
  return P[-1][1:]
out={}
for sh,tops in TOPS.items():
  im=Image.open(T+F[sh]+'.png').convert('RGB');a=np.asarray(im).astype(float);V=a.max(2);W=a.shape[1];d=ImageDraw.Draw(im);R=[]
  for i,t in enumerate(tops):
    h=(tops[i-1]-t) if i>0 else int((t-tops[1])*1.25)
    band=V[t+int(h*.15):t+int(h*.6)];prof=band.mean(0)
    L,Rr=aisle(sh,t+h*.4)
    seats=[];pitches=[]
    for lo,hi in ((0,int(L)),(int(Rr),W)):
      seg=prof[lo:hi]-prof[lo:hi].mean()
      if len(seg)<60:continue
      pr=prior(sh,t);best=None
      for k in range(int(pr*.88),int(pr*1.12)+1):
        if k>=len(seg)-10:break
        v=np.dot(seg[:-k],seg[k:])/(len(seg)-k)
        if best is None or v>best[0]:best=(v,k)
      if best:pitches.append(best[1])
    if not pitches:continue
    p=float(np.mean(pitches))
    for lo,hi,side in ((0,L,'L'),(Rr,W,'R')):
      xs=np.arange(int(lo),int(hi))
      best=None
      for o in np.arange(0,p,1.0):
        g=np.arange(o,W,p);g=g[(g>=lo)&(g<hi)].astype(int)
        if len(g)==0:continue
        sc=prof[g].mean()
        if best is None or sc<best[0]:best=(sc,o)
      o=best[1];c=o-p/2
      while c<hi:
        if c>lo+p*.2 and c<hi-p*.25 and c>-p*.3 and c<W+p*.3:seats.append(round(c))
        elif c<=lo+p*.2 and side=='L' and c>-p*.45:seats.append(round(c))
        elif c>=hi-p*.25 and side=='R' and c<W+p*.45 and c>lo+p*.2:seats.append(round(c))
        c+=p
    seats=sorted(seats)
    R.append({'t':t,'h':h,'p':round(p,1),'s':seats,'a':[round(L),round(Rr)]})
    for c in seats:d.ellipse([c-7,t+h*.35-7,c+7,t+h*.35+7],fill=(0,255,0))
    d.line([(0,t),(W,t)],fill=(0,255,255),width=2)
  out[sh]=R;im.save('/tmp/seats-'+sh+'.png');print(sh,[(r['t'],r['p'],len(r['s'])) for r in R])
json.dump(out,open('/tmp/seats.json','w'))
