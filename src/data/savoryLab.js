const LAB_ID='unlimited-savory-lab';
const LAB_TEAM=['uss-lydia','uss-steve','uss-hannah'];
const LAB_CHARACTERS=[
 {id:'uss-lydia',name:'Lydia',icon:'🧪',perk:'Lab explorer: +1 point at locations.'},
 {id:'uss-steve',name:'Steve',icon:'🔬',perk:'Lab competitor: +1 point on a minigame win.'},
 {id:'uss-hannah',name:'Hannah',icon:'🥼',perk:'Lab scavenger: an extra supply at realm gates.'},
 {id:'uss-carson',name:'Carson',icon:'⚗️',perk:'Lab survivor: starts with a penalty shield.'},
 // Zach Godsey (owner, Nov 24; shown as "Zach"): owner's photos normal/sad/win; his phone gets him as a gift (src/gifts.js)
 {id:'uss-zach',name:'Zach',icon:'🧫',perk:'Lab taste-tester: +1 point on a minigame win.'}
].map((c,i)=>({...c,source:'Unlimited Savory Systems',perkType:['explorer','competitor','scavenger','survivor','competitor'][i],unlockBy:'lab',unlockHint:i===3?'Find Lydia, Steve and Hannah in your roster, then meet another visitor at Unlimited Savory Systems R&D Lab.':'Meet a visitor at Unlimited Savory Systems R&D Lab. Photos can be added later.'}));
const LAB_LOCATION={id:LAB_ID,name:'Unlimited Savory Systems R&D Lab',source:'Unlimited Savory Systems',realm:'mind',icon:'🧪',characters:LAB_CHARACTERS.map(c=>c.id),description:'Meet Lydia, Steve, Hannah or Zach. Once all three are in your roster, another lab visit can recruit Carson. Each visit finds someone new; photos can be added later.'};

Object.assign(exports,{LAB_ID,LAB_TEAM,LAB_CHARACTERS,LAB_LOCATION});