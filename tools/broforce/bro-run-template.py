#!/usr/bin/env python3
# Template for the bro-run slot (8-frame walk + run for the bro-body WITH its arms): each cell shows, faintly, the current
# bro-body upper half (arms, fist forward: keep it) over the legs of GPT's armless bro-torso walk/run frames (the leg motion
# to copy). Marks: red cross = feet, cyan = face spot (no head), yellow ring = the fist (the game puts the gun there).
#   python3 tools/broforce/bro-run-template.py  -> docs/broforce-sprites/templates/bro-run.png
from PIL import Image,ImageDraw,ImageFont
R='/home/user/ShambConkins/'
body=Image.open(R+'assets/broforce/bro-body.webp').convert('RGBA');bs=body.width//384
torso=Image.open(R+'assets/originals/broforce/bro-torso.png').convert('RGBA');ts=torso.width//512
FW,FH,CUT=64,96,58          # bro-body rows: idle; bro-torso rows: idle walk run ...
up=body.crop((0,0,FW*bs,FH*bs)).resize((FW,FH),Image.LANCZOS)
out=Image.new('RGBA',(FW*8,FH*2+28),(0,0,0,0));d=ImageDraw.Draw(out)
def faint(im,a):px=im.copy();al=px.getchannel('A').point(lambda v:int(v*a));px.putalpha(al);return px
for r,row in enumerate(['walk','run']):
  tr=1+r   # torso row index
  for i in range(8):
    X,Y=i*FW,r*FH
    d.rectangle([X,Y,X+FW-1,Y+FH-1],fill=(80,120,200,18),outline=(0,0,0,90))
    legs=torso.crop((i*FW*ts,tr*FH*ts,(i+1)*FW*ts,(tr+1)*FH*ts)).resize((FW,FH),Image.LANCZOS)
    L=Image.new('RGBA',(FW,FH));L.paste(legs.crop((0,CUT-6,FW,FH)),(0,CUT-6))
    U=Image.new('RGBA',(FW,FH));U.paste(up.crop((0,0,FW,CUT)),(0,0))
    out.alpha_composite(faint(L,.33),(X,Y));out.alpha_composite(faint(U,.33),(X,Y))
    def cross(x,y,c):d.line([(x-4,y),(x+4,y)],fill=c,width=1);d.line([(x,y-4),(x,y+4)],fill=c,width=1)
    cross(X+32,Y+94,(230,0,0,255));d.ellipse([X+32-5,Y+22-5,X+32+5,Y+22+5],outline=(0,140,200,255));d.ellipse([X+56-3,Y+50-3,X+56+3,Y+50+3],outline=(200,150,0,255))
    d.text((X+2,Y+1),f'{row} {i+1}',fill=(0,0,60,255))
d.text((2,FH*2+2),'bro-run: SAME bro-body (arms + fist forward, same size), only the legs move like the faint legs.',fill=(0,50,110,255))
d.text((2,FH*2+15),'Red = feet, cyan = face spot (NO head), yellow = fist (the gun goes there). 1x or exactly 2x.',fill=(0,50,110,255))
out.save(R+'docs/broforce-sprites/templates/bro-run.png')
