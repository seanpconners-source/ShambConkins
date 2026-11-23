// Which background picture fits a screen: TALL (phones upright, 1080x1920), WIDE (16:9, 1920x1080) or FOLD (near-square, the
// owner's open Galaxy Fold is 752x835 CSS px; slot size FOLD_SIZE = 2x that). Games name their three pictures and ask order()
// for the best first; a missing one falls back to the next closest shape.
const FOLD_SIZE=[1504,1670];
const TALL_SIZE=[1080,1920],WIDE_SIZE=[1920,1080];
function shape(W,H){const a=W/Math.max(1,H);return a<.78?'tall':a>1.3?'wide':'fold';}
// v = {tall:name, wide:name, fold:name}; returns the names best-first (no empties)
function order(W,H,v){const s=shape(W,H),side=W>=H?['wide','tall']:['tall','wide'];
 const pref=s==='fold'?['fold',...side]:s==='wide'?['wide','fold','tall']:['tall','fold','wide'];
 const out=[];for(const k of pref)if(v[k]&&!out.includes(v[k]))out.push(v[k]);return out;}
// first picture that is ready: get(name) -> image|null
function pick(W,H,v,get){for(const n of order(W,H,v)){const p=get(n);if(p)return p;}return null;}
Object.assign(exports,{FOLD_SIZE,TALL_SIZE,WIDE_SIZE,shape,order,pick});
