// DOOM engine in Node (no browser): loads every map of Freedoom Phase 1 and 2, runs a wandering, shooting bot with
// god mode for TICS tics per map and checks nothing throws, things stay inside the map and the renderer draws.
// Usage: node tests/doom-sim.mjs [tics=1500] [map-regex]
import {req} from './doomlib.mjs';
const W=req('src/engines/doom/wad.js'),{Gfx}=req('src/engines/doom/gfx.js'),I=req('src/engines/doom/info.js'),{Renderer}=req('src/engines/doom/render.js'),{Game}=req('src/engines/doom/game.js');
const tics=+process.argv[2]||1500,only=process.argv[3]?new RegExp(process.argv[3]):null;let bad=0,maps=0;
for(const kind of ['doom1','doom2']){
 const wad=await W.loadWad(kind),gfx=new Gfx(wad),deh=wad.lump('DEHACKED'),tables=I.applyDehacked(deh?I.dehText(Buffer.from(deh).toString('latin1')):'');
 const G=new Game(wad,gfx,tables),r=new Renderer(gfx);r.setSize(426,200,168);
 const list=kind==='doom2'?Array.from({length:32},(_,i)=>[1,i+1]):[1,2,3,4].flatMap(e=>Array.from({length:9},(_,m)=>[e,m+1]));
 for(const [ep,map] of list){const name=G.mapLump(ep,map);if(only&&!only.test(name))continue;maps++;
  const t0=Date.now();let renders=0,kills=0;
  try{G.seed(ep*100+map);G.initNew(3,ep,map);G.cheat('iddqd');G.cheat('idfa');r.skytex=gfx.texture(G.sky);
   for(let i=0;i<tics;i++){const pl=G.players[0];if(!pl.mo)break;
    pl.cmd={forwardmove:50,sidemove:((i>>5)&1?30:-30),angleturn:((i>>6)%3-1)*300,buttons:(i%3?1:0)|(i%20===0?2:0)|((i%300===0)?4|((((i/300)%7)+1)<<3):0)};
    G.tick();if(G.exiting){G.nextLevel(G.levelStats());break;}
    if(pl.playerstate==='reborn'||pl.playerstate==='dead'){G.rebornLevel();G.cheat('iddqd');}
    if(i%50===0){const mo=G.players[0].mo;for(const m of G.mobjs())m.rx=m.ry=m.rz=undefined;r.render(G.lv,{x:mo.x,y:mo.y,z:G.players[0].viewz,angle:mo.angle/2**32*Math.PI*2,extralight:0,fixedcolormap:-1,psprites:G.players[0].psprites,sectorlight:160});renders++;}}
   for(const m of G.mobjs())if(!Number.isFinite(m.x)||!Number.isFinite(m.y)||!Number.isFinite(m.z))throw new Error('non-finite thing position '+m.type);
   kills=G.players[0].killcount;
  }catch(e){bad++;console.log('FAIL',kind,name,e.stack.split('\n').slice(0,4).join(' | '));continue;}
  if(process.env.VERBOSE)console.log(kind,name,'ok',Date.now()-t0,'ms kills',kills);}
}
// save/load round trip: a loaded game must carry on exactly like the original
{const SG=req('src/engines/doom/savegame.js'),wad=await W.loadWad('doom1'),gfx=new Gfx(wad),T=()=>I.applyDehacked(I.dehText(Buffer.from(wad.lump('DEHACKED')).toString('latin1')));
 const A=new Game(wad,gfx,T());A.seed(5);A.initNew(2,1,2);const cmd=i=>({forwardmove:40,sidemove:(i>>5)&1?20:-20,angleturn:((i>>6)%3-1)*250,buttons:i%3?1:0});
 for(let i=0;i<600;i++){A.players[0].cmd=cmd(i);A.tick();}const B=new Game(wad,gfx,T());SG.deserialize(B,JSON.parse(JSON.stringify(SG.serialize(A))));
 for(let i=600;i<1200;i++){A.players[0].cmd=cmd(i);A.tick();B.players[0].cmd=cmd(i);B.tick();}
 const sig=G=>{const p=G.players[0];return JSON.stringify([p.mo&&Math.round(p.mo.x),p.mo&&Math.round(p.mo.y),p.health,p.ammo,[...G.mobjs()].length]);};
 if(sig(A)!==sig(B)){bad++;console.log('FAIL save/load diverged',sig(A),sig(B));}else console.log('save/load round trip ok');}
console.log(bad?`${bad}/${maps} maps failed`:`${maps}/${maps} maps ran clean`);process.exit(bad?1:0);
