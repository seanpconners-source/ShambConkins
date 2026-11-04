// v0.44 balance pass. Applied on top of the catalog at load time (the catalog records stay intact).
// Caps by item kind: one-shot effects that were clear outliers against their peers.
const ITEM_CAPS={points:6,steal:5,forward:8,pushOther:6,boost:4,statusTriple:3};
// ROADMAP F6 (Nov 4): plain "gain points" / "block one penalty" items that now do something on the board instead
// (src/boardMarks.js). Ids stay, so saves keep them; the art stays too.
const ITEM_REWORK={
 cone:{kind:'roadblock',value:1},'cone-crate':{kind:'roadblock',value:1},'parcel-stack':{kind:'roadblock',value:1},'jackie-chair':{kind:'roadblock',value:1},'cardboard-box':{kind:'roadblock',value:1},
 'banana-cash':{kind:'toll',value:3},snoochie:{kind:'toll',value:2},burger:{kind:'toll',value:2},'coaster-pass':{kind:'toll',value:3},
 'cheesy-poofs':{kind:'coinRain',value:3},'dino-can':{kind:'coinRain',value:3},'reptar-bar':{kind:'coinRain',value:3},'element-stones':{kind:'coinRain',value:4},
 'iron-man-boots':{kind:'magnet',value:1},hoverboard:{kind:'magnet',value:1},'tape-measure':{kind:'magnet',value:1},'bungee-gum':{kind:'magnet',value:1},
};
function balanceItem(item){
 if(ITEM_REWORK[item.id])item={...item,...ITEM_REWORK[item.id],reworked:true};
 const cap=ITEM_CAPS[item.kind];
 if(!cap||typeof item.value!=='number'||item.value<=cap)return item;
 const old=item.value,next={...item,value:cap};
 if(typeof item.desc==='string')next.desc=item.desc.replace(new RegExp(`(?<![0-9])${old}(?![0-9])`),String(cap));
 return next;
}
Object.assign(exports,{ITEM_CAPS,ITEM_REWORK,balanceItem});
