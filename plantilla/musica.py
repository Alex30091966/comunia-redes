# Música original sintetizada (sin derechos): pulso tech minimal 112 bpm + pad + whooshes en los cortes.
# uso: python3 musica.py DURACION_S "t1,t2,..." salida.wav [semilla]
import sys, numpy as np, wave
dur=float(sys.argv[1]); cortes=[float(x) for x in sys.argv[2].split(',') if x]; out=sys.argv[3]
seed=int(sys.argv[4]) if len(sys.argv)>4 else 1
rng=np.random.default_rng(seed); sr=44100; n=int(sr*dur); t=np.arange(n)/sr
bpm=[104,108,112,116,120][seed%5]; beat=60/bpm
roots=[[57,53,60,55],[50,46,53,48],[52,48,55,50],[55,51,58,53]][seed%4]  # progresiones menores
mtof=lambda m:440*2**((m-69)/12)
mix=np.zeros(n)
def env(l,a,r):
    e=np.ones(l); a=min(a,l); r=min(r,l-a)
    e[:a]=np.linspace(0,1,a); e[l-r:]=np.linspace(1,0,r); return e
# pad
bar=beat*4
for k in range(int(dur/bar)+1):
    s=int(k*bar*sr); l=min(int(bar*sr),n-s)
    if l<=0: break
    r=roots[k%4]; tt=np.arange(l)/sr
    ch=sum(np.sin(2*np.pi*mtof(r+iv)*tt*(1+d))*0.5 for iv in (0,3,7,12) for d in (-0.003,0.003))
    mix[s:s+l]+=0.035*ch*env(l,int(0.4*sr),int(0.4*sr))
    # bajo
    for q in range(4):
        bs=s+int(q*beat*sr); bl=min(int(beat*0.9*sr),n-bs)
        if bl<=0: continue
        tb=np.arange(bl)/sr
        mix[bs:bs+bl]+=0.16*np.tanh(2*np.sin(2*np.pi*mtof(r-24)*tb))*np.exp(-tb*3)
# percusión (entra tras 1 compás)
k=0
while k*beat<dur:
    s=int(k*beat*sr)
    if k>=2:
        l=min(int(0.35*sr),n-s); tk=np.arange(l)/sr
        mix[s:s+l]+=0.55*np.sin(2*np.pi*(45+90*np.exp(-tk*30))*tk)*np.exp(-tk*9)
    if k>=4 and k%2==1:
        l=min(int(0.18*sr),n-s); nz=rng.standard_normal(l)
        mix[s:s+l]+=0.10*np.diff(np.concatenate([[0],nz]))*np.exp(-np.arange(l)/sr*25)
    for h in (0.5,):
        hs=s+int(h*beat*sr); l=min(int(0.05*sr),n-hs)
        if l>0 and k>=1:
            nz=rng.standard_normal(l); mix[hs:hs+l]+=0.045*np.diff(np.concatenate([[0],nz]))*np.exp(-np.arange(l)/sr*80)
    k+=1
# whooshes en cada corte
for c in cortes:
    s=int((c-0.35)*sr); l=int(0.7*sr)
    if s<0 or s+l>n: continue
    nz=rng.standard_normal(l); e=np.sin(np.linspace(0,np.pi,l))**2
    # filtro paso bajo móvil sencillo
    y=np.zeros(l); a=0
    for i in range(l):
        cf=0.02+0.25*e[i]; a+=cf*(nz[i]-a); y[i]=a
    mix[s:s+l]+=0.35*y*e
# fade in/out y normalizar
fi=int(0.3*sr); fo=int(1.5*sr); mix[:fi]*=np.linspace(0,1,fi); mix[-fo:]*=np.linspace(1,0,fo)
mix=mix/np.max(np.abs(mix))*0.85
st=np.stack([mix,mix],1)
w=wave.open(out,'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st*32767).astype('<i2').tobytes()); w.close()
print('musica ok',bpm,'bpm')
