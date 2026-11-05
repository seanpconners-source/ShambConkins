// The Major League (1989) cast for the baseball games (ROADMAP D4): they fill out a lineup when a roster is short, play
// for the other dugout, and can be recruited like any character (wins in the baseball games favour them: same source).
// Harry Doyle (Bob Uecker) calls the game. Rows: [id, name, photo page (Wikipedia), icon, perk, line, ratings].
const SOURCE='Major League (film)';
const PERKS={competitor:'Competitor: +1 point on every minigame win.',scavenger:'Scavenger: bonus spaces pay +1 extra.',explorer:'Explorer: +1 point at every landmark.',survivor:'Survivor: starts every run with a shield.'};
const ROWS=[
 ['ml-vaughn','Rick “Wild Thing” Vaughn','Charlie Sheen','🔥','competitor','Wild Thing. Throws 101, sometimes at the backstop.',{velo:.98,control:.42,power:.45}],
 ['ml-jake-taylor','Jake Taylor','Tom Berenger','🧢','survivor','Bad knees, big heart. Calls his shot.',{contact:.85,power:.6,speed:.3,arm:.85}],
 ['ml-willie-mays-hayes','Willie Mays Hayes','Wesley Snipes','💨','explorer','Hits like Mays, runs like Hayes.',{speed:.99,contact:.7,power:.35}],
 ['ml-cerrano','Pedro Cerrano','Dennis Haysbert','🪄','competitor','Hits the fastball a mile. Jobu needs a refill.',{power:.99,contact:.5}],
 ['ml-roger-dorn','Roger Dorn','Corbin Bernsen','💼','scavenger','Third baseman, investor, not a fan of diving.',{contact:.7,power:.55,arm:.7}],
 ['ml-eddie-harris','Eddie Harris','Chelcie Ross','🧴','scavenger','Doctors the ball with everything in the clubhouse.',{control:.9,velo:.5}],
 ['ml-lou-brown','Lou Brown','James Gammon','📋','survivor','Tire salesman turned manager. Runs a tight dugout.',{contact:.55,power:.5}],
 ['ml-harry-doyle','Harry Doyle','Bob Uecker','🎙️','explorer','The voice of the Indians. Juuust a bit outside.',{contact:.4,power:.3}],
 ['ml-rachel-phelps','Rachel Phelps','Margaret Whitton','💃','scavenger','Owns the team and wants it to lose. Bad luck.',{contact:.35,power:.3}],
];
const MAJOR_LEAGUE_CHARACTERS=ROWS.map(([id,name,actor,icon,perk,line])=>({id,name,source:SOURCE,icon,actor,assetKey:'char:'+id,unlockAt:999,perkType:perk,perk:PERKS[perk],unlockPhrase:line,
 unlockHint:`Win the Major League baseball games to recruit ${name}.`}));
const ML_RATINGS=Object.fromEntries(ROWS.map(r=>[r[0],r[6]]));
const ML_IDS=ROWS.map(r=>r[0]).filter(id=>id!=='ml-harry-doyle'&&id!=='ml-rachel-phelps');
// Harry Doyle on the call (short lines, most of them in his spirit rather than the film's script)
const DOYLE={
 ball:['Juuust a bit outside.','Ball. Not even close.','Way outside. He tried to sneak it by.','Ball. Somebody find him the plate.'],
 strike:['Strike! Right down the middle.','Called strike. He was looking.','Strike! Painted the corner.'],
 swing:['Swing and a miss!','He swung at a pitch in the dirt.','Struck him out! Fooled him.'],
 foul:['Foul ball, back into the seats.','Fouled off. Still alive.','Foul. Somebody up there got a souvenir.'],
 single:['Base hit!','Line drive, base hit!','He finds a hole. Single.'],
 double:['Into the gap! He’ll go for two!','Off the wall! Standing double!'],
 triple:['He’s rounding second, he’s going for three!','Triple! He flew around those bases!'],
 homer:['Get up, get up, get outta here! GONE!','That ball is history!','Kiss it goodbye!'],
 out:['Easy out.','Routine play, and he’s out.','Got him!','In the glove. One away.'],
 double_play:['Double play! Two for the price of one!'],
 walk:['Ball four. Take your base.'],
 strikeout:['Struck him out!','Sit down. Strike three!'],
 inning:['That’s the inning.','Three up, three down.','Side retired.'],
 start:['Welcome to the ballpark. Let’s play ball!','A beautiful day for baseball. Let’s go!'],
 end:['Ballgame!','And that’s the ballgame!'],
};
const TEAM_NAMES=['Indians','Yankees','Mavericks','Thunder','Sluggers','Wild Things','Rockets','Comets'];
Object.assign(exports,{MAJOR_LEAGUE_CHARACTERS,ML_RATINGS,ML_IDS,DOYLE,TEAM_NAMES,ML_SOURCE:SOURCE});
