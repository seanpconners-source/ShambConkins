#!/usr/bin/env python3
# Moves the bat in the batter sheets stance row (assets/originals/baseball/batter-p1|p2.png = the owner art) from behind the
# face circle to over the other shoulder: mirrors the bat about its knob, snaps it into the gloves, waggle = frames 1,1,3,3.
# Usage: python3 -I tools/baseball-stance-bat.py 0   (the number = extra lean in degrees) -> assets/baseball/batter-p1|p2.png
import sys
from PIL import Image
ANG=float(sys.argv[1]);CUT=50   # above CUT a stance frame holds only the bat (the game draws the head)
def fix(src,dst):
    im=Image.open(src).convert('RGBA');out=im.copy()
    for f in range(4):
        X=f*128;fr=im.crop((X,0,X+128,160));px=fr.load()
        xs=[x for y in range(CUT-4,CUT) for x in range(128) if px[x,y][3]>40];kx=sum(xs)/len(xs);ky=CUT
        bat=Image.new('RGBA',(128,160),(0,0,0,0));bat.paste(fr.crop((0,0,128,CUT)),(0,0))
        b2=bat.transpose(Image.FLIP_LEFT_RIGHT);k2=127-kx
        b2=b2.transform(b2.size,Image.AFFINE,(1,0,k2-kx,0,1,0),resample=Image.NEAREST)
        b2=b2.rotate(ANG,resample=Image.NEAREST,center=(kx,ky))
        # put the knob in the top of the batting gloves (white, grey-neutral pixels)
        gl=[(x,y) for y in range(CUT-6,75) for x in range(128) if px[x,y][3]>200 and min(px[x,y][:3])>195 and max(px[x,y][:3])-min(px[x,y][:3])<25]
        gy=min(y for x,y in gl);gx=sum(x for x,y in gl if y<gy+3)/len([1 for x,y in gl if y<gy+3])
        dx,dy=round(gx-kx),round(gy+3-ky)
        b2=b2.transform(b2.size,Image.AFFINE,(1,0,-dx,0,1,-dy),resample=Image.NEAREST)
        print(f,round(kx),ky,'->',round(gx),gy,(dx,dy))
        body=fr.copy();body.paste((0,0,0,0),(0,0,128,CUT))
        comp=Image.new('RGBA',(128,160),(0,0,0,0));comp.alpha_composite(b2);comp.alpha_composite(body)
        out.paste(comp,(X,0))
    # frames 2 and 4 hold the hands lower and leave pieces of the old bat: the waggle uses frames 1,1,3,3
    for a,b in [(0,1),(2,3)]:out.paste(out.crop((a*128,0,a*128+128,160)),(b*128,0))
    out.save(dst)
for n in ['batter-p1','batter-p2']:fix(f'assets/originals/baseball/{n}.png',f'assets/baseball/{n}.png')
