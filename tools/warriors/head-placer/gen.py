import sys,json,math,os,numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import stump as ST
OUT=sys.argv[1]
LABEL={'hero-p1':'Player 1','hero-p2':'Player 2','run-p1':'P1 running','run-p2':'P2 running','foe-cop':'Cops','foe-riot':'Riot cops','foe-turnbull':'Turnbull ACs','foe-orphan':'Orphans','foe-fury':'Baseball Furies','foe-lizzie':'Lizzies','foe-punk':'Punks','foe-rogue':'Rogues','foe-riff':'Riffs','cast-cyrus':'Cyrus','gang-hihat':'Hi-Hats','gang-bopper':'Boppers'}
FACE={'hero-p1':'p1','hero-p2':'p2','run-p1':'p1','run-p2':'p2'}
FH={'p1':34.5,'p2':34.5}
sheets=[]
for sid,label in LABEL.items():
    path='assets/warriors/%s.webp'%sid;im=Image.open(path).convert('RGBA');a=np.array(im)[:,:,3]>100
    poses=ST.posesOf(sid);N=ST.NECKS.get(sid,{});cells=[]
    for i,p in enumerate(poses):
        if p not in N:continue
        r,c=(0,i) if sid.startswith('run-') else divmod(i,8)
        if (r+1)*256>im.height:continue
        m=a[r*256:(r+1)*256,c*256:(c+1)*256]
        if m.sum()<300:continue
        nx,ny,hx,hy=N[p][:4];L=math.hypot(hx-nx,hy-ny) or 1;ux,uy=(hx-nx)/L,(hy-ny)/L
        s=ST.stump(m,nx,ny,hx,hy);sx,sy=(s[0],s[1]) if s else (nx,ny)
        fh=FH.get(FACE.get(sid),37.5)
        cx,cy=sx+ux*fh*.3,sy+uy*fh*.3;ang=math.degrees(math.atan2(ux,-uy))
        cells.append({'p':p,'c':c,'r':r,'d':[round(cx,1),round(cy,1),round(ang,1),1],**({'b':1} if p in ('win','up') else {})})
    im.save(f'{OUT}/sheets/{sid}.webp',quality=90,method=6)
    sheets.append({'id':sid,'name':label,'face':FACE.get(sid,'gang'),'img':f'sheets/{sid}.webp','cells':cells})
    print(sid,len(cells))
# faces: Sean (already cut out), Amber (black backdrop flooded away from the edges)
sean=Image.open('assets/c037c271407a.webp').convert('RGBA');sean.save(f'{OUT}/faces/p1.png')
am=Image.open('assets/40575750a179.jpg').convert('RGB');A=np.array(am).astype(int);dark=A.max(axis=2)<34
lab,_=ndimage.label(dark);edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
bg=np.isin(lab,list(edge));alpha=np.where(bg,0,255).astype(np.uint8);alpha=ndimage.uniform_filter(alpha.astype(float),3).astype(np.uint8)
rgba=np.dstack([np.array(am),alpha]);Image.fromarray(rgba,'RGBA').resize((422,640),Image.LANCZOS).save(f'{OUT}/faces/p2.png')
faces={'p1':{'src':'faces/p1.png','f':[.005,.214,.959,.655],'aspect':.594},'p2':{'src':'faces/p2.png','f':[.017,.305,.903,.684],'aspect':.659}}
json.dump({'sheets':sheets,'faces':faces},open(f'{OUT}/data.json','w'),separators=(',',':'))
