// Star Fox-style comm box for boss fights (ROADMAP K21): the speaker's head in a static-fuzzed screen, their name and
// the line typed out letter by letter with a blip "voice". Messages queue and play one after another. Drawn in arena
// units, bottom-left above the hearts. createComms({blip,headFor}): blip(pitch) makes one voice syllable; headFor(sp)
// returns a canvas for the speaker's head (or null: the emoji/initial is drawn instead).
// A speaker is {name, col, pitch, id?, emoji?}.
const CPS=42,OPEN=.16,TAU=Math.PI*2;
function createComms({blip,headFor}){
 const q=[];let cur=null;
 const total=m=>OPEN+m.text.length/CPS+m.hold;
 // quiet: drop it if something is already playing (chatter); returns the queued message or null
 function say(sp,text,{hold=1.1,quiet=false}={}){if(!text)return null;if(quiet&&(cur||q.length))return null;const m={sp,text,hold,t:0,typed:0};q.push(m);return m;}
 function update(dt){if(!cur&&q.length){cur=q.shift();cur.t=0;}if(!cur)return;cur.t+=dt;
  const n=Math.min(cur.text.length,Math.floor(Math.max(0,cur.t-OPEN)*CPS));for(let i=cur.typed;i<n;i++)if(i%2===0&&/[a-z0-9]/i.test(cur.text[i]))blip(cur.sp.pitch*(.9+Math.random()*.25));cur.typed=Math.max(cur.typed,n);
  if(cur.t>total(cur)+OPEN)cur=null;}
 // a tap finishes the typing, a second tap closes the box
 function skip(){if(!cur)return false;const typedAll=OPEN+cur.text.length/CPS;if(cur.t<typedAll)cur.t=typedAll;else cur.t=total(cur);return true;}
 const busy=()=>!!cur||q.length>0;
 function clear(){q.length=0;cur=null;}
 function wrap(g,str,maxW){const words=str.split(' '),lines=[];let line='';for(const w of words){const t=line?line+' '+w:w;if(g.measureText(t).width>maxW&&line){lines.push(line);line=w;}else line=t;}if(line)lines.push(line);return lines;}
 function draw(g,W,H,T){if(!cur)return;const m=cur,end=total(m),open=Math.min(1,m.t/OPEN,Math.max(0,(end+OPEN-m.t)/OPEN));if(open<=0)return;
  const bw=Math.min(W-24,360),bh=68,x0=12,y0=H-150,sp=m.sp;g.save();g.translate(x0,y0+bh/2);g.scale(1,open);g.translate(0,-bh/2);
  // frame
  g.fillStyle='rgba(6,10,22,.86)';g.strokeStyle=sp.col;g.lineWidth=2.5;g.beginPath();g.rect(0,0,bw,bh);g.fill();g.stroke();
  g.fillStyle=sp.col;g.fillRect(0,0,bw,3);
  // portrait screen with the head, scanlines and static
  const px=7,py=7,ps=bh-14;g.save();g.beginPath();g.rect(px,py,ps,ps);g.clip();g.fillStyle='#0d1a2a';g.fillRect(px,py,ps,ps);
  const talking=m.typed<m.text.length,bob=talking?Math.sin(m.t*26)*1.6:0,img=headFor(sp);
  if(img)g.drawImage(img,px-4,py-2+bob,ps+8,ps+8);else{g.font=`${ps*.6}px "Segoe UI Emoji","Apple Color Emoji",Arial`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText(sp.emoji||sp.name[0],px+ps/2,py+ps/2+bob);}
  g.globalAlpha=.18;g.fillStyle='#000';for(let yy=py;yy<py+ps;yy+=3)g.fillRect(px,yy,ps,1);
  g.globalAlpha=.25;for(let i=0;i<10;i++){g.fillStyle=Math.random()<.5?'#fff':'#7fb8ff';g.fillRect(px+Math.random()*ps,py+Math.random()*ps,Math.random()*10+2,1);}
  g.restore();g.strokeStyle='#9fc7ff';g.globalAlpha=.6;g.lineWidth=1.5;g.strokeRect(px,py,ps,ps);g.globalAlpha=1;
  // name and the typed line
  const tx=px+ps+10,tw=bw-tx-8;g.textAlign='left';g.textBaseline='top';g.font='900 11px "Arial Black",Arial';g.fillStyle=sp.col;g.fillText(sp.name.toUpperCase(),tx,8);
  g.font='bold 12.5px Arial,sans-serif';g.fillStyle='#fff';const lines=wrap(g,m.text.slice(0,m.typed),tw).slice(0,3);lines.forEach((l,i)=>g.fillText(l,tx,24+i*14.5));
  if(!talking&&Math.floor(T*3)%2===0){g.fillStyle=sp.col;g.beginPath();g.moveTo(bw-14,bh-12);g.lineTo(bw-6,bh-12);g.lineTo(bw-10,bh-6);g.fill();}
  g.restore();}
 return {say,update,skip,busy,clear,draw};
}
Object.assign(exports,{createComms});
