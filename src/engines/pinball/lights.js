// Light shows over a table's inserts. A show maps each lamp (position, progress k 0..1, time) to a brightness 0..1 and
// is laid over the rules' lamps for its duration. Shows: sweepUp, sweepDown, sweepLeft, sweepRight, radial (from o.x,o.y),
// implode (toward o.x,o.y), chase (spinning arms round the centre), sparkle, blink, strobe, fade.
// attract(t) cycles through them for the attract mode. GI and flashers live on the machine (m.gi, m.flashers).
const band=(v,c,w)=>Math.max(0,1-Math.abs(v-c)/w);
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;}
const SHOWS={
 sweepUp:(l,k,t,o,c)=>band(l.y,c.maxY-(c.maxY-c.minY+200)*k,o.w||110),
 sweepDown:(l,k,t,o,c)=>band(l.y,c.minY-100+(c.maxY-c.minY+200)*k,o.w||110),
 sweepLeft:(l,k,t,o,c)=>band(l.x,c.maxX+60-(c.maxX-c.minX+120)*k,o.w||70),
 sweepRight:(l,k,t,o,c)=>band(l.x,c.minX-60+(c.maxX-c.minX+120)*k,o.w||70),
 radial:(l,k,t,o,c)=>{const d=Math.hypot(l.x-(o.x??c.cx),l.y-(o.y??c.cy));return Math.max(band(d,k*c.maxR*1.15,o.w||90),band(d,k*c.maxR*1.15-260,(o.w||90)*.7));},
 implode:(l,k,t,o,c)=>{const d=Math.hypot(l.x-(o.x??c.cx),l.y-(o.y??c.cy));return band(d,(1-k)*c.maxR,o.w||90);},
 chase:(l,k,t,o,c)=>{const a=Math.atan2(l.y-c.cy,l.x-c.cx);return (Math.sin(a*(o.arms||3)-t*(o.speed||9))+1)/2>.72?1:0;},
 sparkle:(l,k,t)=>hash(l.id+Math.floor(t*14))<.28?1:0,
 blink:(l,k,t)=>Math.floor(t*8)%2,
 strobe:(l,k,t)=>Math.floor(t*20)%2,
 fade:(l,k)=>1-k,
};
const ATTRACT=['sweepUp','chase','sweepDown','radial','sparkle','sweepRight','implode','sweepLeft'];
function createLights(def){
 const xs=def.lamps.map(l=>l.x),ys=def.lamps.map(l=>l.y);
 const c={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};c.cx=(c.minX+c.maxX)/2;c.cy=(c.minY+c.maxY)/2;c.maxR=Math.hypot(c.maxX-c.minX,c.maxY-c.minY);
 return {
  // Lay the running shows (m.shows) over lamp map L (brightness = max of rules and shows).
  apply(L,shows,now){for(const sh of shows){const f=SHOWS[sh.name];if(!f)continue;const k=Math.min(1,(now-sh.t0)/sh.dur),loop=sh.o.loop?((now-sh.t0)%sh.o.loop)/sh.o.loop:k;
    for(const l of def.lamps){const v=f(l,loop,now-sh.t0,sh.o,c);if(v>(+L[l.id]||0))L[l.id]=v;}}return L;},
  attract(t){const L={},name=ATTRACT[Math.floor(t/2.6)%ATTRACT.length],k=(t%2.6)/2.6;for(const l of def.lamps)L[l.id]=SHOWS[name](l,k,t,{},c);return L;},
  SHOWS,
 };
}
Object.assign(exports,{createLights,LIGHT_SHOWS:Object.keys(SHOWS)});
