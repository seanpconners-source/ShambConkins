// Paints the Arcade art (icon, logo, background) of the two SMB3 bonus games from the game's own drawing code
// (src/engines/smb3.js drawIcon/cardBack/bg). node tools/smb3-art.mjs [outDir] → <out>/tiles/<id>.png, keyart/<id>.png, keyart/<id>-logo.png
import fs from 'fs';import path from 'path';import {createRequire} from 'module';
const require=createRequire('/node-tools/node_modules/');const {chromium}=require('playwright');
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');const out=path.resolve(process.argv[2]||path.join(root,'local-test-reports/smb3-art'));
const src=fs.readFileSync(path.join(root,'src/engines/smb3.js'),'utf8');const kit=fs.readFileSync(path.join(root,'src/engines/arenaKit.js'),'utf8');
const pick=(t,name)=>{const i=t.indexOf('function '+name+'(');let d=0,j=t.indexOf('{',i);for(;j<t.length;j++){if(t[j]==='{')d++;else if(t[j]==='}'&&!--d)break;}return t.slice(i,j+1);};
const lib=[pick(kit,'rr'),"const BLUE='#2a3ad0',DARK='#0c103a',PANEL=['mushroom','flower','star'];",pick(src,'drawIcon'),pick(src,'cardBack'),pick(src,'bg')].join('\n');
const page_js=`${lib}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function face(x,kind,cx,cy,w,h){x.fillStyle='#000';rr(x,cx-w/2-3,cy-h/2-3,w+6,h+6,w*.12);x.fill();x.fillStyle='#fff';rr(x,cx-w/2,cy-h/2,w,h,w*.1);x.fill();drawIcon(x,kind,cx,cy,w*.78);}
function panel(x,cx,cy,box,pics,stopped){x.fillStyle='#000';rr(x,cx-box/2-box*.07,cy-box/2-box*.07,box*1.14,box*1.14,box*.09);x.fill();x.fillStyle='#fff';rr(x,cx-box/2-box*.04,cy-box/2-box*.04,box*1.08,box*1.08,box*.07);x.fill();
 x.save();x.beginPath();x.rect(cx-box/2,cy-box/2,box,box);x.clip();x.fillStyle='#000';x.fillRect(cx-box/2,cy-box/2,box,box);
 for(let k=0;k<3;k++){const off=pics[k][1]*box;drawIcon(x,pics[k][0],cx+off,cy,box,k);if(off)drawIcon(x,PANEL[(PANEL.indexOf(pics[k][0])+1)%3],cx+off-box,cy,box,k);if(!stopped[k]){x.fillStyle='rgba(255,255,255,.08)';x.fillRect(cx-box/2,cy-box/2+k*box/3,box,box/3);}}
 x.fillStyle='rgba(255,255,255,.35)';x.fillRect(cx-box/2,cy-box/2+box/3-1,box,3);x.fillRect(cx-box/2,cy-box/2+box*2/3-1,box,3);x.restore();}
function word(x,text,cx,cy,size,fill,max){x.font='900 '+size+'px "Arial Black",Arial,sans-serif';let s=size;while(x.measureText(text).width>max&&s>10){s-=2;x.font='900 '+s+'px "Arial Black",Arial,sans-serif';}
 x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=s*.34;x.strokeStyle='#000';x.strokeText(text,cx,cy+s*.06);x.lineWidth=s*.2;x.strokeStyle='#fff';x.strokeText(text,cx,cy);
 const g=x.createLinearGradient(0,cy-s/2,0,cy+s/2);g.addColorStop(0,fill[0]);g.addColorStop(1,fill[1]);x.fillStyle=g;x.fillText(text,cx,cy);x.lineWidth=s*.04;x.strokeStyle='#000';x.strokeText(text,cx,cy);}
function trim(c){const x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;for(let y=0;y<c.height;y++)for(let i=0;i<c.width;i++)if(d[(y*c.width+i)*4+3]>8){if(i<x0)x0=i;if(i>x1)x1=i;if(y<y0)y0=y;if(y>y1)y1=y;}
 const o=canvas(x1-x0+9,y1-y0+9);o.getContext('2d').drawImage(c,4-x0,4-y0);return o;}
const ART={};
// N-Spade
{const c=canvas(1600,900),x=c.getContext('2d');bg(x,1600,900,0);const cw=118,ch=158,gx=150,gy=192,ox=1600-6*gx+10,oy=110;
 const up={'1,0':'mushroom','4,1':'mushroom','2,2':'star','5,0':'flower'};
 for(let r=0;r<3;r++)for(let k=0;k<6;k++){const cx=ox+k*gx,cy=oy+ch/2+r*gy,kk=up[k+','+r];if(kk)face(x,kk,cx,cy,cw,ch);else cardBack(x,cx,cy,cw,ch);}
ART['smb3-nspade']=c.toDataURL();}
{const c=canvas(512,512),x=c.getContext('2d');bg(x,512,512,0);x.save();x.translate(196,272);x.rotate(-.2);cardBack(x,0,0,200,268);x.restore();x.save();x.translate(320,250);x.rotate(.16);face(x,'mushroom',0,0,200,268);x.restore();ART['tile:smb3-nspade']=c.toDataURL();}
{const c=canvas(1400,520),x=c.getContext('2d');cardBack(x,190,260,250,340);word(x,'N-SPADE',820,262,250,['#ffe23a','#ff8a1c'],1000);ART['logo:smb3-nspade']=trim(c).toDataURL();}
// Spade Panel
{const c=canvas(1600,900),x=c.getContext('2d');bg(x,1600,900,0);panel(x,1150,420,560,[['star',0],['star',0],['star',0]],[1,1,1]);
 for(const [sx,sy,r] of [[790,170,26],[1500,140,20],[1480,700,30],[830,690,18],[1180,60,0]])if(r){x.fillStyle='#fff';x.beginPath();for(let k=0;k<8;k++){const a=k*Math.PI/4,q=k%2?r*.25:r;x.lineTo(sx+Math.cos(a)*q,sy+Math.sin(a)*q);}x.fill();}ART['smb3-spade-slots']=c.toDataURL();}
{const c=canvas(512,512),x=c.getContext('2d');bg(x,512,512,0);panel(x,256,256,360,[['mushroom',0],['mushroom',0],['mushroom',0]],[1,1,1]);ART['tile:smb3-spade-slots']=c.toDataURL();}
{const c=canvas(1500,700),x=c.getContext('2d');word(x,'SPADE',750,190,250,['#ffe23a','#ff8a1c'],1300);word(x,'PANEL',750,480,250,['#ff5a4a','#c81414'],1300);ART['logo:smb3-spade-slots']=trim(c).toDataURL();}
window.ART=ART;`;
const b=await chromium.launch();const p=await b.newPage();await p.setContent('<html><body></body></html>');await p.addScriptTag({content:page_js});
const art=await p.evaluate(()=>window.ART);await b.close();
for(const [k,v] of Object.entries(art)){const [kind,id]=k.includes(':')?k.split(':'):['bg',k];const dir=path.join(out,kind==='tile'?'tiles':'keyart');fs.mkdirSync(dir,{recursive:true});
 const f=path.join(dir,id+(kind==='logo'?'-logo':'')+'.png');fs.writeFileSync(f,Buffer.from(v.split(',')[1],'base64'));console.log(f);}
