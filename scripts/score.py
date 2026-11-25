"""Original ambient score, synthesised from nothing. Everything is circular, so the loop has no seam."""
import numpy as np, wave, subprocess, os
SR=44100; T=64; N=SR*T; rng=np.random.default_rng(9); t=np.arange(N)/SR
O='public/audio/'
def hz(m): return 440*2**((m-69)/12)
def q(f): return np.round(f*T)/T           # whole cycles per loop
def circ(x,ir):
    n=len(x); f=np.fft.rfft(x); h=np.zeros(n); h[:len(ir)]=ir; return np.fft.irfft(f*np.fft.rfft(h),n)
def ir(sec,bright,seed):
    r=np.random.default_rng(seed); n=int(sec*SR); e=np.exp(-np.arange(n)/SR*6.9/sec); x=r.normal(size=n)*e
    X=np.fft.rfft(x); fr=np.fft.rfftfreq(n,1/SR); X*=1/(1+(fr/bright)**2); X*=fr/(fr+120); x=np.fft.irfft(X,n); a=int(.05*SR); x[:a]*=np.linspace(0,1,a); return x/np.sqrt((x**2).sum())
def swell(c,w):                               # smooth circular window around time c
    d=np.abs((t-c+T/2)%T-T/2); return np.where(d<w,.5+.5*np.cos(np.pi*d/w),0.)
# four sixteen second chords: D add9, B minor 11, G major 9, A sus
CH=[[38,50,57,61,64,66],[35,47,54,57,62,64],[31,43,50,57,59,66],[33,45,52,57,59,64]]
def pad(ch,det,pan):
    out=np.zeros((2,N))
    for i,c in enumerate(CH):
        env=swell(i*16+8,13.5)**1.2
        for k,m in enumerate(c):
            f=hz(m)
            for d in det:
                ff=q(f*2**(d/1200)); ph=rng.uniform(0,6.28); s=np.zeros(N)
                for h in range(1,9):
                    if ff*h>5200: break
                    a=(1/h**1.75)*(1 if k<3 else .8)*(.55+.45*np.sin(2*np.pi*t*np.round((.03+.011*h)*T)/T+ph+h))
                    s+=a*np.sin(2*np.pi*ff*h*t+ph*h)
                p=.5+pan*np.sin(d+k); g=.16 if k<2 else .12
                out[0]+=s*env*g*np.sqrt(1-p); out[1]+=s*env*g*np.sqrt(p)
    return out
def voice():                                   # a wordless choir: formant-shaped harmonics with slow vibrato
    out=np.zeros(N)
    for i,c in enumerate(CH):
        env=swell(i*16+9,9)**1.5
        for m in (c[3]+12,c[4]+12,c[5]):
            f=q(hz(m)); vib=.0035*np.sin(2*np.pi*q(4.6)*t)*.5
            ph=2*np.pi*f*t+f*vib*2
            for h in range(1,12):
                fr=f*h; a=np.exp(-((fr-620)/260)**2)+.55*np.exp(-((fr-1080)/240)**2)+.22*np.exp(-((fr-2500)/420)**2)
                if a>.01: out+=env*a*.14*np.sin(h*ph+rng.uniform(0,6.28))
    return out
def bells():
    out=np.zeros((2,N)); S=[74,76,78,81,83,86,88,90]
    for j in range(26):
        c=(j*2.46+rng.uniform(-.5,.5))%T; m=S[rng.integers(len(S))]+(12 if rng.random()<.25 else 0); f=hz(m); n=int(5*SR); tt=np.arange(n)/SR
        s=sum(a*np.sin(2*np.pi*f*r*tt)*np.exp(-tt*k) for r,a,k in((1,1,1.1),(2.0,.35,1.9),(3.01,.16,2.9),(5.2,.06,4.5)))*np.minimum(1,tt/.012)*.05*rng.uniform(.4,1)
        i=(int(c*SR)+np.arange(n))%N; p=rng.uniform(.15,.85); out[0][i]+=s*np.sqrt(1-p); out[1][i]+=s*np.sqrt(p)
    return out
def air():
    x=rng.normal(size=N); X=np.fft.rfft(x); fr=np.fft.rfftfreq(N,1/SR); X*=np.exp(-((fr-700)/600)**2); x=np.fft.irfft(X,N); x/=x.std(); return x*.012*(.5+.5*np.sin(2*np.pi*t*2/T))
def drone():
    s=np.zeros(N)
    for i,c in enumerate(CH): s+=swell(i*16+8,15)*np.sin(2*np.pi*q(hz(c[0]))*t)*.2
    return s
a,b=ir(6.5,3800,1),ir(6.5,3800,2); long=ir(9,2400,5); long2=ir(9,2400,6)
P=pad(CH,(-7,0,6),.34); B=bells(); A=air(); D=drone()
L=P[0]*.55+circ(P[0],a)*.9+circ(B[0],a)*1.2+B[0]*.35+A+D; R=P[1]*.55+circ(P[1],b)*.9+circ(B[1],b)*1.2+B[1]*.35+np.roll(A,SR*7)+D
V=voice(); VL=circ(V,long)*1.0+V*.15; VR=circ(V,long2)*1.0+V*.15
def save(name,l,r,head=1.0,peak=.82,rate='128000'):
    x=np.stack([l,r]); x-=x.mean(1,keepdims=True); x/=np.abs(x).max(); x=np.tanh(x*1.25); x*=peak/np.abs(x).max()
    h=int(head*SR) if head else 0
    if h: x=np.concatenate([x[:,-h:],x,x[:,:h]],1)
    w=wave.open(O+name+'.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x.T*32767).astype('<i2').tobytes()); w.close()
    subprocess.run(['afconvert','-f','m4af','-d','aac','-b',rate,O+name+'.wav',O+name+'.m4a'],check=True); os.remove(O+name+'.wav'); print(name,os.path.getsize(O+name+'.m4a')//1024,'K')
save('score',L,R); save('choir',VL,VR,rate='96000')
# ignition: a held breath, a low bloom, glass
n=SR*7; tt=np.arange(n)/SR; hit=2.0
x=rng.normal(size=n); X=np.fft.rfft(x); fr=np.fft.rfftfreq(n,1/SR); lo=np.fft.irfft(X*np.exp(-((fr-500)/500)**2),n); hi=np.fft.irfft(X*np.exp(-((fr-5200)/2600)**2),n); lo/=lo.std(); hi/=hi.std()
rise=np.where(tt<hit,(tt/hit)**3.2,np.exp(-(tt-hit)*2.2)); s=lo*rise*.10+hi*np.where(tt<hit,(tt/hit)**6,np.exp(-(tt-hit)*3.5))*.05
d=np.maximum(0,tt-hit); on=(tt>=hit); s+=on*np.sin(2*np.pi*(38*d+ 26*(1-np.exp(-d*5))/5))*np.exp(-d*1.1)*.75
for f,k in((293.66,.7),(440,.8),(587.33,.9),(880,1.2),(1318.5,1.6)): s+=on*np.sin(2*np.pi*f*d)*np.exp(-d*k)*np.minimum(1,d/.02)*.07
for c in (.72,.86,1.12): e=np.maximum(0,tt-c); s+=(tt>=c)*np.sin(2*np.pi*2600*e)*np.exp(-e*70)*.12
pd=np.concatenate([s,np.zeros(SR*3)]); l=pd+circ(pd,a)*1.4; r=pd+circ(pd,b)*1.4; save('ignite',l,r,0,.9,'112000')
# sink: the floor gives way
n=SR*6; tt=np.arange(n)/SR; ph=2*np.pi*np.cumsum(np.interp(tt,[0,2.4,6],[140,42,36]))/SR; s=np.sin(ph)*np.interp(tt,[0,.6,2.2,6],[0,.5,.8,0]); x=rng.normal(size=n); X=np.fft.rfft(x); fr=np.fft.rfftfreq(n,1/SR); w=np.fft.irfft(X*np.exp(-((fr-260)/240)**2),n); w/=w.std(); s+=w*np.interp(tt,[0,1.6,2.6,6],[0,.22,.1,0])
pd=np.concatenate([s,np.zeros(SR*3)]); save('sink',pd+circ(pd,long[:SR*6])*1.1,pd+circ(pd,long2[:SR*6])*1.1,0,.8,'96000')
