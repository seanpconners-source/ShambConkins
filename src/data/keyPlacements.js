// Arcade background placements locked in by the owner in the Background Picker artifact (roadmap M20).
// KEY_SCREENS = the picker's screens; KEY_PLACE[slot][screen] = {z: zoom (1 = just fills the screen), fx, fy: the
// point of the picture (fractions) at the screen's centre}. arcadeConsole placeKey() uses the setting of the nearest
// screen when it is locked; otherwise its automatic placement. Regenerate from the picker; don't hand-edit.
const KEY_SCREENS=[['fold-closed',344,882],['phone',390,844],['phone-land',844,390],['fold-open',830,920],['fold-open-land',920,830],
 ['tablet',820,1180],['tablet-land',1180,820],['desktop',1440,900]];
const KEY_PLACE={};
Object.assign(exports,{KEY_SCREENS,KEY_PLACE});
