// Filled in by tools/build.mjs from assets/portraits/*. Empty in source form.
// The one-file game holds data: URIs; the installed app (build --pwa) holds file names like "a/<hash>.webp" instead.
const {ART}=require("src/data/art.js");
const USER_PORTRAITS=/*@@USER_PORTRAITS@@*/{};
for(const [key,url] of Object.entries(USER_PORTRAITS))ART[key]=url;
const APP_FILE=/^a\/[0-9a-f]{16}\.[a-z0-9]+$/;
// The owner's own raster art (a photo or drawing, not a generated SVG stand-in or an online photo).
const isRasterArt=url=>typeof url==='string'&&(/^data:image\/(webp|png|jpe?g|gif)/i.test(url)||APP_FILE.test(url)&&/\.(webp|png|jpe?g|gif)$/i.test(url));
// The bytes behind a USER_PORTRAITS value, either form.
async function assetBytes(url){
 if(url.startsWith('data:')){const s=atob(url.slice(url.indexOf(',')+1)),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
 const r=await fetch(url);if(!r.ok)throw new Error(`${url}: ${r.status}`);return new Uint8Array(await r.arrayBuffer());
}
Object.assign(exports,{USER_PORTRAITS,APP_FILE,isRasterArt,assetBytes});
