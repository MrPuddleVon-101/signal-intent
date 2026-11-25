"""Registered portrait layers, kept on black with a matte, so the room behind can be drawn live and never shows an edge.
Portrait: Jeff Sainlar, Meta, CC BY-SA 4.0 (Wikimedia Commons). Glasses: traced from a product photograph. The result is a composite."""
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageEnhance
import numpy as np, os
from collections import deque
S='source-images/';O='public/img/real/';T='./.preview/'
os.makedirs(T,exist_ok=True)
full=Image.open(S+'web/portrait.jpg').convert('RGB')           # 3840 x 5286
BOX=(0,470,3840,4250);W=2000;K=W/3840;H=round((BOX[3]-BOX[1])*K)
src=full.crop(BOX).resize((W,H),Image.LANCZOS);f=np.asarray(src).astype(float)/255
# matte: lift the shadows, flood the wall from the edges
w,h=W//2,H//2;sm=np.asarray(src.resize((w,h),Image.LANCZOS).filter(ImageFilter.GaussianBlur(2.2))).astype(float)/255
lift=sm.mean(2)**.35;wall=lift<.315
seen=np.zeros((h,w),bool);q=deque([(0,x) for x in range(w)]+[(y,x) for y in range(int(h*.97)) for x in (0,w-1)])
q=deque([p for p in q if wall[p]])
for p in q: seen[p]=True
while q:
    y,x=q.popleft()
    for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
        Y,X=y+dy,x+dx
        if 0<=Y<h and 0<=X<w and not seen[Y,X] and wall[Y,X]: seen[Y,X]=True;q.append((Y,X))
solid=Image.fromarray((~seen*255).astype('uint8')).filter(ImageFilter.MedianFilter(7))
m=np.asarray(solid.resize((W,H),Image.BICUBIC).filter(ImageFilter.GaussianBlur(2))).astype(float)/255
near=np.asarray(solid.filter(ImageFilter.MaxFilter(21)).resize((W,H),Image.BICUBIC).filter(ImageFilter.GaussianBlur(10))).astype(float)/255
strand=np.clip((f.mean(2)-.035)/.16,0,1)*near          # single hairs catch the light
# hair: no outline, the strands themselves decide. body: one clean traced edge.
core=np.asarray(solid.filter(ImageFilter.MinFilter(21)).filter(ImageFilter.MinFilter(9)).resize((W,H),Image.BICUBIC).filter(ImageFilter.GaussianBlur(9))).astype(float)/255
lum=np.asarray(src.filter(ImageFilter.GaussianBlur(1.1))).astype(float).mean(2)/255
hair=np.clip((lum-.016)/.075,0,1)*near;hair=hair*hair*(3-2*hair)
skin_=np.asarray(solid.filter(ImageFilter.MinFilter(9)).resize((W,H),Image.BICUBIC).filter(ImageFilter.GaussianBlur(2.4))).astype(float)/255
z=np.clip((np.arange(H)[:,None]-720)/60,0,1);head=np.maximum(core,hair)*(1-z)+np.maximum(core,skin_)*z
L=[(352,690),(330,699),(290,708),(255,719),(215,735),(180,750),(145,770),(112,797),(92,830),(76,872),(62,920),(50,962),(34,1040),(14,1130),(8,1200)];R=[(888,1200),(884,1130),(872,1040),(862,975),(848,915),(834,865),(826,830),(806,797),(778,770),(745,750),(708,733),(672,719),(640,708),(612,698),(590,690)]
sc_=W/960;of=-BOX[1]*K
def sp(P,n=12):
    P=[P[0]]+P+[P[-1]];o=[]
    for i in range(1,len(P)-2):
        a_,b_,c_,d_=map(np.array,P[i-1:i+3])
        for k in range(n):
            t=k/n;o.append(tuple(.5*((2*b_)+(c_-a_)*t+(2*a_-5*b_+4*c_-d_)*t*t+(-a_+3*b_-3*c_+d_)*t**3)))
    return o+[P[-1]]
pl=[(x*sc_,y*sc_+of) for x,y in sp(L)]+[(x*sc_,y*sc_+of) for x,y in sp(R)]
bi=Image.new('L',(W,H),0);ImageDraw.Draw(bi).polygon(pl,fill=255);body=np.asarray(bi.filter(ImageFilter.GaussianBlur(2.2))).astype(float)/255
yy0=np.arange(H)[:,None];neck=np.clip((yy0-(655*sc_+of))/(40*sc_),0,1)
m=np.clip(np.maximum(head*(1-neck)+head*neck*(np.abs(np.arange(W)-W*.485)[None,:]<250),body),0,1)
keep=np.maximum(m,strand*(1-neck))[...,None]
Image.fromarray((m*255).astype('uint8')).save(O+'rev_m.webp',quality=92)
base=np.clip(f-.006,0,1)*keep
gray=np.asarray(ImageOps.grayscale(Image.fromarray((base*255).astype('uint8')))).astype(float)[...,None]/255
A=np.clip(gray*1.12,0,1)**.94
Image.fromarray((np.repeat(A,3,2)*255).astype('uint8')).save(O+'rev_a.webp',quality=93,method=6)
# glasses: front of the frame only, traced from the product photograph
gl=Image.open(S+'6.webp').convert('RGB').crop((300,250,1750,1000));GW,GH=gl.size;Z=2
out=[(60,122),(110,104),(200,88),(300,77),(420,71),(520,76),(590,90),(650,107),(700,108),(765,105),(830,87),(920,77),(1000,74),(1100,80),(1200,95),(1290,112),(1338,122),(1347,150),(1352,250),(1330,254),(1302,256),(1285,288),(1262,340),(1238,402),(1213,450),(1185,480),(1140,494),(1060,496),(960,488),(900,468),(850,435),(815,395),(790,350),(772,300),(757,255),(744,234),(700,224),(674,231),(658,262),(645,310),(620,370),(585,425),(545,462),(480,482),(400,492),(300,492),(250,486),(207,460),(185,428),(165,380),(145,330),(127,282),(110,262),(85,252),(56,258),(48,236),(52,180)]
l1=[(196,184),(225,158),(300,146),(420,141),(520,153),(580,168),(600,188),(598,222),(578,300),(548,360),(498,413),(438,436),(340,444),(262,433),(228,405),(208,360),(193,290),(188,230)]
l2=[(810,192),(832,168),(880,154),(980,149),(1080,153),(1160,166),(1203,190),(1218,230),(1213,290),(1193,358),(1163,418),(1120,437),(1030,443),(942,428),(892,398),(857,348),(828,290),(812,240)]
def smooth(p,n=24):   # closed Catmull-Rom
    P=np.array(p,float);r=[]
    for i in range(len(P)):
        a,b_,c,d=P[i-1],P[i],P[(i+1)%len(P)],P[(i+2)%len(P)]
        for k in range(n):
            t=k/n;r.append(tuple(.5*((2*b_)+(c-a)*t+(2*a-5*b_+4*c-d)*t*t+(-a+3*b_-3*c+d)*t**3)))
    return r
def poly(p,blur): i=Image.new('L',(GW*Z,GH*Z),0);ImageDraw.Draw(i).polygon([(x*Z,y*Z) for x,y in smooth(p)],fill=255);return np.asarray(i.resize((GW,GH),Image.LANCZOS).filter(ImageFilter.GaussianBlur(blur))).astype(float)/255
mo,ml=poly(out,1.2),np.maximum(poly(l1,1.6),poly(l2,1.6))
G=np.asarray(gl).astype(float)/255
lens=np.zeros((GH,GW,4));yy2,xx2=np.indices((GH,GW))
sheen=np.clip(1-np.abs((xx2*.62+yy2)-520)/90,0,1)*.16+np.clip(1-np.abs((xx2*.62+yy2)-1010)/80,0,1)*.14
a=mo*(1-ml)+ml*.27
rgb=np.where(ml[...,None]>.5,np.array([.05,.07,.10])+sheen[...,None]*2.2,np.clip((G*.25+G.mean(2,keepdims=True)*.75-.02)*1.2,0,1))
a=a+ml*sheen*.9
ov=Image.fromarray((np.dstack([np.clip(rgb,0,1),np.clip(a,0,1)])*255).astype('uint8'),'RGBA')
sh=Image.fromarray((np.dstack([np.zeros((GH,GW,3)),mo*(1-ml)])*255).astype('uint8'),'RGBA')
# pupils measured on the full frame
def fp(x,y): return ((1250+x/.8-BOX[0])*K,(1200+y/.8-BOX[1])*K)
e1,e2=fp(398,476),fp(755,490);ang=-np.degrees(np.arctan2(e2[1]-e1[1],e2[0]-e1[0]));cx,cy=(e1[0]+e2[0])/2,(e1[1]+e2[1])/2+9
sc=(e2[0]-e1[0])/620*1.03
def place(im,dy=0,blur=0):
    c=Image.new('RGBA',(W,H),(0,0,0,0));r=im.resize((int(GW*sc),int(GH*sc)),Image.LANCZOS)
    c.paste(r,(int(cx-703*sc),int(cy-290*sc+dy)),r);c=c.rotate(ang,Image.BICUBIC,center=(cx,cy))
    return c.filter(ImageFilter.GaussianBlur(blur)) if blur else c
B=Image.fromarray((np.clip(base*1.06,0,1)**.96*255).astype('uint8')).convert('RGBA')
s=place(sh,16,11);s.putalpha(s.getchannel('A').point(lambda v:int(v*.5)));B.alpha_composite(s);B.alpha_composite(place(ov))
Bn=B.convert('RGB');Bn.save(O+'rev_b.webp',quality=93,method=6)
# the print: 4 by 5, the same blue room baked in (see wb in reveal.ts)
Z=.97;pw=int(H*.8);x0=(W-pw)//2;yy,xx=np.indices((H,pw));gx=((xx+.5)/H-.4)*Z;gy=(1-(yy+.5)/H)*Z-.64
gd=np.clip(1-np.hypot(gx/.95/.8,gy/.85),0,1)[...,None];back=np.array([.035,.075,.36])+gd*np.array([.08,.16,.62])
P=np.asarray(Bn).astype(float)[:,x0:x0+pw]/255;mm=m[:,x0:x0+pw,None]
lin=lambda v:np.clip(v,0,1)**2.2
P=(np.clip(lin(P)+lin(back)*(1-mm),0,1))**(1/2.2)
Image.fromarray((P*255).astype('uint8')).resize((1360,1700),Image.LANCZOS).save(O+'rev_p.webp',quality=92,method=6)
print('aspect',W/H,W,H,'eyes',e1,e2)
o=Image.new('RGB',(W+pw,H));o.paste(Image.open(O+'rev_a.webp'),(0,0));o.paste(Image.fromarray((P*255).astype('uint8')),(W,0));o.resize(((W+pw)//2,H//2)).save(T+'rev.png')
Bn.crop((int(cx-420),int(cy-420),int(cx+420),int(cy+420))).save(T+'revc.png')
