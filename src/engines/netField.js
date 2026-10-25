// Side-by-side games online (s.online): this phone plays only its own field (s.online.me); the other field is drawn from
// the other phone's snapshots. pack(i) → this phone's field as plain data, unpack(i,data) → show the other field.
// Snapshots {f} go out about hz times a second when something changed (push() sends one now, e.g. right after a key
// moment); {e} carries game events (Tetris garbage...); {fin} is the other field's final result (finish() / remoteDone()).
const {isOnline}=require("src/engines/cpuKit.js");
function netField(s,{pack,unpack,onEvent=null,hz=10}){
 const net=isOnline(s)?s.online:null;if(!net)return null;s.hotseat=true;
 let wait=0,last='',gone=false;const waiters=[];
 const nf={me:net.me,remote:net.remote,fin:undefined,
  push(){const st=pack(nf.me),k=JSON.stringify(st);wait=1/hz;if(k===last)return;last=k;net.send({f:st});},
  tick(dt){wait-=dt;if(wait<=0)nf.push();},
  event(e){net.send({e});},
  finish(v){nf.push();net.send({fin:v});},
  // the other phone's final result (null if they left)
  remoteDone(){return nf.fin!==undefined?Promise.resolve(nf.fin):gone?Promise.resolve(null):new Promise(r=>waiters.push(r));}};
 void (async()=>{for(;;){const m=await net.next();if(!m||!s.alive){gone=true;for(const r of waiters.splice(0))r(null);return;}
  if(m.f!==undefined)unpack(nf.remote,m.f);else if(m.e!==undefined)onEvent?.(m.e);else if(m.fin!==undefined){nf.fin=m.fin;for(const r of waiters.splice(0))r(m.fin);}}})();
 return nf;
}
Object.assign(exports,{netField});
