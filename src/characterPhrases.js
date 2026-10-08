const {character, characterIdentity}=require("src/characters.js");
const PHRASES={
 'mars-attacker':'Ack! Ack! Ack!', 'mrs-doubtfire':'Oooh… hello!!!',doubtfire:'Oooh… hello!!!',
 bond:'Shaken, not stirred.','james-bond':'Shaken, not stirred.',
 'emilio-estevez':'Quack, quack!','happy-gilmore':'Just tap it in.',
 'gordon-ramsay':'It’s raw!',terminator:'I’ll be back.',
 'the-dude':'The Dude abides.',walter:'Mark it zero!',donny:'I am the walrus.',
 michael:'That’s what she said.',prisonmike:'And I never got caught, neither.',dwight:'Bears. Beets. Battlestar Galactica.',
 'george-costanza':'The summer of George!',kramer:'Giddy up!',
 mario:'Let’s-a go!',luigi:'Luigi time!',ash:'Groovy.',
 'ash-williams':'Groovy.',neo:'I know kung fu.',docbrown:'Great Scott!',marty:'This is heavy.',
 'uss-lydia':'Another experiment?', 'uss-steve':'Back to the lab!',
 'uss-hannah':'Let’s see what happens!', 'uss-carson':'The whole team is here!'
};
// Lab lines are original game greetings, not attributed quotations.
function characterPhrase(id){const c=character(id);return c.unlockPhrase||PHRASES[id]||PHRASES[characterIdentity(id)]||(/doubtfire/i.test(c.name)?'Oooh… hello!!!':/james bond/i.test(c.name)?'Shaken, not stirred.':'');}

Object.assign(exports,{characterPhrase});