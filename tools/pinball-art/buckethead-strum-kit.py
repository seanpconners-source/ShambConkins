# Builds docs/pinball-art/buckethead/gpt-strum/ (the GPT kit for "elbow on the flipper pivot, forearm + hand = the flipper").
# Usage: python3 tools/pinball-art/buckethead-strum-kit.py docs/pinball-art/buckethead/gpt-strum
import math, sys
from PIL import Image, ImageDraw, ImageFont
R='assets/originals/pinball/buckethead/'; D=sys.argv[1]
F=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
bh=Image.open(R+'gpt-02-buckethead-new-pose.webp').convert('RGBA'); bh.save(D+'/upload-1-buckethead-now.png')
Image.open(R+'gpt-03-left-flipper-picking-hand.webp').convert('RGBA').save(D+'/upload-3-hand-style.png')
E=(190,756)   # new elbow (= the left flipper's pivot)
# --- guide: what to change on picture 1
g=Image.new('RGBA',bh.size,(70,70,80,255)); g.alpha_composite(bh); ov=Image.new('RGBA',bh.size,(0,0,0,0)); d=ImageDraw.Draw(ov)
old=[(232,700),(330,690),(345,780),(410,800),(425,880),(410,950),(330,955),(290,900),(240,860)]
d.polygon(old,fill=(255,30,30,110),outline=(255,40,40,255))
for i in range(-1200,1200,22):d.line([(i,0),(i+1024,1024)],fill=(255,40,40,60),width=3)
g2=Image.new('RGBA',bh.size,(0,0,0,0));m=Image.new('L',bh.size,0);ImageDraw.Draw(m).polygon(old,fill=255);g2.paste(ov,(0,0),m);g.alpha_composite(g2)
d=ImageDraw.Draw(g)
d.line([(285,430),(250,560),(215,670),(E[0]+4,E[1]-20)],fill=(255,220,40,255),width=5,joint='curve')
d.ellipse([E[0]-26,E[1]-26,E[0]+26,E[1]+26],outline=(255,220,40,255),width=7)
d.text((40,790),"ELBOW",fill=(255,220,40,255),font=F(30));d.text((40,826),"sleeve ends here",fill=(255,220,40,255),font=F(22))
d.text((440,950),"REMOVE the hand\nand lower sleeve",fill=(255,90,90,255),font=F(24))
g.convert('RGB').save(D+'/upload-2-arm-guide.png')
# --- forearm + hand layout sketch (1536 x 1024)
s=Image.new('RGB',(1536,1024),'#1c1c24');d=ImageDraw.Draw(s);cy=512
sleeve=[(70,cy-200),(860,cy-125),(860,cy+125),(70,cy+200)]
d.polygon(sleeve,outline='#bbbbbb',width=5);d.pieslice([0,cy-200,140,cy+200],90,270,outline='#bbbbbb',width=5)
hand=[(860,cy-110),(1180,cy-95),(1360,cy-60),(1380,cy+40),(1180,cy+90),(860,cy+110)]
d.polygon(hand,outline='#bbbbbb',width=5);d.polygon([(1360,cy-40),(1470,cy),(1360,cy+45)],outline='#ffd23f',width=5)
d.text((200,cy-20),"BLACK ROBE SLEEVE (forearm inside)",fill='#bbbbbb',font=F(30));d.text((960,cy-18),"HAND",fill='#bbbbbb',font=F(30));d.text((1370,cy+70),"PICK",fill='#ffd23f',font=F(26))
d.text((40,cy+230),"ELBOW (left edge)",fill='#bbbbbb',font=F(26));d.text((820,cy+150),"WRIST",fill='#bbbbbb',font=F(26))
s.save(D+'/upload-4-forearm-sketch.png')
# --- preview for the owner: where the pick sweeps (flipper rest 30°, up -28°, pick 320 px from the elbow in this picture)
p=Image.new('RGBA',bh.size,(70,70,80,255));p.alpha_composite(bh);d=ImageDraw.Draw(p)
pts=[(E[0]+math.cos(math.radians(a))*320,E[1]+math.sin(math.radians(a))*320) for a in range(-28,31,2)]
d.line(pts,fill=(0,255,255,255),width=6)
for a,c in ((30,(255,255,255,200)),(-28,(255,220,40,255))):d.line([E,(E[0]+math.cos(math.radians(a))*320,E[1]+math.sin(math.radians(a))*320)],fill=c,width=4)
d.ellipse([E[0]-14,E[1]-14,E[0]+14,E[1]+14],fill=(255,220,40,255))
d.text((24,940),"yellow dot = elbow = flipper pivot   white = flipper down\nyellow = flipper up   cyan = where the pick travels (across the strings)",fill="white",font=F(20))
p.convert('RGB').save(D+'/preview-pick-path.png')
