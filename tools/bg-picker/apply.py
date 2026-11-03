#!/usr/bin/env python3
"""Background Picker, step 3: write the owner's locked placements into the game.
Usage: python3 -I tools/bg-picker/apply.py <dump dir>
<dump dir> = where ArtifactData `list` of collection `bg` was saved with out_dir (it holds bg/<slot>.json).
Merges every locked screen into src/data/keyPlacements.js (KEY_PLACE); slots not in the dump are kept."""
import json, os, sys, glob, re
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
P = os.path.join(R, 'src', 'data', 'keyPlacements.js')
SCREENS = json.load(open(os.path.join(os.path.dirname(__file__), 'screens.json')))
def load():
    s = open(P).read(); m = re.search(r'/\*PLACE\*/(.*?)/\*END\*/', s, re.S)
    return json.loads(m.group(1)) if m else {}
def write(place):
    ids = [s['id'] for s in SCREENS]
    body = ',\n'.join('  %s:{%s}' % (json.dumps(k), ','.join('%s:%s' % (json.dumps(sid), json.dumps(v[sid], separators=(',', ':'))) for sid in ids if sid in v))
                      for k, v in sorted(place.items()))
    scr = ','.join("['%s',%d,%d]" % (s['id'], s['w'], s['h']) for s in SCREENS)
    open(P, 'w').write(f"""// Arcade background placements locked in by the owner in the Background Picker (roadmap M20, tools/bg-picker/README.md).
// KEY_SCREENS = the picker's screens; KEY_PLACE[slot][screen] = {{z: zoom (1 = just fills the screen), fx, fy: the point of the
// picture (fractions) at the screen's centre}}. arcadeConsole placeKey() uses the setting of the nearest screen when it is
// locked; otherwise its automatic placement. Written by tools/bg-picker/apply.py; don't hand-edit.
const KEY_SCREENS=[{scr}];
const KEY_PLACE=/*PLACE*/{{
{body}
}}/*END*/;
Object.assign(exports,{{KEY_SCREENS,KEY_PLACE}});
""")
if __name__ == '__main__':
    place = load(); n = 0
    for f in sorted(glob.glob(os.path.join(sys.argv[1], 'bg', '*.json'))):
        d = json.load(open(f)); d = d.get('data', d); slot = os.path.basename(f)[:-5]
        for sid, v in (d.get('screens') or {}).items():
            if sid in [s['id'] for s in SCREENS] and all(k in v for k in ('z', 'fx', 'fy')):
                place.setdefault(slot, {})[sid] = {'z': round(v['z'], 4), 'fx': round(v['fx'], 4), 'fy': round(v['fy'], 4)}; n += 1
    write(place)
    full = [k for k, v in place.items() if len(v) == len(SCREENS)]
    print(f'{n} screens from the dump; {len(place)} pictures placed, {len(full)} on every screen')
