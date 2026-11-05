// Quick-chat lines for online players (src/chat.js). The chat sheet deals a fresh handful every time it opens: a few
// nice ones, a few nasty ones (some crude unless Settings → Clean chat is on), one or two for the moment (your turn,
// their turn, mid-game, after a game) and a line from your character when it has one (src/data/characterQuotes.js).
// Trash talk is aimed at the other player, never at a group of people: no slurs, nothing about race, religion,
// sexuality or disability.
const NICE=[
 'Nice!','Nice one!','Great move!','Wow. Respect.','Okay, that was good.','Clean. Very clean.','Love it!','You\'re on fire!',
 'Teach me your ways.','Well played.','GG!','Good game!','That was sick!','Legend.','Absolute legend.','I see you!',
 'Big brain move.','You earned that.','Okay, you\'re good at this.','Hats off.','That was beautiful.','Chef\'s kiss.',
 'Clutch!','How did you even do that?','I\'m impressed.','Respect the hustle.','You\'re a natural.','That\'s my partner!',
 'We make a good team.','High five! ✋','Nailed it.','Smooth.','Textbook.','Highlight reel material.','Bravo!',
 'You make it look easy.','That was majestic.','Gold star for you. ⭐','Keep it up!','So close!','Unlucky!','Next one\'s yours.',
 'Shake it off!','You got this!','Don\'t give up!','Love you, mean it.','Thanks!','My bad!','Oops, sorry!','Good luck!',
 'Have fun!','Let\'s gooo!','Booyah!','Heck yeah!','Dang, son!','Spectacular.','Much wow.','You\'re the GOAT.',
 'Stunning. Brave. Beautiful.','That\'s going in the scrapbook.','A true artist.','Ten out of ten, no notes.','I\'m honoured to lose to you.',
 'Okay, I deserved that.','Fair play.','Rematch? You were great.','That was fun!','Best game yet.','You\'re my hero.',
 'Pure skill.','Calculated.','That\'s how it\'s done!','Witnessed greatness.','Sheesh.','Big moves only.','Stellar.',
];
const TRASH=[
 'Is that all you\'ve got?','Easy.','Too easy.','Get good.','Skill issue.','Cry about it.','Sit down.','Bye bye!',
 'You call that a move?','My grandma plays better.','Was that on purpose?','Yikes.','Embarrassing.','Do you need a tutorial?',
 'Wow. Just wow. (Not in a good way.)','Lucky.','Pure luck and you know it.','You\'re going down!','Prepare to lose.','Nope.',
 'Not even close.','Better luck next time, loser.','Ha! Ha ha!','Get rekt.','Owned.','Tell your mom I said hi.','Pathetic.',
 'You\'re making this too easy.','Are you even trying?','Did your phone die or something?','Bold of you to try that.','Cute.',
 'Adorable attempt.','I\'m not even warmed up.','That\'s gonna leave a mark.','Somebody call the waaambulance.','L.','Take the L.',
 'Whoops! Was that your plan?','I\'ve seen toddlers do better.','You\'re the reason they put instructions on shampoo.','Weak.',
 'You play like you\'re wearing mittens.','Did you learn that from a cereal box?','Back to the minor leagues.','Dork.','Nerd.',
 'Uninstall.','Delete the app.','Rage quit already.','You mad?','Stay mad.','Seethe.','Big yikes.','Shameful display!',
 'Sloppy. Very sloppy.','I could do that with my eyes closed.','Hold this L.','Thanks for the free win.','Who taught you to play?',
 'Your strategy is a cry for help.','Not today, chump.','Chump.','Scrub.','Noob.','Rookie mistake.','Amateur hour over there.',
 'Is your screen even on?','I\'m embarrassed for you.','Bless your heart.','That was a choice.','Brave. Stupid, but brave.',
];
const CRASS=[
 'Fuck off!','Suck it, bitch!','Welcome to Chode City. Population: you.','Eat shit!','Get fucked!','Kiss my ass!',
 'Bite me.','Blow me.','Up yours!','Shove it up your ass.','Holy shit, you suck.','You absolute dumbass.','Dipshit.','Jackass.',
 'Asshat.','Shit-for-brains.','Fuckface.','Butt munch.','Dingleberry.','Turd burglar.','Ass clown.','Douche canoe.',
 'Fart sniffer.','Ball sack.','Dickweed.','Cockwomble.','Twatwaffle.','Shitstain.','Knob jockey.','Choad.','Butthead.',
 'Eat my ass.','Lick my balls.','Suck my dick.','Smell my farts.','I\'ll fart on your pillow.','You\'re a turd in a hat.',
 'Go cry to your mommy, bitch.','Who shit in your cereal?','Shit happens. Mostly to you.','Fuck yeah!','Fuck me, that was close.',
 'Well, fuck.','Oh shit!','Holy fucking shit!','Goddamn!','Sweet merciful crap!','Son of a bitch!','Cock-a-doodle-you-lose.',
 'Your mom called. She\'s disappointed.','I\'ve had shits more threatening than you.','You couldn\'t win a fight with a fart.',
 'I\'d call you a tool, but tools are useful.','You\'re the human version of a wet fart.','Go lick a battery.','Eat a bag of dicks.',
 'Suck a fart out of my ass.','Kiss my hairy ass.','Bend over, here it comes.','Get wrecked, dickhead.','Tits up, loser.',
 'Get your shit together.','Pull your head out of your ass.','Does your ass get jealous of all the shit coming out your mouth?',
 'You smell like a fart in a hot car.','Cry harder, bitch.','Sit on it and spin.','Choke on it.','Lick the pavement.','Wanker.',
 'Bollocks!','Bloody hell!','Piss off!','Sod off!','You\'re a sack of crap.','Crap on a cracker!','Butt-chugging champion right here.',
 'Your strategy is dog shit.','That was hot garbage.','Absolute dogshit move.','You play like a drunk raccoon.','Clown shoes. Clown fucking shoes.',
 'Stick it where the sun don\'t shine.','Kiss the ring, bitch.','Daddy\'s home.','Mommy\'s home.','Who\'s your daddy?','Who\'s your mommy?',
 'Get on your knees and beg.','Bow down, peasant.','Sucks to suck.','Your face sucks.','Tea-bagged.','*tea-bags you*',
 'I\'m gonna wipe my ass with your score.','Smell ya later, fart face.','Catch these hands. And these farts.','Nice try, butt-nugget.',
];
// for the moment: {when: [lines]}
const SITUATION={
 myturn:['Watch this.','Hold my beer.','Here goes nothing.','My turn, baby!','Prepare yourself.','Time to shine.','Pray for me.','Let me cook.'],
 theirturn:['Your turn!','Roll already!','Any day now…','Tick tock.','Hurry up!','I\'m growing old here.','Did you fall asleep?','Go go go!','Take your time. (Don\'t.)','Waiting… 💤'],
 game:['Here we go!','Focus!','Don\'t choke!','So close!','Behind you!','Help!','Cover me!','I got this!','Nooooo!','Yesss!','Get ready!','Watch out!'],
 room:['Rematch?','One more!','GG, rematch?','Best of three?','Pick a game!','You pick.','Board game?','Brb','Back!','Gotta go soon.','Ready when you are.','Snack break?'],
};
const EMOTES=['😂','🔥','😎','😡','😭','🤯','👏','🙏','💩','🖕','🍆','💀','🎉','😘','🤡','🍺'];
Object.assign(exports,{NICE,TRASH,CRASS,SITUATION,EMOTES});
