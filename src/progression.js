const {availableCharacters}=require("src/profile.js");
const {characterIdentity}=require("src/characters.js");
const BOARD_MILESTONES = [[8,'City'],[14,'Jungle'],[20,'Fantasy'],[28,'Sci-Fi'],[36,'Rainbow Road']];
function updateProgression(profile) {
 profile.boards ||= ['Mashup'];profile.modes ||= ['versus'];const unlocked=[];
 for(const [count,name] of BOARD_MILESTONES)if(profile.played.length>=count&&!profile.boards.includes(name)){profile.boards.push(name);unlocked.push(name+' board');}
 if((profile.minigames||0)>=12&&!profile.modes.includes('team')){profile.modes.push('team');unlocked.push('Team Relay');}
 const owned=new Set([...availableCharacters(profile,'Sean'),...availableCharacters(profile,'Amber')].map(characterIdentity));
 if(owned.has('mario')&&owned.has('luigi')&&!profile.modes.includes('coop')){profile.modes.push('coop');unlocked.push('Mario + Luigi co-op');}
 return unlocked;
}
const BOARD_THEMES = {
 Mashup:{lanes:3,colors:['#536943','#974e3e','#466775'],description:'A branching journey through all your worlds.'},
 City:{lanes:4,colors:['#596877','#985642','#594a78'],description:'Busy streets, more casino encounters, and familiar shortcuts.'},
 Jungle:{lanes:3,colors:['#39623f','#88732d','#2f7569'],description:'Wild trails, extra supplies, and dangerous detours.'},
 Fantasy:{lanes:3,colors:['#75558c','#93644a','#50549b'],description:'Mystic paths, more encounters, and unpredictable rewards.'},
 'Sci-Fi':{lanes:4,colors:['#39757b','#486b9b','#85539b'],description:'Neon scenery, more arcade challenges, and technology.'},
 'Rainbow Road':{lanes:2,colors:['#97679b','#a77838','#428d82'],description:'Rainbow scenery with extra rewards and setbacks.'}
};

Object.assign(exports,{BOARD_MILESTONES,updateProgression,BOARD_THEMES});