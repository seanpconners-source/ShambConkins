// Node harness for the Doom engine modules (src/engines/doom/): loads the repo's CommonJS-style modules with the
// Freedoom pack injected as USER_PORTRAITS, so engine logic can be tested without a browser.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cache={};
const stubs={'src/data/userPortraits.js':{USER_PORTRAITS:{'doom:pack:freedoom':'data:application/gzip;base64,'+fs.readFileSync(path.join(root,'assets/doom/freedoom.pack.gz')).toString('base64')}}};
export function req(id){if(stubs[id])return stubs[id];if(cache[id])return cache[id];const exports=cache[id]={};new Function('exports','require',fs.readFileSync(path.join(root,id),'utf8'))(exports,req);return exports;}
export function stub(id,v){stubs[id]=v;}
// write an RGBA buffer (Uint8Array w*h*4) as a PNG file
import zlib from 'node:zlib';
export function writePNG(file,w,h,rgba){
 const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;});
 const crc=b=>{let c=-1;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^-1)>>>0;};
 const chunk=(t,d)=>{const len=Buffer.alloc(4);len.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([len,td,c]);};
 const raw=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;Buffer.from(rgba.buffer,rgba.byteOffset+y*w*4,w*4).copy(raw,y*(w*4+1)+1);}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 fs.writeFileSync(file,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));}
