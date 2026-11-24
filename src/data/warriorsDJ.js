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
   "face": [1062,440,170,220],
   "eyes": [930,335,265,80],
   "mouth": [982,500,160,80],
   "subtitles": 756
  },
  "tall": {
   "size": [1080,1920],
   "face": [540,782,302,391],
   "eyes": [306,596,471,142],
   "mouth": [398,889,284,142],
   "subtitles": 1500
  },
  "fold": {
   "size": [1504,1670],
   "face": [724,680,263,340],
   "eyes": [520,518,410,124],
   "mouth": [600,773,247,124],
   "subtitles": 1240
  }
 },
 "box": {
  "wide": {
   "small": [949,458,228,184],
   "ah": [949,458,228,184],
   "ee": [949,458,228,184],
   "oo": [949,458,228,184],
   "blink": [897,325,331,87]
  },
  "tall": {
   "small": [333,819,424,316],
   "ah": [333,819,424,316],
   "ee": [333,819,424,316],
   "oo": [333,819,424,316],
   "blink": [236,585,612,147]
  },
  "fold": {
   "small": [547,713,355,275],
   "ah": [547,713,355,275],
   "ee": [547,713,355,275],
   "oo": [547,713,355,275],
   "blink": [461,508,521,129]
  }
 },
 "shade": {
  "face": 0.82,
  "room": 0.35,
  "deg": 12,
  "left": 1
 }
}/*@@*/;
// which mouth goes with a letter
function viseme(ch){if(!ch)return null;const c=ch.toLowerCase();if(c==='a')return 'ah';if('eiy'.includes(c))return 'ee';if('ouwq'.includes(c))return 'oo';
 if('mbp'.includes(c)||!/[a-z0-9]/.test(c))return null;return 'small';}
Object.assign(exports,{DJ,viseme});
