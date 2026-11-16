#!/usr/bin/env python3
# usage: python3 -I tools/broforce/body-kit.py <out dir>
# GPT kit for the armless bro body v2 (owner, Nov 16: one clean body that fits the arms). The guide in every cell is the
# current stocky body (assets/broforce/bro-torso.webp, built by tools/broforce/stocky-torso.py), so GPT redraws the SAME
# poses at the SAME size as one consistent drawing instead of inventing a new (slimmer) man.
import sys,os
from PIL import Image,ImageDraw,ImageFont
A=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','assets','broforce')+'/'
out=sys.argv[1];os.makedirs(out,exist_ok=True)
ROWS=[('idle',2),('walk',6),('run',6),('jump',1),('fall',1),('climb',2),('ladder',2)]
FW,FH=128,192   # delivery size per frame (2x)
SH=(52,74);NECK=(64,44);FEET=(64,188)
body=Image.open(A+'bro-torso.webp').convert('RGBA')
def font(n):
  for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf']:
    if os.path.exists(f):return ImageFont.truetype(f,n)
  return ImageFont.load_default()
F=font(11);FB=font(13)
cols=max(n for _,n in ROWS)
T=Image.new('RGBA',(cols*FW,len(ROWS)*FH),(0,0,0,0));d=ImageDraw.Draw(T)
for r,(name,n) in enumerate(ROWS):
  for c in range(cols):
    x0,y0=c*FW,r*FH
    if c>=n:d.rectangle((x0,y0,x0+FW-1,y0+FH-1),fill=(0,0,0,70));continue
    d.rectangle((x0,y0,x0+FW-1,y0+FH-1),fill=(80,120,200,22),outline=(0,0,0,90))
    g=body.crop((c*FW,r*FH,(c+1)*FW,(r+1)*FH));a=g.split()[3].point(lambda v:int(v*.42));g.putalpha(a);T.alpha_composite(g,(x0,y0))
    if name!='ladder':
      d.ellipse((x0+SH[0]-9,y0+SH[1]-9,x0+SH[0]+9,y0+SH[1]+9),outline=(220,0,255,255),width=2)
    d.line((x0+NECK[0]-6,y0+NECK[1],x0+NECK[0]+6,y0+NECK[1]),fill=(0,140,170,255),width=2);d.line((x0+NECK[0],y0+NECK[1]-6,x0+NECK[0],y0+NECK[1]+6),fill=(0,140,170,255),width=2)
    d.line((x0+FEET[0]-7,y0+FEET[1],x0+FEET[0]+7,y0+FEET[1]),fill=(230,0,0,255),width=2);d.line((x0+FEET[0],y0+FEET[1]-7,x0+FEET[0],y0+FEET[1]+3),fill=(230,0,0,255),width=2)
    d.text((x0+4,y0+3),f'{name} {c+1}',fill=(0,0,50,255),font=F)
T.save(out+'/TEMPLATE-bro-torso.png')
T.resize((T.width*2,T.height*2),Image.NEAREST).save(out+'/TEMPLATE-bro-torso@2x-zoom.png')
# full-strength reference: what to redraw (clean, one consistent body)
R=Image.new('RGBA',body.size,(120,170,220,255));R.alpha_composite(body);R.save(out+'/REFERENCE-current-body.png')
# how the arms attach (arms-rifle hold frame on the idle body) + where the head goes
arms=Image.open(A+'arms-rifle.webp').convert('RGBA').crop((0,0,320,160))
W=Image.new('RGBA',(420,240),(120,170,220,255));bx,by=60,30
W.alpha_composite(body.crop((0,0,FW,FH)),(bx,by));W.alpha_composite(arms,(bx+SH[0]-64,by+SH[1]-56))
dd=ImageDraw.Draw(W);dd.ellipse((bx+NECK[0]-24,by+NECK[1]-50,bx+NECK[0]+24,by+NECK[1]+2),outline=(0,140,170,255),width=2)
dd.text((bx+NECK[0]+28,by+NECK[1]-36),'head goes here (game adds it)',fill=(0,40,60,255),font=F)
dd.text((8,215),'The arms are a separate picture pinned at the magenta shoulder. Body = NO arms.',fill=(0,0,40,255),font=F)
W.save(out+'/HOW-ARMS-ATTACH.png')
print('kit in',out)
