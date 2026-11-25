"""Builds the conceptual band in metal and renders the film. Run:
/Applications/Blender.app/Contents/MacOS/Blender -b -P band.py -- <start> <end> <step> <width> <samples> <outdir>
Conceptual layers only: no invented circuitry, no claimed contact count or product geometry."""
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix
A=sys.argv[sys.argv.index('--')+1:]
F0,F1,STEP,W,SPP,OUT=int(A[0]),int(A[1]),int(A[2]),int(A[3]),int(A[4]),A[5]
bpy.ops.wm.read_factory_settings(use_empty=True)
S=bpy.context.scene
RY,RZ=.64,.49
def E(a,o=0):
    y,z=math.cos(a)*RY,math.sin(a)*RZ;ny,nz=math.cos(a)*RZ,math.sin(a)*RY;l=math.hypot(ny,nz);return Vector((0,y+ny/l*o,z+nz/l*o)),Vector((0,ny/l,nz/l))
# ---------- materials
def mat(n,col,metal=0,rough=.4,**k):
    m=bpy.data.materials.new(n);m.use_nodes=True;b=m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*col,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough
    for q,v in k.items():
        if q in b.inputs:b.inputs[q].default_value=v
    return m
def add(m,t,**k):
    n=m.node_tree.nodes.new(t)
    for q,v in k.items():setattr(n,q,v)
    return n
def brushed(m,scale=(2,160,160),strength=.09,vary=.12):
    nt=m.node_tree;b=nt.nodes['Principled BSDF'];tc=add(m,'ShaderNodeTexCoord');mp=add(m,'ShaderNodeMapping');mp.inputs['Scale'].default_value=scale
    nz=add(m,'ShaderNodeTexNoise');nz.inputs['Scale'].default_value=6;nz.inputs['Detail'].default_value=6
    nt.links.new(tc.outputs['Object'],mp.inputs['Vector']);nt.links.new(mp.outputs['Vector'],nz.inputs['Vector'])
    bp=add(m,'ShaderNodeBump');bp.inputs['Strength'].default_value=strength;bp.inputs['Distance'].default_value=.004
    f=nz.outputs[0];nt.links.new(f,bp.inputs['Height']);nt.links.new(bp.outputs['Normal'],b.inputs['Normal'])
    r=b.inputs['Roughness'].default_value;mr=add(m,'ShaderNodeMapRange');mr.inputs['To Min'].default_value=max(.04,r-vary);mr.inputs['To Max'].default_value=r+vary;nt.links.new(f,mr.inputs['Value']);nt.links.new(mr.outputs[0],b.inputs['Roughness'])
    return m
ti=brushed(mat('titanium',(.62,.61,.60),1,.27,**{'Anisotropic':.6}))
tid=brushed(mat('titanium dark',(.13,.135,.145),1,.3,**{'Anisotropic':.5}))
pol=mat('polished',(.86,.87,.88),1,.07)
gold=brushed(mat('gold',(.83,.55,.26),1,.2),vary=.06,strength=.04)
cer=mat('ceramic',(.012,.012,.014),0,.16,**{'Coat Weight':1.0,'Coat Roughness':.06})
glass=mat('core',(.01,.012,.02),.2,.06,**{'Coat Weight':1.0,'Coat Roughness':.03})
film=mat('film',(.02,.021,.025),.4,.28,**{'Coat Weight':.6,'Coat Roughness':.1})
# woven textile: two sine families give an over-under weave, as bump and tint
cloth=mat('cloth',(.06,.06,.066),0,.75,**{'Sheen Weight':.7,'Sheen Roughness':.4})
nt=cloth.node_tree;b=nt.nodes['Principled BSDF'];uv=add(cloth,'ShaderNodeUVMap');sep=add(cloth,'ShaderNodeSeparateXYZ');nt.links.new(uv.outputs[0],sep.inputs[0])
def math_(op,a,bv=None):
    n=add(cloth,'ShaderNodeMath',operation=op)
    for i,v in enumerate((a,bv)):
        if v is None:continue
        if isinstance(v,(int,float)):n.inputs[i].default_value=v
        else:nt.links.new(v,n.inputs[i])
    return n.outputs[0]
u=math_('MULTIPLY',sep.outputs[0],math.pi*150);v=math_('MULTIPLY',sep.outputs[1],math.pi*52)
warp=math_('MULTIPLY',math_('ABSOLUTE',math_('SINE',u)),math_('ADD',math_('MULTIPLY',math_('SINE',math_('ADD',v,math_('MULTIPLY',u,.5))),.5),.5))
weft=math_('MULTIPLY',math_('ABSOLUTE',math_('SINE',v)),math_('ADD',math_('MULTIPLY',math_('SINE',math_('ADD',math_('SUBTRACT',u,math_('MULTIPLY',v,.5)),1.57)),.5),.5))
hgt=math_('MAXIMUM',warp,weft);bp=add(cloth,'ShaderNodeBump');bp.inputs['Strength'].default_value=.95;bp.inputs['Distance'].default_value=.012
nt.links.new(hgt,bp.inputs['Height']);nt.links.new(bp.outputs['Normal'],b.inputs['Normal'])
mx=add(cloth,'ShaderNodeMapRange');mx.inputs['To Min'].default_value=.012;mx.inputs['To Max'].default_value=.13;nt.links.new(hgt,mx.inputs['Value'])
cb=add(cloth,'ShaderNodeCombineColor')
for i in range(3):nt.links.new(mx.outputs[0],cb.inputs[i])
nt.links.new(cb.outputs[0],b.inputs['Base Color'])
# ---------- geometry
def empty(n):
    o=bpy.data.objects.new(n,None);S.collection.objects.link(o);return o
L={n:empty(n) for n in('sleeve','frame','flex','contacts','lid','core','base')}
def obj(n,me,m,par):
    o=bpy.data.objects.new(n,me);S.collection.objects.link(o);o.data.materials.append(m);o.parent=par
    for p in me.polygons:p.use_smooth=True
    return o
def ring(n,w,t,off,x0,m,par,bev=.008,seg=320,crown=None):
    r=min(bev,t/2.05,w/2.05);sec=[]
    for cx,cy,a0 in((w/2-r,t/2-r,0),(-w/2+r,t/2-r,90),(-w/2+r,-t/2+r,180),(w/2-r,-t/2+r,270)):
        for i in range(6):
            a=math.radians(a0+i*18);sec.append((cx+math.cos(a)*r,cy+math.sin(a)*r))
    vs,fs,uvs=[],[],[];M=len(sec)
    for i in range(seg):
        a=2*math.pi*i/seg
        for x,o in sec:
            p,_=E(a,off+o+(crown(a) if crown and o>0 else 0));vs.append((x0+x,p.y,p.z))
    for i in range(seg):
        for j in range(M):fs.append((i*M+j,i*M+(j+1)%M,((i+1)%seg)*M+(j+1)%M,((i+1)%seg)*M+j))
    me=bpy.data.meshes.new(n);me.from_pydata(vs,[],fs);ul=me.uv_layers.new()
    for pi,poly in enumerate(me.polygons):
        i,j=divmod(pi,M);q=[(i,j),(i,j+1),(i+1,j+1),(i+1,j)]
        for k,li in enumerate(poly.loop_indices):
            jj=q[k][1]%M;ul.data[li].uv=(q[k][0]/seg,sec[jj][0]/w+.5 if abs(sec[jj][1])>t/2-r*1.01 else sec[jj][1])
    return obj(n,me,m,par)
def box(n,w,h,d,m,par,bev,loc=(0,0,0),rot=None,seg=5):
    me=bpy.data.meshes.new(n);bm=bmesh.new();bmesh.ops.create_cube(bm,size=1);bmesh.ops.scale(bm,vec=(w,h,d),verts=bm.verts)
    bmesh.ops.bevel(bm,geom=list(bm.edges),offset=bev,segments=seg,profile=.5,affect='EDGES');bm.to_mesh(me);bm.free()
    o=obj(n,me,m,par);o.location=loc
    if rot is not None:o.rotation_mode='QUATERNION';o.rotation_quaternion=rot
    return o
def place(a,off):
    p,n=E(a,off);x=Vector((1,0,0));t=x.cross(n);return p,Matrix((x,n,t)).transposed().to_quaternion()
def capsule(n,r,l,m,par,loc,rot):
    me=bpy.data.meshes.new(n);bm=bmesh.new();bmesh.ops.create_uvsphere(bm,u_segments=40,v_segments=24,radius=r)
    for v in bm.verts:
        v.co=Vector((v.co.z+(l/2 if v.co.z>1e-6 else -l/2 if v.co.z<-1e-6 else 0),v.co.y,v.co.x))
    bm.to_mesh(me);bm.free();o=obj(n,me,m,par);o.location=loc;o.rotation_mode='QUATERNION';o.rotation_quaternion=rot;return o
crown=lambda a:.045*max(0,math.sin(a))**8
ring('cloth',.62,.062,.056,0,cloth,L['sleeve'],.026,420,crown)
for s in(-1,1):ring('rail',.016,.076,.056,s*.318,ti,L['sleeve'],.006,320,crown)
ring('railin',.012,.05,.05,-.296,tid,L['sleeve'],.004)
p,q=place(math.radians(300),.094);box('tag',.15,.012,.026,pol,L['sleeve'],.005,p,q)
# machined ladder frame
for x in(-.25,.25):ring('fr',.05,.04,0,x,ti,L['frame'],.007)
for x in(-.205,.205):ring('fr2',.012,.026,0,x,tid,L['frame'],.004)
for i in range(24):
    p,q=place(2*math.pi*i/24+.13,0);box('rib',.46,.022,.018,ti,L['frame'],.005,p,q,3)
    if i%3==0:
        for x in(-.25,.25):
            pp,qq=place(2*math.pi*i/24+.13,.021);box('screw',.026,.008,.026,pol,L['frame'],.0035,pp+Vector((x,0,0)),qq,3)
# flex: plain film with eight gold pads and two continuous conductors
ring('film',.36,.006,-.022,0,film,L['flex'],.0025)
for x in(-.11,.11):ring('cond',.018,.006,-.028,x,gold,L['flex'],.002)
for c in range(8):
    p,q=place(math.radians(c*45),-.03);box('pad',.3,.008,.085,gold,L['flex'],.0035,p,q,3)
# contacts
for c in range(8):
    a=math.radians(c*45);p,q=place(a,-.052);box('seat',.34,.026,.125,cer,L['contacts'],.012,p,q,5)
    p,q=place(a,-.066);box('bezel',.30,.012,.094,tid,L['contacts'],.0055,p,q,4)
    p,q=place(a,-.076);x=q@Vector((1,0,0))
    for s in(-1,1):capsule('dome',.034,.06,pol,L['contacts'],p+x*s*.072,q)
    box('waist',.05,.05,.06,cer,L['contacts'],.018,p,q,4)
# module
p,q=place(math.radians(90),.118);box('lid',.40,.04,.40,ti,L['lid'],.018,p,q,8);box('lidline',.402,.006,.402,pol,L['lid'],.0028,p-Vector((0,0,.004)),q,3)
p,q=place(math.radians(90),.082);box('corebody',.35,.05,.35,glass,L['core'],.016,p,q,6);box('coreplate',.22,.056,.035,gold,L['core'],.006,p+Vector((0,.11,0)),q,4);box('corerim',.362,.014,.362,tid,L['core'],.005,p,q,4)
p,q=place(math.radians(90),.046);box('base',.40,.034,.40,tid,L['base'],.015,p,q,6)
p,q=place(math.radians(90),.03);box('port',.15,.014,.05,cer,L['base'],.006,p,q,4)
# ---------- animation
def key(o,path,f,v,idx=-1):
    setattr(o,path,v) if idx<0 else getattr(o,path).__setitem__(idx,v);o.keyframe_insert(path,frame=f,index=idx)
R=empty('root')
for e in L.values():e.parent=R
EX={'sleeve':(-1.75,0,0),'frame':(-.72,0,0),'flex':(.12,0,0),'contacts':(.92,0,0),'lid':(1.95,0,.34),'core':(1.95,0,-.05),'base':(1.95,0,-.42)}
D={'sleeve':0,'frame':4,'flex':8,'contacts':12,'lid':2,'core':2,'base':2}
for n,e in L.items():
    k=D[n]
    for f,v in((1,(0,0,0)),(112+k,(0,0,0)),(142+k,EX[n]),(200,EX[n]),(204,EX[n]),(236,(0,0,0)),(240,(0,0,0))):key(e,'location',f,v)
for n in('lid','core','base'):  # bring the module to the axis as it leaves
    z=E(math.radians(90),.08)[0].z
    for f,v in((142+2,EX[n][2]-z),(200,EX[n][2]-z),(204,EX[n][2]-z)):key(L[n],'location',f,v,2)
for f,v in((1,math.radians(200)),(60,math.radians(236)),(112,math.radians(330)),(150,math.radians(348)),(200,math.radians(372)),(240,math.radians(450))):key(R,'rotation_euler',f,v,0)
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam'));S.collection.objects.link(cam);S.camera=cam;cam.data.sensor_width=36;T=empty('target')
tc=cam.constraints.new('TRACK_TO');tc.target=T;tc.track_axis='TRACK_NEGATIVE_Z';tc.up_axis='UP_Y'
cam.data.dof.use_dof=True;cam.data.dof.focus_object=T
# frame, camera, target, lens, fstop
for f,c,t,l,fs in((1,(.62,-.62,.12),(0,.36,-.1),62,2.0),(34,(1.0,-1.35,.3),(0,.25,-.05),52,2.4),(62,(1.9,-3.0,.75),(0,0,0),62,5.6),(112,(.5,-3.9,.95),(0,0,0),60,8),(146,(.6,-6.2,1.5),(.1,0,.02),50,11),(160,(-1.6,-2.5,.75),(-1.3,0,.05),52,5.6),(180,(.6,-2.1,.55),(.62,0,0),52,4),(198,(2.3,-2.3,.65),(1.85,0,0),52,5.6),(204,(2.0,-2.9,.7),(1.4,0,0),50,6),(228,(3.1,-.9,.25),(0,0,0),44,8),(240,(2.4,0,0),(0,0,0),34,11)):
    key(cam,'location',f,c);key(T,'location',f,t);cam.data.lens=l;cam.data.keyframe_insert('lens',frame=f);cam.data.dof.aperture_fstop=fs;cam.data.dof.keyframe_insert('aperture_fstop',frame=f)
# ---------- studio: darkness with one rim, then the lights come up on a pale cyclorama
w=bpy.data.worlds.new('w');S.world=w;w.use_nodes=True;bg=w.node_tree.nodes['Background'];bg.inputs[0].default_value=(.86,.875,.9,1)
wt=w.node_tree;tcw=wt.nodes.new('ShaderNodeTexCoord');sx=wt.nodes.new('ShaderNodeSeparateXYZ');rp=wt.nodes.new('ShaderNodeValToRGB');wt.links.new(tcw.outputs['Window'],sx.inputs[0]);wt.links.new(sx.outputs[1],rp.inputs[0])
rp.color_ramp.elements[0].color=(.34,.35,.37,1);rp.color_ramp.elements[1].color=(.96,.97,1,1);lp=wt.nodes.new('ShaderNodeLightPath');mx2=wt.nodes.new('ShaderNodeMix');mx2.data_type='RGBA';mx2.inputs[6].default_value=(.86,.875,.9,1);wt.links.new(lp.outputs['Is Camera Ray'],mx2.inputs[0]);wt.links.new(rp.outputs[0],mx2.inputs[7]);wt.links.new(mx2.outputs[2],bg.inputs[0])
def wk(f,v):bg.inputs[1].default_value=v;bg.inputs[1].keyframe_insert('default_value',frame=f)
for f,v in((1,.0),(40,.004),(62,.62),(204,.62),(226,.2),(240,.0)):wk(f,v)
def area(n,loc,size,e,col=(1,1,1)):
    d=bpy.data.lights.new(n,'AREA');d.shape='RECTANGLE';d.size,d.size_y=size;d.color=col;o=bpy.data.objects.new(n,d);S.collection.objects.link(o);o.location=loc
    o.rotation_euler=(-Vector(loc)).to_track_quat('-Z','Y').to_euler()
    for f,v in e:d.energy=v;d.keyframe_insert('energy',frame=f)
    return o
area('rim',(-3,3.4,2.6),(.5,5),((1,90),(40,150),(64,260),(204,260),(240,160)),(.82,.9,1))
area('sweep',(2.2,-1.6,3.0),(.22,3.4),((1,60),(30,160),(62,170),(240,60)))
area('top',(0,-.4,4.4),(5,3),((1,0),(40,0),(62,330),(204,330),(240,0)))
area('left',(-4.6,-3,.6),(1.2,4),((1,0),(42,0),(64,190),(204,190),(240,0)))
area('low',(1,-2.5,-3.2),(5,1.2),((1,0),(44,0),(64,60),(204,60),(240,0)))
# black flags give the metal something dark to reflect
for x in(-2.6,2.9):
    me=bpy.data.meshes.new('flag');me.from_pydata([(x,-4.8,-2),(x,-2.2,-2),(x,-2.2,3),(x,-4.8,3)],[],[(0,1,2,3)]);fl=obj('flag',me,mat('flag',(.002,.002,.002),0,1),None);fl.visible_camera=False;fl.hide_render=False
S.render.engine='CYCLES';c=S.cycles
pr=bpy.context.preferences.addons['cycles'].preferences;pr.compute_device_type='METAL';pr.get_devices()
for d in pr.devices:d.use=d.type=='METAL'
c.device='GPU';c.samples=SPP;c.use_adaptive_sampling=True;c.adaptive_threshold=.03;c.use_denoising=True;c.denoiser='OPENIMAGEDENOISE';c.max_bounces=7;c.diffuse_bounces=2;c.glossy_bounces=5;c.sample_clamp_indirect=6
try:c.denoising_use_gpu=True
except Exception:pass
S.render.use_persistent_data=True
S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast'
S.render.resolution_x=W;S.render.resolution_y=round(W*9/16);S.render.image_settings.file_format='PNG';S.frame_start,S.frame_end,S.frame_step=1,240,1
import time,os
os.makedirs(OUT,exist_ok=True)
for f in range(F0,F1+1,STEP):
    fn=f'{OUT}/{f:04d}.png'
    if os.path.exists(fn):continue
    t=time.time();S.frame_set(f);S.render.filepath=fn;bpy.ops.render.render(write_still=True);print('FRAME',f,round(time.time()-t,1),flush=True)
