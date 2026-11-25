"""Web sizes for the gallery. Sources and licences are in PHOTO-CREDITS.md. Nothing is enlarged."""
from PIL import Image
import os
S='source-images/web/';O='public/img/real/'
for n,w in (('col_0',2048),('col_1',2364),('col_2',2048),('col_3',2048),('col_5',2048),('col_7',2048),('col_8',2048),('col_9',2048),('col_10',2048),('col_11',2048),('col_12',2048),('hero',2364)):
    a=Image.open(S+n+'.jpg').convert('RGB')
    if a.width>w:a=a.resize((w,round(a.height*w/a.width)),Image.LANCZOS)
    a.save(O+n+'.webp',quality=88,method=6)
a=Image.open(S+'semg.jpg').convert('RGB');w,h=a.size;c=round(h*.8);x=round(w*.5-c/2)   # 4 by 5 print
import numpy as np
from PIL import ImageFilter
a=a.crop((x,0,x+c,h)).resize((1640,2050),Image.LANCZOS).filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.UnsharpMask(2,60,4));v=np.asarray(a).astype(float)/255;a=Image.fromarray((np.clip((v-.075)/.925,0,1)*255).astype('uint8'))
a.save(O+'semg.webp',quality=90,method=6)
a=Image.open('source-images/5.webp').convert('RGB');a.save(O+'demo.webp',quality=92)
