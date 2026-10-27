// Online co-op platformers (Sonic, Mario, Broforce, Castlevania): each phone follows its own player, so when the partner
// is off this phone's screen a bubble with their head sits on the screen edge and an arrow points the way to them.
// view = {x,y,w,h} in canvas pixels; (px,py) = the partner's position in the same pixels. Returns true when drawn.
const {outlined}=require("src/engines/arenaKit.js");
function partnerArrow(s,x,view,px,py,{player=null,color='#fff',label='',size=18,margin=8,top=0}={}){
 const vx=view.x,vy=view.y+top,w=view.w,h=view.h-top;
 if(!Number.isFinite(px)||!Number.isFinite(py)||px>=vx&&px<=vx+w&&py>=vy&&py<=vy+h)return false;
 const r=size,m=r+margin+10,cx=vx+w/2,cy=vy+h/2,dx=px-cx,dy=py-cy;
 const k=Math.min((w/2-m)/Math.max(1e-6,Math.abs(dx)),(h/2-m)/Math.max(1e-6,Math.abs(dy)));
 const ax=cx+dx*k,ay=cy+dy*k,a=Math.atan2(dy,dx),pulse=1+.08*Math.sin(performance.now()/160);
 x.save();x.translate(ax,ay);
 x.save();x.rotate(a);x.fillStyle=color;x.strokeStyle='rgba(8,10,30,.85)';x.lineWidth=2;x.beginPath();x.moveTo(r+12*pulse,0);x.lineTo(r-2,-9);x.lineTo(r-2,9);x.closePath();x.fill();x.stroke();x.restore();
 x.fillStyle='rgba(8,10,30,.72)';x.beginPath();x.arc(0,0,r,0,7);x.fill();x.lineWidth=3;x.strokeStyle=color;x.stroke();
 if(player!=null&&s?.sprite){x.save();x.beginPath();x.arc(0,0,r-2,0,7);x.clip();s.sprite(x,player,0,1,r*1.75,{exact:true,noBadge:true});x.restore();}
 if(label)outlined(x,label,0,r+9,{size:Math.max(9,Math.round(r*.55)),fill:color,stroke:'#08103a'});
 x.restore();return true;
}
Object.assign(exports,{partnerArrow});
