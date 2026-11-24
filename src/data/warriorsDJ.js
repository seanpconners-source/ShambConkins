// THE WARRIORS radio DJ (owner, Nov 24: "a full screen image of the dj and background... several images with the mouth in
// different positions so it looks like she's talking"). Our own DJ character (not a likeness of anyone from the film).
// Three picture shapes (src/bgShape.js): ww:dj-wide 1920x1080, ww:dj-tall 1080x1920, ww:dj-fold 1504x1670 = the whole studio
// with the DJ, mouth CLOSED. The other frames are cut down to the part that changes by tools/warriors/import-dj.py:
// ww:dj-<shape>-<frame> = a small picture drawn at BOX[shape][frame] = [x, y, w, h] in the full picture's pixels.
// Frames: small (m, n, t...), ah (a), ee (e, i), oo (o, u, w), blink (eyes shut, drawn every few seconds).
// GUIDE = where the templates (tools/warriors/dj-templates.py) ask for the face, eyes and mouth; BOX is filled from the real art.
// The JSON between the markers is read and rewritten by the Python tools: keep it plain JSON.
const DJ=/*@@DJ*/{
 "frames": ["small","ah","ee","oo","blink"],
 "guide": {
  "wide": {
   "size": [1920,1080],
   "face": [1060,420,170,220],
   "eyes": [930,330,260,80],
   "mouth": [980,500,160,80],
   "subtitles": 756
  },
  "tall": {
   "size": [1080,1920],
   "face": [540,700,200,260],
   "eyes": [390,600,300,90],
   "mouth": [450,800,180,90],
   "subtitles": 1500
  },
  "fold": {
   "size": [1504,1670],
   "face": [752,640,210,270],
   "eyes": [600,540,304,90],
   "mouth": [662,740,180,90],
   "subtitles": 1240
  }
 },
 "box": {}
}/*@@*/;
// which mouth goes with a letter
function viseme(ch){if(!ch)return null;const c=ch.toLowerCase();if(c==='a')return 'ah';if('eiy'.includes(c))return 'ee';if('ouwq'.includes(c))return 'oo';
 if('mbp'.includes(c)||!/[a-z0-9]/.test(c))return null;return 'small';}
Object.assign(exports,{DJ,viseme});
