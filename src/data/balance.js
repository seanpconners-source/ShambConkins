// v0.44 balance pass. Applied on top of the catalog at load time (the catalog records stay intact).
// Caps by item kind: one-shot effects that were clear outliers against their peers.
const ITEM_CAPS={points:6,steal:5,forward:8,pushOther:6,boost:4,statusTriple:3};
function balanceItem(item){
 const cap=ITEM_CAPS[item.kind];
 if(!cap||typeof item.value!=='number'||item.value<=cap)return item;
 const old=item.value,next={...item,value:cap};
 if(typeof item.desc==='string')next.desc=item.desc.replace(new RegExp(`(?<![0-9])${old}(?![0-9])`),String(cap));
 return next;
}
Object.assign(exports,{ITEM_CAPS,balanceItem});
