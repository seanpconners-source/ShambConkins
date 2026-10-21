#!/usr/bin/env node
// Packs the Freedoom IWADs (BSD licence, https://freedoom.github.io) into assets/doom/freedoom.pack.gz for the Doom
// minigame (src/engines/doom/). Lumps the two WADs share are stored once, demo lumps are dropped, the result is gzipped.
// Usage: node tools/doom-pack.mjs <freedoom1.wad> <freedoom2.wad> [out]
// Pack layout (after gunzip): "SCDPAK1\0", u32 json length, JSON {wads:{name:{id,lumps:[[name,off,size]...]}}}, data.
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import crypto from 'node:crypto';
const [a,b,outArg]=process.argv.slice(2);if(!a||!b){console.error('usage: node tools/doom-pack.mjs freedoom1.wad freedoom2.wad [out]');process.exit(1);}
const out=outArg||path.resolve(path.dirname(new URL(import.meta.url).pathname),'../assets/doom/freedoom.pack.gz');
const DROP=/^(DEMO\d|DMXGUS|DMXGUSC)$/;
const chunks=[],seen=new Map();let off=0;const wads={};
for(const f of [a,b]){const buf=fs.readFileSync(f),n=buf.readInt32LE(4),dir=buf.readInt32LE(8),lumps=[];
 for(let i=0;i<n;i++){const p=dir+i*16,pos=buf.readInt32LE(p),size=buf.readInt32LE(p+4),name=buf.toString('latin1',p+8,p+16).replace(/\0.*$/,'');
  if(DROP.test(name))continue;const data=buf.subarray(pos,pos+size),h=crypto.createHash('sha1').update(data).digest('hex');
  let at=seen.get(h);if(at===undefined){at=off;seen.set(h,at);chunks.push(data);off+=size;}lumps.push([name,at,size]);}
 wads[path.basename(f,'.wad').toLowerCase()]={id:buf.toString('latin1',0,4),lumps};}
const json=Buffer.from(JSON.stringify({wads}));const head=Buffer.alloc(12);head.write('SCDPAK1\0',0,'latin1');head.writeUInt32LE(json.length,8);
const gz=zlib.gzipSync(Buffer.concat([head,json,...chunks]),{level:9});fs.writeFileSync(out,gz);
console.log(out,(gz.length/1048576).toFixed(1)+' MB',Object.keys(wads).join(', '));
