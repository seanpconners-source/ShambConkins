# find the real neck stump (top-centre of the cut neck) near the measured neck of every cell; preview old (red) vs new (green)
import sys,re,json,numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage
src=open('src/data/ddSprites.js').read()
def arr(pat):return re.findall(r"'([^']+)'",re.search(pat,src,re.S).group(1))
POSES=arr(r"const POSES=\[(.*?)\];");FOE=arr(r"FOE=\[(.*?)\]");CAST=arr(r"const CAST_POSES=\[(.*?)\]")
HERO=[p for p in POSES if p not in ['block','bash','aim','lobC','lob','skate1','skate2','charge','taunt']]
js=open('src/data/ddNecks.js').read();NECKS=json.loads(js.split('/*@@*/')[1].split('/*@@end*/')[0])
def posesOf(n):
    if n.startswith('run-'):return ['r%d'%i for i in range(8)]
    if n.startswith('hero-'):return HERO
    if n.startswith(('cast-','gang-')):return CAST
    return FOE
def stump0(m,nx,ny,hx,hy,BAND=26,A0=-16,A1=26):
    # direction 'up' along the old neck->head
    ux,uy=hx-nx,hy-ny;L=(ux*ux+uy*uy)**.5 or 1;ux/=L;uy/=L
    H,W=m.shape
    # project mask pixels near the neck onto the up axis: the stump top = the farthest-up body pixels in a narrow band
    ys,xs=np.nonzero(m)
    dx=xs-nx;dy=ys-ny;along=dx*ux+dy*uy;across=dx*(-uy)+dy*ux
    sel=(np.abs(across)<BAND)&(along>A0)&(along<A1)
    if sel.sum()<20:return None
    # body component containing the old neck area
    lab,_=ndimage.label(m)
    # the top profile: for each 'across' bin the farthest 'along'
    a=across[sel];b=along[sel]
    bins={}
    for ai,bi in zip(np.round(a).astype(int),b):
        if bi>bins.get(ai,-99):bins[ai]=bi
    ks=sorted(bins);prof=np.array([bins[k] for k in ks]);ks=np.array(ks)
    top=prof.max()
    # the stump: the run of bins within 6 px of the top that contains the top; must be neck-width
    i0=int(np.argmax(prof));lo=i0;hi=i0
    while lo>0 and prof[lo-1]>top-6 and ks[lo-1]==ks[lo]-1:lo-=1
    while hi<len(ks)-1 and prof[hi+1]>top-6 and ks[hi+1]==ks[hi]+1:hi+=1
    wid=ks[hi]-ks[lo]+1
    c=(ks[lo]+ks[hi])/2;t=top-3
    return (nx+c*(-uy)+t*ux, ny+c*ux+t*uy, wid)
def stump(m,nx,ny,hx,hy):
    ok=lambda r:r and r[2]>=10 and r[2]<=40 and ((r[0]-nx)**2+(r[1]-ny)**2)**.5<=16
    r=stump0(m,nx,ny,hx,hy)
    if ok(r):return r
    r=stump0(m,nx,ny,hx,hy,14,-10,16)
    if ok(r):return r
    return None
def run(name,prev=None,fw=30):
    im=Image.open('assets/warriors/%s.webp'%name).convert('RGBA');a=np.array(im)[:,:,3]>100
    poses=posesOf(name);res={};N=NECKS.get(name,{})
    for i,p in enumerate(poses):
        if p not in N:continue
        y,x=divmod(i,8) if not name.startswith('run-') else (0,i)
        m=a[y*256:(y+1)*256,x*256:(x+1)*256]
        if m.sum()<300:continue
        nx,ny,hx,hy=N[p][:4];s=stump(m,nx,ny,hx,hy)
        res[p]=(s,N[p])
    if prev:
        d=ImageDraw.Draw(im)
        for i,p in enumerate(poses):
            if p not in res:continue
            y,x=divmod(i,8) if not name.startswith('run-') else (0,i);ox,oy=x*256,y*256
            s,o=res[p];nx,ny,hx,hy=o[:4];L=((hx-nx)**2+(hy-ny)**2)**.5 or 1;ux,uy=(hx-nx)/L,(hy-ny)/L
            d.text((ox+4,oy+4),p,fill=(255,255,0,255))
            if s:
                sx,sy,w=s;cx,cy=sx+ux*12,sy+uy*12
                d.ellipse((ox+cx-15,oy+cy-19.5,ox+cx+15,oy+cy+19.5),outline=(0,255,0,255),width=2)
                d.ellipse((ox+sx-2,oy+sy-2,ox+sx+2,oy+sy+2),fill=(0,255,0,255))
            d.ellipse((ox+nx-2,oy+ny-2,ox+nx+2,oy+ny+2),fill=(255,0,0,255))
        bg=Image.new('RGBA',im.size,(40,40,48,255));bg.alpha_composite(im);bg.convert('RGB').save(prev)
    return res
if __name__=='__main__':
    S=sys.argv[2];r=run(sys.argv[1],S)
    for p,(s,o) in r.items():print(p,o[:2],None if not s else (round(s[0]),round(s[1]),s[2]))
