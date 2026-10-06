// Whole-screen two-player touch input: keyboard keys (P1 WASD+Space/F, P2 arrows+Enter) merged with virtual keys that
// gesture handlers drive. keys[i].l/r/u/d/fire read like duelInputs; no on-screen buttons are created.
function touchKeys(s){
 const kb=[{},{}],virt=[{},{}],keys=[{},{}],names=['u','d','l','r','fire'];
 for(let i=0;i<2;i++)for(const k of names)Object.defineProperty(keys[i],k,{enumerable:true,get:()=>!!(kb[i][k]||virt[i][k])});
 const mapping={w:[0,'u'],s:[0,'d'],a:[0,'l'],d:[0,'r'],' ':[0,'fire'],f:[0,'fire'],arrowup:[1,'u'],arrowdown:[1,'d'],arrowleft:[1,'l'],arrowright:[1,'r'],enter:[1,'fire']};
 for(const type of ['keydown','keyup'])s.on(document,type,ev=>{const b=mapping[ev.key.toLowerCase()];if(!b)return;ev.preventDefault();if(type==='keydown'&&(s.paused||!s.alive))return;kb[b[0]][b[1]]=type==='keydown';});
 const clear=()=>{for(let i=0;i<2;i++)for(const k of names){kb[i][k]=false;virt[i][k]=false;}};
 s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(clear);
 const pulse=(i,k,ms=90)=>{virt[i][k]=true;setTimeout(()=>{virt[i][k]=false;},ms);};
 s.controls([]);s.body.classList.add('drag-arena-body');s.queueCanvasFit?.();
 return {keys,virt,pulse,clear};
}
Object.assign(exports,{touchKeys});
