// Original expedition equipment. Carrying it enables a route solution without
// spending the optional pre-roll item action. Cashing it in consumes the tool.
const TRAVEL_ITEMS = [
 ['goonies-rope','Goon Docks Rope Rig','The Goonies','🪢','rope','Broken bridges and cliff climbs'],
 ['bond-lockpick','Q’s Lockpick Kit','James Bond','🔑','key','Locked gates and security checkpoints'],
 ['turtle-raft','Sewer Surfer Raft','Teenage Mutant Ninja Turtles','🛟','raft','Flooded streets'],
 ['troma-hazmat','Nuke ’Em High Hazmat Suit','Troma','☢','hazmat','Toxic spills'],
 ['matrix-emp','Nebuchadnezzar EMP','The Matrix','⚡','emp','Laser grids and security checkpoints'],
 ['mini-mushroom','Mini Mushroom','Super Mario Bros.','🍄','mini','Narrow pipes; also shrinks a giant head for the crossing'],
 ['belmont-lantern','Belmont’s Holy Lantern','Castlevania','🏮','light','Haunted wards and thick fog'],
 ['jurassic-winch','Jurassic Park Rescue Winch','Jurassic Park','🛻','winch','Heavy gates, fallen trees and cliff climbs']
].map(([id,name,source,icon,tool,uses])=>({id,name,source,icon,tool,kind:'trailGear',findWeight:3,value:2,desc:`Carry: ${uses}. Reusable at matching obstacles; opening a route with gear does not spend your pre-roll item action. Use before rolling instead: consume this tool for +2 movement and one shield.`}));

function travelToolDrawing(tool){
 const drawings={
  rope:'<path d="M50 126Q18 35 86 39T127 104Q122 147 68 138T71 72Q110 57 119 93" fill="none" stroke="#b78546" stroke-width="13"/><path d="M51 127l-10 24m86-47 19 31" stroke="#d3b277" stroke-width="12"/>',
  key:'<circle cx="58" cy="61" r="25" fill="none" stroke="#d9ad45" stroke-width="15"/><path d="M77 80l54 54m-14-14 15-15m-31 0 15-15" stroke="#d9ad45" stroke-width="15"/>',
  raft:'<ellipse cx="90" cy="98" rx="59" ry="34" fill="#61997a" stroke="#234e50" stroke-width="8"/><ellipse cx="90" cy="98" rx="35" ry="16" fill="#293a4c"/><path d="M34 60l112 78" stroke="#ccaa65" stroke-width="9"/>',
  hazmat:'<path d="M64 43q26-32 52 0l-2 31 29 24-11 22-20-13v44H65v-44l-20 13-13-22 31-25z" fill="#d6c14a" stroke="#756b3e" stroke-width="5"/><rect x="70" y="43" width="37" height="27" rx="8" fill="#477984"/><circle cx="90" cy="99" r="12" fill="#373d35"/>',
  emp:'<rect x="46" y="44" width="89" height="99" rx="12" fill="#476475" stroke="#283c4e" stroke-width="6"/><path d="M99 55L69 99h23l-8 33 32-47H94z" fill="#78debb"/><path d="M38 68H23m120 0h14M38 117H23m120 0h14" stroke="#75c8b3" stroke-width="7"/>',
  mini:'<path d="M52 95q-13-52 38-59 52 7 38 59z" fill="#719cc8" stroke="#375c96" stroke-width="6"/><ellipse cx="90" cy="76" rx="18" ry="16" fill="#e9ece7"/><path d="M65 99v34q26 27 51 0V99" fill="#e7dbb6" stroke="#9c8458" stroke-width="5"/><path d="M79 111v15m22-15v15" stroke="#3c4549" stroke-width="5"/>',
  light:'<path d="M67 49q0-32 23-32t23 32" fill="none" stroke="#9c7846" stroke-width="8"/><rect x="51" y="55" width="78" height="83" rx="12" fill="#debc69" stroke="#6c6743" stroke-width="9"/><path d="M90 65v66m-28-51 55 34m-55 0 55-34" stroke="#f8df92" stroke-width="7"/><path d="M61 48h57M59 146h61" stroke="#6c6743" stroke-width="10"/>',
  winch:'<rect x="41" y="65" width="97" height="54" rx="12" fill="#738b66" stroke="#354b3d" stroke-width="7"/><path d="M61 71v42m13-42v42m13-42v42m13-42v42" stroke="#c7bc9b" stroke-width="6"/><path d="M108 95h41v35q0 21-21 13" fill="none" stroke="#a48b68" stroke-width="9"/>'
 };
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect x="12" y="10" width="156" height="160" rx="18" fill="#eee4ca" stroke="#947755" stroke-width="4"/>${drawings[tool]||drawings.rope}<text x="90" y="165" font-family="Arial" font-size="10" text-anchor="middle" fill="#40564d">REUSABLE TRAIL GEAR</text></svg>`;
}

Object.assign(exports,{TRAVEL_ITEMS,travelToolDrawing});