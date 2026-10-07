// Themed supplies for the warp zones. src/warpThemes.js deals these (plus a few older items from the same
// worlds) on warp item spaces; elsewhere they are rare finds (low findWeight). Effects reuse the v43 item kinds.
const {packItems}=require("src/data/itemPackV43.js");
const rare=it=>({...it,findWeight:.35});
const challenge=(id,name,source,icon,game,desc)=>({id:'wz-'+id,name,source,icon,kind:'game',value:game,desc,findWeight:.35});
const WARP_ITEMS=[
 ...packItems('Mario Kart',[
  ['triple-mushroom','Triple Mushroom','🍄','bundle',{boost:3,rollFloor:3}],
  ['banana-peel','Banana Peel','🍌','strongTrap',5],
  ['red-shell','Red Shell','🔴','pushOther',3],
  ['lightning-bolt','Lightning Bolt','⚡','badDie'],
  ['bullet-bill','Bullet Bill','🚀','forward',6],
  ['golden-mushroom','Golden Mushroom','🌟','rollDouble']
 ],'wz-').map(rare),
 challenge('item-box','Rainbow Item Box','Mario Kart','❓','rainbow-road-kart','Start Rainbow Road Grand Prix right now.'),
 ...packItems('Super Mario Bros. 3',[
  ['super-leaf','Super Leaf','🍃','bundle',{boost:2,cloak:1}],
  ['p-wing','P-Wing','🪽','forward',6],
  ['warp-whistle','Warp Whistle','🎶','rollDouble'],
  ['hammer-suit','Hammer Suit','🔨','bundle',{ward:2,shields:1}],
  ['music-box','Music Box','🎵','badDie'],
  ['frog-suit','Frog Suit','🐸','bestDie']
 ],'wz-').map(rare),
 challenge('n-spade-card','N-Spade Card','Super Mario Bros. 3','🂡','smb3-nspade','Start the N-Spade card-matching bonus game right now.'),
 ...packItems('Candy Land',[
  ['gumdrop','Gumdrop Mountain Gumdrop','🍬','bundle',{points:3,boost:1}],
  ['gumdrop-pass','Gumdrop Pass Shortcut','🌈','forward',5],
  ['licorice','Lord Licorice’s Licorice','🖤','strongTrap',4],
  ['molasses','Molasses Swamp Jar','🍯','capDie',2],
  ['lolly-lollipop','Princess Lolly’s Lollipop','🍭','bundle',{shields:2,points:2}],
  ['gingerbread-plum','Gingerbread Plum','🫐','investment',3]
 ],'wz-').map(rare),
 challenge('color-card','Double Color Card','Candy Land','🃏','candy-color-dash','Start Candy Land Color Card Dash right now.'),
 ...packItems('Chutes and Ladders',[
  ['golden-ladder','Golden Ladder','🪜','forward',5],
  ['good-deed-badge','Good Deed Badge','🏅','bundle',{ward:1,shields:1}],
  ['lucky-spinner','Lucky Spinner','🎯','bestDie'],
  ['bent-spinner','Bent Spinner','🌀','capDie',2],
  ['chute-wax','Slippery Chute Wax','🛝','pushOther',4],
  ['kaa-coils','Kaa’s Coils','🐍','gamble',8]
 ],'wz-').map(rare),
 challenge('ladder-rung','Spare Ladder Rung','Chutes and Ladders','🪜','chutes-ladder-rush','Start Chutes and Ladders Ladder Rush right now.'),
 ...packItems('Monopoly',[
  ['jail-free','Get Out of Jail Free Card','🔓','bundle',{cleanse:true,ward:2}],
  ['pass-go','Pass GO · Collect $200','💵','bundle',{points:6}],
  ['hotel','Hotel on Boardwalk','🏨','investment',4],
  ['free-parking','Free Parking Jackpot','🅿️','gamble',8],
  ['reading-railroad','Reading Railroad Ticket','🚂','forward',5]
 ],'wz-').map(rare),
 rare({id:'wz-luxury-tax',name:'Luxury Tax Bill','source':'Monopoly',icon:'🧾',kind:'steal',value:4,desc:'Bill your opponent for luxury tax: steal up to 4 points. A shield, cloak, attack ward or Kitten Mittens blocks it.'}),
 challenge('speed-die','Speed Die','Monopoly','🎲','monopoly-speed-die','Start Monopoly Speed Die right now.'),
 ...packItems('Clue',[
  ['magnifying-glass','Detective’s Magnifying Glass','🔍','preview'],
  ['secret-passage','Secret Passage Key','🚪','forward',6],
  ['candlestick','The Candlestick','🕯️','strongTrap',5],
  ['lead-pipe','The Lead Pipe','🔧','badDie'],
  ['rope','The Rope','🪢','pushOther',3],
  ['notepad','Detective Notepad','📓','bounty',4]
 ],'wz-').map(rare),
 challenge('sealed-envelope','Sealed Case File','Clue','✉️','clue-whodunit','Open the case file: start Clue Whodunit right now.'),
 ...packItems('The Legend of Zelda',[
  ['pegasus-boots','Pegasus Boots','👢','forward',5],
  ['boomerang','Boomerang','🪃','badDie'],
  ['ocarina','Ocarina of Time','🎵','rollDouble'],
  ['bomb-bag','Bomb Bag','💣','strongTrap',6],
  ['master-sword','Master Sword','🗡️','bundle',{rewardBonus:4,ward:1}],
  ['blue-candle','Blue Candle','🕯️','preview']
 ],'wz-').map(rare),
 challenge('wooden-sword','Old Man’s Wooden Sword','The Legend of Zelda','🗡️','hyrule-rupee-rush','It’s dangerous to go alone: start Hyrule Rupee Rush right now.'),
 ...packItems('Sonic the Hedgehog',[
  ['speed-shoes','Speed Shoes','👟','bundle',{boost:3,rollFloor:4}],
  ['blue-shield','Blue Shield Monitor','🛡️','bundle',{shields:2,ward:1}],
  ['invincibility','Invincibility Monitor','⭐','cloak',3],
  ['super-ring','Super Ring Monitor','💍','bundle',{points:5}],
  ['chaos-emerald','Chaos Emerald','💎','gateDividend',6],
  ['yellow-spring','Yellow Spring','🌀','forward',5]
 ],'wz-').map(rare),
 challenge('giant-ring','Giant Ring','Sonic the Hedgehog','💍','sonic-ring-rush','Jump into the Giant Ring: start Green Hill Ring Rush right now.'),
 challenge('end-signpost','End-of-Act Signpost','Sonic the Hedgehog','🪧','sonic-goal-dash','Spin the signpost: start Green Hill Goal Dash right now.')
];
Object.assign(exports,{WARP_ITEMS});
