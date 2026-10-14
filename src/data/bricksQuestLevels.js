// Bricks Breaker Quest stages. Rows are written top to bottom, 9 cells each (tokens: see src/engines/bricksQuestSim.js):
// '.' empty, '+' ball ring, N square brick, N + a/b/c/d triangle (right angle at top-left/top-right/bottom-left/
// bottom-right), N + h/v horizontal/vertical laser, N + x bomb, ':k' colour override, '-' green row-beam ring,
// '*' green cross-beam ring (drawn as a plus).
// The bottom `show` rows (default 6) start on the board; rows above wait off screen ("Line N") and drop in one per turn.
// Hand stages get extra queued lines from queueLines() (the stage's own rows again, numbers creeping up), so every turn
// brings a new line in, like the real game; stage 20 is copied line by line from the owner's screenshots.
// Stages 1-36 are hand built in the game's style; 75, 120, 1043 and 1050 are rebuilt from screenshots of the real game.
// Every other stage number comes from stageDef(n), a seeded generator in the same style, so the quest never ends.
const {seededRandom}=require("src/utils.js");

const HAND={
 1:{balls:12,rows:['3 3 3 3 3 3 3 3 3','2 2 2 2 + 2 2 2 2','1 1 1 1 1 1 1 1 1']},
 2:{balls:12,rows:['4 . 4 . 4 . 4 . 4','3 3 3 3 3 3 3 3 3','. 2 . 2 + 2 . 2 .','2 2 2 2 2 2 2 2 2']},
 3:{balls:14,rows:['. . . . 8 . . . .','. . . 7 7 7 . . .','. . 6 6 + 6 6 . .','. 5 5 5 5 5 5 5 .','4 4 4 4 4 4 4 4 4']},
 4:{balls:15,rows:['6a 6 6 6 + 6 6 6 6b','5 5 5 5 5 5 5 5 5','4c 4 4 4 4 4 4 4 4d','3 3 . 3 3 3 . 3 3']},
 5:{balls:16,rows:['8 8 8 8 8 8 8 8 8','7 7 7 7 9h 7 7 7 7','. . . + . + . . .','6 6 6 6 6 6 6 6 6','5 5 5 5 5 5 5 5 5']},
 6:{balls:18,rows:['. . . . 12 . . . .','. . . 11d 11 11c . . .','. . 10d 10 + 10 10c . .','. . 10b 10 10 10 10a . .','. . . 9b 9 9a . . .','. . . . 9 . . . .']},
 7:{balls:20,rows:['12 . 12 . 14v . 12 . 12','12 . 12 . 12 . 12 . 12','11 + 11 . 11 . 11 + 11','11 . 11 . 11 . 11 . 11','10 10 10 10 10 10 10 10 10']},
 8:{balls:22,rows:['14 . 14 . 14 . 14 . 14','. 13 . 13 . 13 . 13 .','13 . 13 . + . 13 . 13','. 12 . 12 . 12 . 12 .','12 . 12 . 12 . 12 . 12','. 11 . 11 . 11 . 11 .']},
 9:{balls:24,rows:['15 15 15 15 15 15 15 15 15','15 15 15 15 15 15 15 15 15','14 6x 14 14 + 14 14 6x 14','13 13 13 13 13 13 13 13 13','12 12 12 12 12 12 12 12 12']},
 10:{balls:26,rows:['. 18 18 . . . 18 18 .','18 18 18 18 . 18 18 18 18','17 17 17 17 + 17 17 17 17','16b 16 16 16 16 16 16 16 16a','. 15b 15 15 15 15 15 15a .','. . 14b 14 14 14 14a . .','. . . 13b 13 13a . . .','. . . . 12 . . . .']},
 11:{balls:28,rows:['20 20 20 20 . 20 20 20 20','19h 19 19 . 19 . 19 19 19','18 18 . 18 + 18 . 18 18','17 . 17 17 17 17 17 . 17h','16 16 16 . 16 . 16 16 16','15 . 15 . 15 . 15 . 15']},
 12:{balls:30,rows:['22 . . . + . . . 22','22d 21 . . . . . 21 22c','. 21b 20 . 24x . 20 21a .','. . 20b 19 . 19 20a . .','. . . 19b 18 19a . . .','17 17 17 17 17 17 17 17 17']},
 13:{balls:32,rows:['2 2 2 2 2 2 2 2 2','24 24 24 24 24 24 24 24 24','2 2 2 2 + 2 2 2 2','23 23 23 23 23 23 23 23 23','2 2 2 2 2 2 2 2 2','22 22 22 22 22 22 22 22 22']},
 14:{balls:34,rows:['26 26 26 . . . 26 26 26','26 + 26 . 28v . 26 + 26','25 25 25 . . . 25 25 25','. . . 25 25 25 . . .','. . . 24 + 24 . . .','. . . 24 24 24 . . .','23 23 23 . . . 23 23 23','23 23 23 . . . 23 23 23']},
 15:{balls:36,qb:1.4,rows:['28 28 28 28 28 28 28 28 28','28a . . . . . . . 28b','27 . 27d 27 27 27 27c . 27','27 . 27 + 30x + 27 . 27','26 . 27b 27 27 27 27a . 26','26c . . . . . . . 26d','25 25 25 25 25 25 25 25 25']},
 16:{balls:38,rows:['32 . 32 . 32 . 32 . 32','31 31 31 31 31 31 31 31 31','30h 30 30 30 + 30 30 30 30','30 30 30 30 30 30 30 30 30h','. 29 . 29 . 29 . 29 .','29 29 29 29 29 29 29 29 29']},
 17:{balls:40,rows:['. . . 34d 34 34c . . .','. . 33d 33 33 33 33c . .','. 33d 33 33 + 33 33 33c .','32d 32 32 . 32 . 32 32 32c','2 2 2 2 2 2 2 2 2','32 32 . 32 32 32 . 32 32','32b 32 32a . + . 32b 32 32a']},
 18:{balls:42,rows:['36 36 36 36 36 36 36 36 36','35v . . . + . . . 35v','35 35 35 35 35 35 35 35 35','34 . . . 34 . . . 34','34 34 34 + 34 + 34 34 34','33 . . . 33 . . . 33','33 33 33 33 33 33 33 33 33']},
 19:{balls:44,qb:1.45,rows:['38 38 38 38 38 38 38 38 38','37 37 37 37 37 37 37 37 37','36 36 2 2 + 2 2 36 36','36 36 2 40x 40x 40x 2 36 36','35 35 2 2 2 2 2 35 35','35 35 35 35 35 35 35 35 35']},
 20:{balls:57,real:true,colors:{1:'c',2:'c',30:'b',31:'b',39:'g',41:'o',42:'u',44:'g',64:'t',67:'u',80:'u',84:'u',88:'r'},rows:[
  '44 44 . 44 * 44 . 44 44','. . . . . . . . .','88 . 88 . + . 88 . 88','. 44c 44 44 - 44 44 44d .','. . . . . . . . .','. . . . . . . . .',
  '67a . . . + 67 67 67 67','84 84 84 . . + 84 84 -','42 42 42b 42d 42 . + . .',
  '41 . 41 2 + 2 41a 41d 41','80 + . * 64 64 80 80 80','39 39c . 1 + 1 . 39a 39c','31 31 31 + 31d 31b - 31 1','1 1 30 + 30d 30 1 30 1','1 1 30 1 + 1 1 30b 1']},
 21:{balls:48,qb:1.45,rows:['42a 42 . . . . . 42 42b','42 42a . . + . . 42b 42','41 41 41a . . . 41b 41 41','41 41 41 41a . 41b 41 41 41','40 40 40 40 . 40 40 40 40','40c 40 40 40 + 40 40 40 40d','. 39c 39 39 39 39 39 39d .']},
 22:{balls:50,rows:['44 . 44 . 44 . 44 . 44','44 . 44 . 44 . 44 . 44','43 . 43 . 46h . 43 . 43','43 + 43 + 43 + 43 + 43','42 . 42 . 42 . 42 . 42','42 42 42 42 42 42 42 42 42']},
 23:{balls:52,rows:['46 46 46 46 46 46 46 46 46','45 . . . . . . . 45','45 . 2 2 2 2 2 . 45','45 . 2 + 48x + 2 . 45','44 . 2 2 2 2 2 . 44','44 . . . . . . . 44','44 44 44 44 44 44 44 44 44']},
 24:{balls:54,rows:['48 48 48 48 + 48 48 48 48','48 48 48 . 48 . 48 48 48','47b 47 47 47 47 47 47 47 47a','. 47b 47 47 . 47 47 47a .','. . 46b 46 46 46 46a . .','. . . 46b + 46a . . .','45 45 . 45 . 45 . 45 45']},
 25:{balls:56,rows:['50 50 50 50 . 50 50 50 50','50 50v 50 . 50 . 50 50v 50','49 49 . 49 + 49 . 49 49','49 . 49 49 49 49 49 . 49','48 . 48 . 48 . 48 . 48','48 48 . 48 48 48 . 48 48','47 . 47 + 47 + 47 . 47','47 47 47 . 47 . 47 47 47']},
 26:{balls:66,rows:['52 . . . 52 . . . 52','. 52 . 52 . 52 . 52 .','. . 51 . + . 51 . .','. 51 . 51 . 51 . 51 .','50 . . . 54x . . . 50','50 50 50 . 50 . 50 50 50','49c 49 . 49 . 49 . 49 49d']},
 27:{balls:60,rows:['54 54 54 54 54 54 54 54 54','2 2 2 2 2 2 2 2 2','53 53 53 53 53h 53 53 53 53','2 2 2 + 2 + 2 2 2','52 52 52 52 52 52 52 52 52','2 2 2 2 2 2 2 2 2','51 51 51 51 51 51 51 51 51']},
 28:{balls:62,rows:['56d 56 56 56 56 56 56 56 56c','56 . . . + . . . 56','55 . 55d 55 55 55 55c . 55','55 . 55 . 58v . 55 . 55','54 . 55b 55 55 55 55a . 54','54 . . . + . . . 54','53b 53 53 53 53 53 53 53 53a']},
 29:{balls:64,qb:1.4,rows:['58 58 58 58 . 58 58 58 58','58 . 58 . 58 . 58 . 58','57 57 . 57 57 57 . 57 57','57 . 57 + 57 + 57 . 57','56 56 56 . 56 . 56 56 56','56 . 56 . 56 . 56 . 56','55 55 . 55 55 55 . 55 55','55x . 55 . + . 55 . 55x']},
 30:{balls:66,rows:['. 60 60 60 60 60 60 60 .','60 60 . . . . . 60 60','60 . . 60d 60 60c . . 60','59 . 59d 59 + 59 59c . 59','59 . 59b 59 59 59 59a . 59','59 . . 59b 59 59a . . 59','58 58 . . . . . 58 58','. 58 58 58 58 58 58 58 .']},
 31:{balls:80,rows:['62 62 62 62 . 62 62 62 62','62h 62 62 . 62 . 62 62 62','61 61 . 61 61 61 . 61 61','61 . 61 61 + 61 61 . 61h','60 60 60 . 60 . 60 60 60','60h 60 . 60 60 60 . 60 60','59 . 59 59 . 59 59 . 59']},
 32:{balls:100,rows:['64 . . . . . . . 64','64a 64 . . + . . 64 64b','63 63a 63 . . . 63 63b 63','63 63 63a 63 . 63 63b 63 63','62 62 62 62a 66x 62b 62 62 62','62 62 . 62 . 62 . 62 62','61 . 61 + 61 + 61 . 61']},
 33:{balls:72,rows:['66 66 66 66 . 66 66 66 66','2 2 2 2 2 2 2 2 2','65 65 . 65 65 65 . 65 65','65 2 65 2 + 2 65 2 65','64 64 64 . 64 . 64 64 64','64 2 64 2 64 2 64 2 64','63 63 . 63 63 63 . 63 63','63 . 63 + 63 + 63 . 63']},
 34:{balls:74,rows:['68 68 68 . 68 . 68 68 68','68 68 68 . 68 . 68 68 68','67 . . . + . . . 67','67 67 67 67 70v 67 67 67 67','66 . . . . . . . 66','66 66 66 . + . 66 66 66','65 65 65 . 65 . 65 65 65','65 65 65 . 65 . 65 65 65']},
 35:{balls:110,rows:['70 70 70 70 . 70 70 70 70','70d 70 70 . 70 . 70 70 70c','69 69 . 69 + 69 . 69 69','69 69 72x 69 . 69 72x 69 69','68 . 68 68 68 68 68 . 68','68b 68 68 . + . 68 68 68a','. 67b 67 67 . 67 67 67a .','. . 67 . 67 . 67 . .']},
 36:{balls:100,rows:['72 72 72 72 . 72 72 72 72','72 72 72 . 72 . 72 72 72','71 71 . 71 71 71 . 71 71','71 . 71 71 + 71 71 . 71','70 70 70 . 70 . 70 70 70','70h 70 . 70 70 70 . 70 70','69 . 69 + 69 + 69 . 69','69 69 . 69 . 69 . 69 69','68 . 68 . 68 . 68 . 68']},
 // ---- rebuilt from screenshots of the real game ----
 75:{balls:60,real:true,rows:['. . 106 106 106 106 53v 106 +','52 . 104 52x . 52b 104 104 +','. 49 98 98 98 + 49 49 49','. . 100 100 100 + 50h 100 50','49 + 40 . . 98 98 . 49','. . . 39 48 48 48 . 48'],colors:{39:'b',40:'b',48:'g',49:'g',50:'g',52:'g',98:'r',100:'r',104:'r',106:'u'}},
 120:{balls:100,real:true,rows:['45c 2b 45 2 45 45 45 2 45','45v 2c 54b 2 2 2 2 2 54','58 58 58 2 58 2 58 2 58','2 2 63h 63 63c 2d 63 2 63v','2 2 67 67a 67d 2 67 2 67','72 . 72 . 72 72 72 . .'],colors:{2:'c',45:'i',54:'g',58:'t',63:'p',67:'r',72:'u'}},
 1043:{balls:110,real:true,rows:[
  '. 112:u 112:u . . . 112:u 112:u .','. 111 111 111 . 111 111 111 .','110a 110 110b . + . 110a 110 110b','109c 109 109d . . . 109c 109 109d','108 . 108 108 + 108 108 . 108',
  '107 107 107 . . . 107 107 107','106c 106 106d . + . 106c 106 106d','206:r 206:r . 106 106 106 . 206:r 206:r','. 106:o . . . . . 106:o .',
  '. 105:o 105b:o . . 105a:o 105:o 105b:o .','104a:o . . 104d:o 104c:o + 104a:o 104c:o 104b:o','. 103c:o + 103:o 103d:o . 103c:o 103d:o 103:o','. 102c:g + 204:u 204:u . 204:u 102h 102d:g',
  '+ 202:r 101d:g 101d:g 101c:g 101:g 101d:g 101c:g 101:g','+ 200:r 100v . . 100d:g 100c:g 100d:g 100c:g'],colors:{100:'g',101:'g',102:'g',103:'o',104:'o',105:'o'}},
 1050:{balls:110,real:true,rows:[
  '107 107 107 107 + 107 107 107 107','. 107 107 107 107 107 107 107 .','106 . 106 . 106 . 106 . 106','106 106 106 106 + 106 106 106 106','2 2 2 2 2 2 2 2 2','105 105 105 105 105 105 105 105 105',
  '105 . . 105 + 105 . . 105','105 105 105 105 105 105 105 105 105',
  '105 105 . . . + 105 105 105','104 . . 104 104 . + . 104','103 . 103 103 103 103 103 + 103','102 102 102 102 102 102 + . 102','101 101 101 101 101 101 + 101 101','100 100 100 100 100 100 . + 100'],colors:{100:'r',101:'r',102:'r',103:'r',104:'r',105:'u',106:'u',107:'u'}}
};
// Real-game screenshots show "Line 31" at stage 1050 and "Line 21" at 1043: those stages keep dropping in extra lines.
HAND[1050].lineTarget=31;HAND[1043].lineTarget=21;

const SHAPES=[ // 9x6 masks for the generator: '#' brick, '+' ring, '/' and '\\' diagonal edges, 'L' laser, 'X' bomb
 ['####.####','###.#.###','##.#+#.##','###.#.###','####.####','#.#.#.#.#'],
 ['#.#.#.#.#','.#.#.#.#.','#.#.+.#.#','.#.#.#.#.','#.#.#.#.#','.#.#.#.#.'],
 ['....#....','.../#\\...','../#+#\\..','./##L##\\.','/#######\\','#########'],
 ['##.....##','#\\.....\\#','##\\.+./##','###\\./###','###.X.###','#########'],
 ['###...###','#+#.L.#+#','###...###','...###...','...#+#...','...###...'],
 ['#########','#.......#','#.##X##.#','#.#+.+#.#','#.......#','#########'],
 ['L###.###.','###.###.#','##.###.##','#.##+##.#','.###.###.','###.###.L'],
 ['/##...##\\','###\\./###','####+####','###/.\\###','\\##...##/','#########'],
 ['#.#.#.#.#','#.#.#.#.#','#+#.L.#+#','#.#.#.#.#','#.#.#.#.#','#########'],
 ['.#######.','##.....##','#..#X#..#','#..+.+..#','##.....##','.#######.'],
 ['###.#.###','2222+2222','#.#####.#','222222222','###.#.###','2222L2222'],
 ['\\#######/','.\\#####/.','..\\#+#/..','../###\\..','./#####\\.','/#######\\']
];
// generated stage: balls and brick numbers grow with n (the real game sits around 100-110 balls past stage 1000)
function stageDef(n){
 n=Math.max(1,Math.floor(n));if(HAND[n])return {n,...HAND[n],rows:HAND[n].rows.slice(),...extraLines(n)};
 const rnd=seededRandom('bbq-stage-'+n),b0=Math.min(110,Math.round(40+n*0.55)),base=Math.round(b0*0.52+rnd()*6);
 // a few more lines than fit on screen so one drops in every turn; 20% more balls to pay for them
 const lines=Math.min(30,9+Math.floor(n/25)+Math.floor(rnd()*3)),rows=[],balls=Math.round(b0*1.2);
 for(let i=0;i<lines;i++){const shape=SHAPES[Math.floor(rnd()*SHAPES.length)],k=i%6,mask=shape[k];
  const doubled=rnd()<.12&&n>40;
  rows.push(mask.split('').map((ch,c)=>{const h=Math.max(1,(doubled?2:1)*(base+Math.floor((lines-1-i)/2)));
   if(ch==='#')return String(h);if(ch==='2')return '2';if(ch==='+')return '+';if(ch==='X')return Math.ceil(h/2)+'x';if(ch==='L')return h+(rnd()<.5?'h':'v');
   if(ch==='/')return h+(k<3?'d':'b');if(ch==='\\')return h+(k<3?'c':'a');return '.';}));
  const row=rows[rows.length-1],gaps=row.map((t,c)=>t==='.'?c:-1).filter(c=>c>=0);
  if(gaps.length&&rnd()<.3)row[gaps[Math.floor(rnd()*gaps.length)]]=rnd()<.6?'-':'*';rows[rows.length-1]=row.join(' ');}
 return {n,balls,rows};
}
// Extra lines queued above a hand-built stage: its own rows again (cycled, sometimes mirrored), each line's numbers a
// little higher than the last, now and then doubled (stage 20's 42 line is followed by an 84 line), with a green beam
// ring dropped into a gap now and then. Stage 1 gets 3 more lines, stage 36 gets 12.
function queueLines(n){const def=HAND[n];if(def.real||def.lineTarget)return {};
 const rnd=seededRandom('bbq-queue-'+n),own=def.rows,count=Math.min(12,3+Math.floor(n/3)),top=[];
 for(let i=0;i<count;i++){
  // like the real stage 20 queue (42 line, 84 line, 67 line, two blank lines): partial lines and the odd blank one
  if(i>1&&rnd()<.18){top.unshift('. . . . . . . . .');continue;}
  const src=own[(i*2+1)%own.length].split(/\s+/),twice=n>=8&&rnd()<.12,mirror=rnd()<.5;
  const cells=src.map(t=>{const m=/^(\d+)(.*)$/.exec(t);if(!m)return t;const v=+m[1];if(rnd()<.4)return '.';if(v<=2)return t;
   return (v+1+Math.floor(i/3))*(twice?2:1)+m[2];});
  if(mirror){cells.reverse();for(let c=0;c<cells.length;c++)cells[c]=cells[c].replace(/^(\d+)([abcd])$/,(_,h,sh)=>h+{a:'b',b:'a',c:'d',d:'c'}[sh]);}
  const gaps=cells.map((t,c)=>t==='.'?c:-1).filter(c=>c>=0);
  if(n>=4&&gaps.length&&rnd()<.4)cells[gaps[Math.floor(rnd()*gaps.length)]]=rnd()<.6?'-':'*';
  if(!cells.some(t=>/^\d/.test(t)))cells[Math.floor(rnd()*cells.length)]=String(Math.max(3,...own.join(' ').match(/\d+/g).map(Number)));
  top.unshift(cells.join(' '));}
 // more lines to break than the hand-built layout alone: a quarter more balls (and the rings in the new lines)
 return {rows:[...top,...own],balls:Math.round(def.balls*(def.qb||1.25))};}
function extraLines(n){const def=HAND[n];if(!def.lineTarget)return queueLines(n);const rows=def.rows.slice(),add=def.lineTarget-(rows.length-6);
 const rnd=seededRandom('bbq-lines-'+n),top=[];for(let i=0;i<add;i++){const shape=SHAPES[(i*5+3)%SHAPES.length][i%6],h=108+Math.floor((add-i)/3);
  top.push(shape.split('').map(ch=>ch==='#'?String(h):ch==='+'?'+':ch==='2'?'2':ch==='/'?h+'d':ch==='\\'?h+'c':ch==='X'?Math.ceil(h/2)+'x':ch==='L'?h+(rnd()<.5?'h':'v'):'.').join(' '));}
 return {rows:[...top,...rows]};}
// apply per-stage colour keys: 'N' -> 'N:k' (tokens already carrying :k keep theirs)
function withColors(def){if(!def.colors)return def;return {...def,rows:def.rows.map(r=>r.split(/\s+/).map(t=>{const m=/^(\d+)([a-z]?)$/.exec(t);const k=m&&def.colors[m[1]];return k&&!/[hvx]/.test(m[2])?`${t}:${k}`:t;}).join(' '))};}
function stage(n){return withColors(stageDef(n));}
const HAND_STAGES=Object.keys(HAND).map(Number);
Object.assign(exports,{stage,HAND_STAGES});
