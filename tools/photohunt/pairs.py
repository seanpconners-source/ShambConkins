# Photo Hunt pairs: source photo, cleanup and five hand-placed differences each.
# Edit coordinates are pixels on the cleaned base (longest side 1200px). Run tools/photohunt/make.py.
from phlib import *

from phlib import *
def p00(i):
  return [mirror(i,545,752,30,30),               # 80 tag mirrored
   mirror(i,232,872,150,125,feather=.15),         # NPC logo mirrored
   remove(i,905,625,52,40,(0,-95),rect=True),     # light panel gone
   recolor(i,342,672,20,26,hue=45,setsat=.5,sel=(0,360,0,.55)), # wrist band turns gold
   vfill(i,840,980,26,52)]                        # gap in the top light bar
def p01(i):
  return [recolor(i,757,245,24,38,hue=135,sel=(250,345,.15)),  # red truck door -> green
   recolor(i,1052,170,18,14,hue=215,sat=1.4,sel=(260,30,.1)),        # roof light -> blue
   remove(i,952,330,30,16,(-70,0)),                            # paper on grass
   recolor(i,845,158,58,30,hue=52,setsat=.45),                 # white van -> yellow
   remove(i,1172,435,32,62,(0,115))]                            # white fence bit
def p02(i):
  return [swap(i,(718,327),(772,326),28,36,rect=True,feather=.08),  # 69 -> 96
   recolor(i,945,295,65,40,shift=-45,sel=(35,75,.3)),               # yellow 100 -> orange
   mirror(i,567,380,50,18,flipx=True,flipy=True,rect=True,feather=.06), # calculator reads upside down
   inpaint(i,97,147,19,16,rad=5),                       # chalk heart gone
   recolor(i,905,630,62,24,hue=210,sel=(0,40,.35))]               # orange abacus beads -> green
def p03(i):
  return [remove(i,401,165,19,17,(-34,6)),       # cap badge -> blue
   inpaint_line(i,[(832,966),(860,940),(889,912)],th=15),                                 # pan handle gone
   recolor(i,712,322,52,40,hue=0,setsat=.75,vmax=.62),             # third cap turns red
   recolor(i,965,318,25,15,shift=200,sel=(330,40,.25)),               # name patch -> blue
   recolor(i,626,1015,16,20,shift=200,sel=(300,40,.15))]              # tongue -> blue
def p04(i):
  return [recolor(i,140,232,58,52,hue=220,sel=(330,25,.3)),        # left red cup -> blue
   mirror(i,362,135,64,72),                                         # Frosted Flakes box mirrored
   recolor(i,1022,505,62,52,hue=320,sel=(30,75,.3)),                 # rubber duck -> pink
   recolor(i,488,370,78,122,hue=25,sel=(75,170,.25)),               # green goggles & snorkel -> orange
   remove(i,898,337,50,50,(0,108))]                                 # right red cup gone
def p05(i):
  return [recolor(i,648,872,16,22,hue=215,sel=(0,45,.25)),          # collar tag -> blue
   remove(i,152,1010,30,28,(0,-70)),                                # flower gone
   recolor(i,736,1000,28,26,hue=290,sel=(35,75,.3)),                # yellow flower -> purple
   remove(i,728,62,30,80,(50,0)),                                   # tree trunk gone
   remove(i,690,520,22,15,(-5,-38))]                                # tan eyebrow gone
def p06(i):
  return [recolor(i,455,280,125,40,hue=200,sat=1.2,vmax=.5,sel=(320,40,.2)), # red lenses -> blue
   remove(i,787,532,18,17,(-30,16)),                                 # turtle eye gone
   recolor(i,180,452,60,19,hue=0,setsat=.65),                       # mic turns red
   mirror(i,1150,383,52,24),                                         # visor logo mirrored
   mirror(i,332,918,58,60)]                                         # C on shirt mirrored
def p07(i):
  return [recolor(i,402,108,32,42,hue=330,sel=(170,270,.25)),       # party hat recoloured
   recolor(i,712,336,46,18,shift=120,sel=(330,40,.35)),              # plaid bow tie -> green
   remove(i,1140,153,62,10,(0,32),rect=True),                       # second subtitle line gone
   mirror(i,900,385,38,38,rect=True),                               # Now Playing cover mirrored
   remove(i,925,318,26,14,(-80,0))]                                 # remote gone
def p08(i):
  return [mirror(i,295,515,34,30,flipx=False,flipy=True,rect=True), # M becomes W
   mirror(i,575,300,40,45,rect=True),                               # portrait mirrored
   recolor(i,775,412,40,14,sat=0),                                  # gold necklace -> silver
   recolor(i,105,270,48,55,hue=330,setsat=.45,sel=(0,360,0,.45)),   # straws turn pink
   recolor(i,520,818,40,30,hue=55,sel=(300,20,.25))]                # skirt flower -> yellow
def p09(i):
  return [mirror(i,707,737,16,10,rect=True,feather=.1),             # table number mirrored
   mirror(i,500,272,40,32),                                         # calligraphy mirrored
   recolor(i,575,640,26,48,hue=22,sat=1.1,val=.3,sel=(25,65,.25)),         # lager -> stout
   remove(i,693,32,20,14,(55,0)),                                   # ceiling light gone
   remove(i,535,127,16,20,(-45,0))]                                 # spotlight gone
def p10(i):
  return [mirror(i,860,175,26,30),                                  # flag mirrored
   remove(i,725,78,36,28,(-112,0),rect=True,feather=.2),            # upstairs window gone
   recolor(i,777,590,25,18,hue=0,sel=(190,260,.25)),                # blue crate -> red
   recolor(i,805,712,52,32,hue=330,sel=(25,65,.3)),                 # flowers -> pink
   mirror(i,185,530,58,38,rect=True,feather=.15)]                   # shed mirrored
def p11(i):
  return [recolor(i,830,300,58,28,shift=120,sel=(0,360,.2,.35)),    # FUNK neon recoloured
   recolor(i,105,185,26,11,shift=140,sel=(0,360,.25),feather=.2),              # skeleton glasses recoloured
   mirror(i,285,410,72,72),                                         # disco ball mirrored
   mirror(i,392,612,45,55,rect=True),                               # LOTR box mirrored
   recolor(i,868,705,60,40,hue=140,sel=(280,360,.2))]               # pink handcuffs -> green
def p12(i):
  return [recolor(i,640,575,52,24,hue=210,sel=(55,175,.15)),        # 100 note -> blue
   mirror(i,145,618,45,22,rect=True),                               # EMPIRE text mirrored
   mirror(i,310,568,40,14,rect=True),                               # BATMAN mirrored
   recolor(i,835,230,85,85,hue=215,sel=(335,25,.35)),               # roses -> blue
   recolor(i,630,300,32,62,sat=.12)]                                # copper tower -> chrome
def p13(i):
  return [recolor(i,540,425,90,48,hue=220,sel=(330,25,.3)),         # red hat -> blue
   recolor(i,790,490,30,40,hue=215,sel=(35,75,.3)),                # yellow shoulder tassel -> blue
   recolor(i,343,250,45,30,hue=0,setsat=.7,sel=(0,360,0,.3)),       # grey cap -> red
   recolor(i,880,1060,75,45,hue=120,sel=(330,25,.3)),               # right sneaker -> green
   recolor(i,808,233,46,26,val=.15,sel=(0,360,0,.55))]               # white shades -> black

# id, title, source, cleanup (crop l,t,r,b in source px; star=paint out the Gemini sparkle; dn=denoise), edits
PAIRS=[
 ('npc-stage','NPC Stage Pose','NPC Colorado',dict(crop=(3,14,3,3),dn=6),p00),
 ('fairground-puppy','Fairground Puppy','Sean & Amber',dict(crop=(3,3,3,10),dn=7),p01),
 ('thot-that-counts','The THOT That Counts','Sean & Amber',dict(crop=(3,3,3,3)),p02),
 ('oil-change-dog','Oil Change Dog','Sean & Amber',dict(crop=(3,4,3,32),star=1),p03),
 ('underwater-party','Underwater Party','Sean & Amber',dict(crop=(3,3,3,3)),p04),
 ('buttercup-dogs','KC & Mylo in the Buttercups','Sean & Amber',dict(crop=(3,3,3,3)),p05),
 ('red-rocker-turtle','The Red Rocker’s Turtle','Sammy Hagar',dict(crop=(3,4,3,333)),p06),
 ('birthday-pups','Birthday Pups','Sean & Amber',dict(crop=(3,4,3,3)),p07),
 ('dry-ice-bar','Dry Ice Cocktail Bar','Sean & Amber',dict(crop=(3,3,3,3)),p08),
 ('izakaya-night','Izakaya Night','Sean & Amber',dict(crop=(3,3,3,6)),p09),
 ('stilt-house','The Stilt House','Sean & Amber',dict(crop=(3,3,3,3)),p10),
 ('funk-er','The FUNK-ER','Sean & Amber',dict(crop=(3,3,222,3)),p11),
 ('collector-shelf','Collector’s Shelf','Star Wars',dict(crop=(3,3,3,3),star=1),p12),
 ('macho-party','Macho Man Party','WWF',dict(crop=(3,105,3,3),dn=6),p13),
]
