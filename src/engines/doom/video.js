// 2D drawing for the Doom minigame in the original 320x200 coordinate space, scaled into the 8-bit screen and centred
// on wide screens: patches, flats tiled as backdrops, the HUD font (STCFN), and Doom's screen melt.
class Video{
 constructor(gfx,r){this.gfx=gfx;this.r=r;}
 get s(){return this.r.H/200;}
 get ox(){return Math.floor((this.r.W-320*this.s)/2);}
 // draw a patch at virtual (x,y); opts.flip, opts.cmap (colormap offset), opts.clip [x0,y0,x1,y1] virtual
 patch(p,x,y,o={}){if(typeof p==='string')p=this.gfx.patch(p);if(!p)return;const s=this.s,scr=this.r.screen,W=this.r.W,H=this.r.H,cm=this.gfx.colormaps,cmap=o.cmap||0,tr=o.tr;
  const bx=(o.raw?0:this.ox)+(x-p.left)*s,by=(y-p.top)*s,w=p.w*s,h=p.h*s;
  const x0=Math.max(0,Math.ceil(bx)),x1=Math.min(W,Math.ceil(bx+w)),y0=Math.max(0,Math.ceil(by)),y1=Math.min(H,Math.ceil(by+h));
  for(let px=x0;px<x1;px++){let col=Math.floor((px-bx)/s);if(o.flip)col=p.w-1-col;if(col<0||col>=p.w)continue;const base=col*p.h;
   for(let py=y0;py<y1;py++){const row=Math.floor((py-by)/s);if(row<0||row>=p.h||!p.mask[base+row])continue;let c=p.pix[base+row];if(tr)c=tr[c];scr[py*W+px]=cmap?cm[cmap+c]:c;}}}
 // the patch drawn with its offsets ignored, top-left at (x,y)
 patchAt(p,x,y,o={}){if(typeof p==='string')p=this.gfx.patch(p);if(!p)return;this.patch(p,x+p.left,y+p.top,o);}
 width(name){const p=this.gfx.patch(name);return p?p.w:0;}
 // fill the real screen rect (pixels) with a tiled flat
 flatFill(name,x0,y0,x1,y1){const n=this.gfx.flatNum.get(name);const f=n===undefined?null:this.gfx.flat(n),scr=this.r.screen,W=this.r.W,s=this.s;
  for(let y=Math.max(0,y0);y<Math.min(this.r.H,y1);y++)for(let x=Math.max(0,x0);x<Math.min(W,x1);x++)scr[y*W+x]=f?f[((Math.floor(y/s)&63)<<6)|(Math.floor((x-this.ox)/s)&63)]:0;}
 fill(c,x0=0,y0=0,x1=this.r.W,y1=this.r.H){const scr=this.r.screen,W=this.r.W;for(let y=Math.max(0,y0);y<Math.min(this.r.H,y1);y++)scr.fill(c,y*W+Math.max(0,x0),y*W+Math.min(W,x1));}
 // darken the whole screen through a colormap (menus over the game, like the paused look)
 darken(level=12){const scr=this.r.screen,cm=this.gfx.colormaps;for(let i=0;i<scr.length;i++)scr[i]=cm[level*256+scr[i]];}
 // HUD font: STCFN033.. (ASCII 33..95); lowercase is drawn as uppercase
 fontChar(c){c=c.toUpperCase().charCodeAt(0);if(c<33||c>95)return null;return this.gfx.patch('STCFN'+String(c).padStart(3,'0'));}
 textWidth(t){let w=0;for(const ch of t){const p=this.fontChar(ch);w+=p?p.w:4;}return w;}
 text(t,x,y,o={}){let cx=x;for(const ch of String(t)){if(ch==='\n'){cx=x;y+=11;continue;}const p=this.fontChar(ch);if(!p){cx+=4;continue;}if(cx+p.w>(o.right??330))break;this.patchAt(p,cx,y,o);cx+=p.w;}}
 // a translation table mapping red -> other colours, for tinted text (o.tr)
 tint(range){const t=new Uint8Array(256).map((_,i)=>i);for(let i=176;i<192;i++)t[i]=range+(i-176);return t;}
}
// Doom's "melt" wipe between screens: columns slide down with a little random stagger
class Melt{
 constructor(start,W,H,rnd){this.start=start.slice();this.W=W;this.H=H;this.cols=Math.ceil(W/2);this.y=new Int32Array(this.cols);
  const k=H/200;this.y[0]=-(rnd()%16)*k;for(let i=1;i<this.cols;i++){const r=((rnd()%3)-1)*k;this.y[i]=Math.max(-15*k,Math.min(0,this.y[i-1]+r));}this.done=false;this.k=k;}
 // advance one tic; returns true when finished
 tick(){let done=true;const H=this.H,k=this.k;for(let i=0;i<this.cols;i++){const y=this.y[i];if(y<0){this.y[i]=Math.min(0,y+k);done=false;}else if(y<H){let dy=y<16*k?y+k:8*k;if(y+dy>=H)dy=H-y;this.y[i]=y+dy;done=false;}}this.done=done;return done;}
 // overlay the old screen on top of `screen` (the new one already drawn)
 draw(screen){const W=this.W,H=this.H,s=this.start;for(let i=0;i<this.cols;i++){const off=Math.max(0,Math.floor(this.y[i]));for(let c=i*2;c<Math.min(W,i*2+2);c++)for(let y=off;y<H;y++)screen[y*W+c]=s[(y-off)*W+c];}}
}
Object.assign(exports,{Video,Melt});
