// Filled in by tools/build.mjs from assets/portraits/*. Empty in source form.
const {ART}=require("src/data/art.js");
const USER_PORTRAITS=/*@@USER_PORTRAITS@@*/{};
for(const [key,url] of Object.entries(USER_PORTRAITS))ART[key]=url;
Object.assign(exports,{USER_PORTRAITS});
