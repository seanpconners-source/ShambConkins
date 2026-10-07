// Poké items on the board (normal item catalog, kind 'pkmn'): finding one fills the battle bag.
// value = {bag item id: count}. Kept dependency-free: contentPolicy.js loads it.
const PKMN_CATALOG_ITEMS=[
 ['pk-poke-balls-5','Poké Balls ×5','🔴',{'poke-ball':5},4,'Five Poké Balls. Weaken a wild character into the red, then throw one.'],
 ['pk-poke-balls-10','Poké Balls ×10','🔴',{'poke-ball':10},2.5,'Ten Poké Balls for wild encounters.'],
 ['pk-great-balls-5','Great Balls ×5','🔵',{'great-ball':5},2,'Five Great Balls: better catch odds than a Poké Ball.'],
 ['pk-ultra-balls-5','Ultra Balls ×5','🟡',{'ultra-ball':5},1.2,'Five Ultra Balls: the best odds short of a Master Ball.'],
 ['pk-master-ball','Master Ball','🟣',{'master-ball':1},.25,'Catches any wild character without fail.'],
 ['pk-potions-5','Potions ×5','🧴',{'potion':5},3,'Five Potions. Each restores 20 HP.'],
 ['pk-super-potions-3','Super Potions ×3','🧴',{'super-potion':3},2,'Three Super Potions. Each restores 50 HP.'],
 ['pk-hyper-potions-2','Hyper Potions ×2','🧴',{'hyper-potion':2},1.2,'Two Hyper Potions. Each restores 200 HP.'],
 ['pk-full-restore','Full Restore','💖',{'full-restore':1},.6,'Fully restores HP and cures any status.'],
 ['pk-revives-3','Revives ×3','💠',{'revive':3},1.5,'Three Revives: bring a fainted teammate back with half HP.'],
 ['pk-full-heals-3','Full Heals ×3','💊',{'full-heal':3},1.5,'Three Full Heals: cure poison, burns, paralysis, sleep and freezing.'],
 ['pk-x-items','X Items Kit','⚔️',{'x-attack':1,'x-defend':1,'x-speed':1,'x-special':1},1.5,'X ATTACK, X DEFEND, X SPEED and X SPECIAL: a battle buff each.'],
 ['pk-rare-candy-2','Rare Candy ×2','🍬',{'rare-candy':2},.8,'Two Rare Candies. Each raises a teammate one level.'],
 ['pk-elixer','Elixers ×2','🧪',{'elixer':2},.8,'Two Elixers. Each restores the PP of every move.'],
 ['pk-poke-doll','Poké Doll','🧸',{'poke-doll':1},.6,'Throw it to escape any wild encounter.']
].map(([id,name,icon,value,findWeight,desc])=>({id,name,source:'Pokémon',icon,kind:'pkmn',value,findWeight,desc}));

Object.assign(exports,{PKMN_CATALOG_ITEMS});
