// Side-by-side games online (s.online): this phone plays only its own field (s.online.me); the other field is drawn from
// the other phone's snapshots. pack(i) → this phone's field as plain data, unpack(i,data) → show the other field.
// Snapshots {f} go out about hz times a second when something changed (push() sends one now, e.g. right after a key
// moment); {e} carries game events (Tetris garbage...); {fin} is the other field's final result (finish() / remoteDone()).
// sync(tag) resolves once both phones have reached the same point (e.g. both tapped Ready) — the arena games' host waits on it.
// start(tag) is sync plus a start at the same moment on both phones: seat 1 times three pings, sends go and starts half a
// round trip later; the other phone starts when go arrives. Arena games stamp events with the time since start().
const {isOnline}=require("src/engines/cpuKit.js");
function netField(s,{pack,unpack,onEvent=null,hz=10}){
 const net=isOnline(s)?s.online:null;if(!net)return null;s.hotseat=true;
 let wait=0,last='',gone=false;const waiters=[],got=new Set(),sigWait=new Map();
 const mark=k=>{got.add(k);sigWait.get(k)?.();sigWait.delete(k);},signal=k=>got.has(k)||gone?Promise.resolve():new Promise(r=>sigWait.set(k,r));
 const nf={me:net.me,remote:net.remote,fin:undefined,
  push(){const st=pack(nf.me),k=JSON.stringify(st);wait=1/hz;if(k===last)return;last=k;net.send({f:st});},
  tick(dt){wait-=dt;if(wait<=0)nf.push();},
  event(e){net.send({e});},
  finish(v){nf.push();net.send({fin:v});},
  sync(tag='go'){net.send({e:{__s:tag}});return signal('s'+tag);},
  async start(tag='go'){await nf.sync(tag);if(gone||!s.alive)return;
   if(net.me!==0)return signal('g'+tag);
   let best=Infinity;for(let k=0;k<3&&!gone;k++){const t0=performance.now();net.send({e:{__p:tag+'#'+k}});await signal('q'+tag+'#'+k);best=Math.min(best,performance.now()-t0);}
   net.send({e:{__g:tag}});if(Number.isFinite(best)&&best>1)await new Promise(r=>setTimeout(r,best/2));},
  get gone(){return gone;},
  // the other phone's final result (null if they left)
  remoteDone(){return nf.fin!==undefined?Promise.resolve(nf.fin):gone?Promise.resolve(null):new Promise(r=>waiters.push(r));}};
 void (async()=>{for(;;){const m=await net.next();if(!m||!s.alive){gone=true;for(const r of waiters.splice(0))r(null);for(const r of sigWait.values())r();sigWait.clear();return;}
  if(m.f!==undefined)unpack(nf.remote,m.f);
  else if(m.e!==undefined){const e=m.e;if(e?.__s!==undefined)mark('s'+e.__s);else if(e?.__p!==undefined)net.send({e:{__q:e.__p}});else if(e?.__q!==undefined)mark('q'+e.__q);else if(e?.__g!==undefined)mark('g'+e.__g);else onEvent?.(e);}
  else if(m.fin!==undefined){nf.fin=m.fin;for(const r of waiters.splice(0))r(m.fin);}}})();
 return nf;
}
Object.assign(exports,{netField});
