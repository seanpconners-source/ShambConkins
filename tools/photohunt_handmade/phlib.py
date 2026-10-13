# Photo-hunt difference toolkit: every op edits img (float32 BGR) in place and returns its region (cx,cy,r) in px.
import numpy as np, cv2
def soft(h,w,cx,cy,rx,ry,feather=.35,rect=False,angle=0):
  m=np.zeros((h,w),np.float32)
  if rect: cv2.rectangle(m,(int(cx-rx),int(cy-ry)),(int(cx+rx),int(cy+ry)),1,-1)
  else: cv2.ellipse(m,(int(cx),int(cy)),(int(rx),int(ry)),angle,0,360,1,-1)
  k=max(1,int(feather*min(rx,ry)))|1
  if k>1:
    m=cv2.erode(m,np.ones((k//2+1,k//2+1),np.uint8));m=cv2.GaussianBlur(m,(0,0),k/3)
  return m
def _hsv(img): return cv2.cvtColor(np.clip(img,0,255).astype(np.float32)/255,cv2.COLOR_BGR2HSV)
def _bgr(hsv): return cv2.cvtColor(hsv,cv2.COLOR_HSV2BGR)*255
def hue_sel(hsv,lo,hi,smin=.18,vmin=.08):
  h=hsv[...,0];sel=((h>=lo)&(h<=hi)) if lo<=hi else ((h>=lo)|(h<=hi))
  return (sel&(hsv[...,1]>=smin)&(hsv[...,2]>=vmin)).astype(np.float32)
def recolor(img,cx,cy,rx,ry,shift=0,hue=None,sat=1,val=1,sel=None,rect=False,feather=.35,angle=0,setsat=None,vmax=None):
  """Shift (or set) hue inside an ellipse; sel=(lo,hi[,smin,vmin]) limits it to pixels in that hue band."""
  h,w=img.shape[:2];m=soft(h,w,cx,cy,rx,ry,feather,rect,angle);hsv=_hsv(img)
  if sel: s=hue_sel(hsv,*sel);s=cv2.GaussianBlur(s,(0,0),1.2);m=m*s
  if vmax is not None: m=m*cv2.GaussianBlur((hsv[...,2]<vmax).astype(np.float32),(0,0),1.2)
  o=hsv.copy()
  o[...,0]=(hue if hue is not None else (o[...,0]+shift))%360
  if setsat is not None:o[...,1]=np.maximum(o[...,1],setsat)*np.clip(o[...,2]*1.4,0,1)
  o[...,1]=np.clip(o[...,1]*sat,0,1);o[...,2]=np.clip(o[...,2]*val,0,1)
  img[:]=img*(1-m[...,None])+_bgr(o)*m[...,None]
  return (cx,cy,max(rx,ry))
def clone(img,src,dst,rx,ry,flipx=False,flipy=False,scale=1.0,feather=.35,rect=False,base=None,rot=0):
  """Copy the patch around src onto dst (soft-edged); remove = clone from a clean nearby spot."""
  b=img.copy() if base is None else base
  h,w=img.shape[:2];sx,sy=src;dx,dy=dst
  R=int(max(rx,ry)*1.6/scale)+4
  y0,y1,x0,x1=max(0,int(sy-R)),min(h,int(sy+R)),max(0,int(sx-R)),min(w,int(sx+R))
  M=np.float32([[1,0,0],[0,1,0]])
  # map dst pixel -> src pixel: s = src + A*(d-dst)
  A=np.array([[(-1 if flipx else 1)/scale,0],[0,(-1 if flipy else 1)/scale]],np.float32)
  if rot:
    c,s_=np.cos(np.radians(rot)),np.sin(np.radians(rot));A=A@np.array([[c,-s_],[s_,c]],np.float32)
  M=np.hstack([A,np.array([[sx],[sy]],np.float32)-A@np.array([[dx],[dy]],np.float32)])
  warped=cv2.warpAffine(b,M,(w,h),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP*0,borderMode=cv2.BORDER_REFLECT) if False else cv2.warpAffine(b,M,(w,h),flags=cv2.INTER_LINEAR+cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REFLECT)
  m=soft(h,w,dx,dy,rx,ry,feather,rect)
  img[:]=img*(1-m[...,None])+warped*m[...,None]
  return (dx,dy,max(rx,ry))
def remove(img,cx,cy,rx,ry,off,**k): return clone(img,(cx+off[0],cy+off[1]),(cx,cy),rx,ry,**k)
def mirror(img,cx,cy,rx,ry,flipx=True,flipy=False,**k): return clone(img,(cx,cy),(cx,cy),rx,ry,flipx=flipx,flipy=flipy,**k)
def swap(img,a,b,rx,ry,**k):
  base=img.copy();clone(img,a,b,rx,ry,base=base,**k);clone(img,b,a,rx,ry,base=base,**k)
  return ((a[0]+b[0])/2,(a[1]+b[1])/2,max(abs(a[0]-b[0])/2+rx,ry))
def inpaint(img,cx,cy,rx,ry,rad=7):
  h,w=img.shape[:2];m=np.zeros((h,w),np.uint8);cv2.ellipse(m,(int(cx),int(cy)),(int(rx),int(ry)),0,0,360,255,-1)
  img[:]=cv2.inpaint(np.clip(img,0,255).astype(np.uint8),m,rad,cv2.INPAINT_TELEA).astype(np.float32)
  return (cx,cy,max(rx,ry))
def inpaint_line(img,pts,th=8,rad=6):
  h,w=img.shape[:2];m=np.zeros((h,w),np.uint8);cv2.polylines(m,[np.int32(pts)],False,255,th)
  img[:]=cv2.inpaint(np.clip(img,0,255).astype(np.uint8),m,rad,cv2.INPAINT_TELEA).astype(np.float32)
  xs=[p[0] for p in pts];ys=[p[1] for p in pts]
  return ((min(xs)+max(xs))/2,(min(ys)+max(ys))/2,max(max(xs)-min(xs),max(ys)-min(ys))/2+th)
def vfill(img,x0,x1,y0,y1,soft_px=12):
  """Erase a horizontal strip by blending each column from the row above to the row below."""
  t=np.linspace(0,1,y1-y0)[:,None,None];top=img[y0-1:y0,x0-soft_px:x1+soft_px];bot=img[y1:y1+1,x0-soft_px:x1+soft_px]
  fill=top*(1-t)+bot*t;wx=np.ones(x1-x0+2*soft_px,np.float32);r=np.linspace(0,1,soft_px);wx[:soft_px]=r;wx[-soft_px:]=r[::-1]
  seg=img[y0:y1,x0-soft_px:x1+soft_px];seg[:]=seg*(1-wx[None,:,None])+fill*wx[None,:,None]
  return ((x0+x1)/2,(y0+y1)/2,(x1-x0)/2)
