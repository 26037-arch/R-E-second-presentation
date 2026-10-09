from pathlib import Path
from zipfile import ZipFile
import json, struct, xml.etree.ElementTree as ET
import numpy as np

root=Path(__file__).resolve().parents[1]
ns={'m':'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'}
library={}

def matrix(s):
    if not s: return np.eye(4)
    a=np.array([float(v) for v in s.split()]).reshape(4,3)
    out=np.eye(4); out[:3,:3]=a[:3].T; out[:3,3]=a[3]
    return out

def read3mf(path):
    with ZipFile(path) as z:
        docs={p:ET.fromstring(z.read(p)) for p in z.namelist() if p.endswith('.model')}
        main='3D/3dmodel.model' if '3D/3dmodel.model' in docs else next(iter(docs))
        def get_object(doc,oid,T):
            ob=docs[doc].find('m:resources',ns).find("m:object[@id='%s']"%oid,ns)
            mesh=ob.find('m:mesh',ns)
            if mesh is not None:
                v=np.array([[float(e.attrib[c]) for c in ('x','y','z')] for e in mesh.find('m:vertices',ns)])
                f=np.array([[int(e.attrib[c]) for c in ('v1','v2','v3')] for e in mesh.find('m:triangles',ns)])
                return [((np.c_[v,np.ones(len(v))]@T.T)[:,:3],f)]
            parts=[]
            for c in ob.find('m:components',ns):
                d=next((v.lstrip('/') for k,v in c.attrib.items() if k.endswith('path')),doc)
                parts.extend(get_object(d,c.attrib['objectid'],T@matrix(c.attrib.get('transform'))))
            return parts
        parts=[]
        for b in docs[main].find('m:build',ns):
            parts.extend(get_object(main,b.attrib['objectid'],matrix(b.attrib.get('transform'))))
        verts=[]; faces=[]; offset=0
        for v,f in parts: verts.append(v); faces.append(f+offset); offset+=len(v)
        return np.vstack(verts),np.vstack(faces)

def readstl(path):
    b=path.read_bytes(); n=struct.unpack_from('<I',b,80)[0]
    if len(b)==84+n*50:
        a=np.array([struct.unpack_from('<12fH',b,84+i*50)[3:12] for i in range(n)]).reshape(-1,3)
    else:
        a=np.array([[float(t) for t in ln.split()[1:]] for ln in b.decode().splitlines() if ln.strip().startswith('vertex')])
    return a,np.arange(len(a)).reshape(-1,3)

def pack(key,v,f,source):
    dims=v.max(0)-v.min(0)
    lo=v.min(0); hi=v.max(0); v=v-(lo+hi)/2
    library[key]={'vertices':np.round(v,5).ravel().tolist(),'faces':f.ravel().tolist(),'sizeMm':np.round(dims,3).tolist(),'source':source}

parts=['b-arm_v1.1.0','C-driven-pulley_v1.1.0','b-driven-pulley_v1.1.0','hotend-spacer_v1.0.0','slip-ring-holder_v1.1.1','spacer-3mm_v1.0.0','carriage-mount_v1.1.1','extruder-mount_v1.1.0','x-endstop_v1.1.0','z-endstop_v1.1.0']
for name in parts:
    v,f=read3mf(root/'assets/originals'/f'{name}.3mf')
    pack(name,v,f,'Rep5x official 3MF, 9c437d5cce7766d641e7aa35ced2c63231148a1f')

curves={}
for name,file in [('arch','arch-01.stl'),('lshape','l-shape-01.stl'),('hourglass','모래시계model.stl')]:
    v,f=readstl(root/'assets/originals'/file)
    lo=v.min(0); hi=v.max(0); v-=np.array([(lo[0]+hi[0])/2,(lo[1]+hi[1])/2,lo[2]])
    tri=v[f]; cross=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]); area=np.linalg.norm(cross,axis=1)/2
    normals=cross/np.maximum(2*area[:,None],1e-20)
    c=tri.mean(1); r=np.linalg.norm(c[:,:2],axis=1)
    nr=np.sum(c[:,:2]*normals[:,:2],axis=1)/np.maximum(r,1e-9)
    baseline=float(area[normals[:,2]<-np.sin(np.pi/4)].sum()/area.sum()*100)
    rows=[]
    for direction,sign in [('outward',1),('inward',-1)]:
        for angle in range(0,45,2):
            a=np.deg2rad(angle); g=normals[:,2]*np.cos(a)+sign*nr*np.sin(a)
            sup=float(area[g<-np.sin(np.pi/4)].sum()/area.sum()*100)
            rows.append({'angle':angle,'direction':direction,'support':round(sup,7),'gain':round(baseline-sup,7)})
    curves[name]={'baseline':baseline,'candidates':rows,'source':'analytic.py / selector.py 판정식으로 1차 발표 STL에서 다시 계산. threshold=45°, step=2°, max=44°. 기하 추정.'}
    pack(name,v,f,'1차 발표 저장소 STL, 82f2c60dd3570c8b1681b6c552cdbd5098f13e34')

(root/'assets/models.js').write_text('window.MODEL_LIBRARY='+json.dumps(library,separators=(',',':'))+';\nwindow.SELECTION_DATA='+json.dumps(curves,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print('Prepared',len(library),'meshes and',len(curves),'source-based selection curves')
print({n:{'baseline':round(d['baseline'],3),'k_02':max(d['candidates'],key=lambda c:c['gain']-.2*c['angle'])} for n,d in curves.items()})

