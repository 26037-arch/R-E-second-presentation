/* 오프라인 Three.js 시각화. 단품 CAD와 개념도를 분리합니다. */
window.DeckVisuals=(()=>{
 let active=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function material(color,opts={}){return new THREE.MeshStandardMaterial({color,roughness:.47,metalness:.13,...opts});}
 function geometry(id){const d=MODEL_LIBRARY[id];if(!d)throw Error('모델을 찾을 수 없습니다: '+id);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(d.vertices,3));g.setIndex(d.faces);g.computeVertexNormals();return g;}
 function addMesh(scene,id,color=0x5273ed){const m=new THREE.Mesh(geometry(id),material(color));m.position.z=MODEL_LIBRARY[id].sizeMm[2]/2;scene.add(m);return m;}
 function grid(scene,size){const g=new THREE.GridHelper(size,12,0xcbd4e7,0xdde3f0);g.rotation.x=Math.PI/2;g.position.z=-.2;g.material.transparent=true;g.material.opacity=.7;scene.add(g);}
 function box(group,w,d,h,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),mat);m.position.set(x,y,z);group.add(m);return m;}
 function cylinder(group,r,h,x,y,z,mat,axis='z'){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,36),mat);if(axis==='z')m.rotation.x=Math.PI/2;m.position.set(x,y,z);group.add(m);return m;}
 function modelScene(scene,id){const d=MODEL_LIBRARY[id];addMesh(scene,id);const size=Math.max(...d.sizeMm);grid(scene,size*1.65);return {size:size*1.15,center:new THREE.Vector3(0,0,d.sizeMm[2]*.43)};}
 function coverScene(scene){
   const faint=material(0x728aba,{transparent:true,opacity:.065,depthWrite:false});const mesh=new THREE.Mesh(geometry('hourglass'),faint);const data=MODEL_LIBRARY.hourglass;const scale=100/Math.max(...data.sizeMm);mesh.scale.setScalar(scale);mesh.position.z=55;scene.add(mesh);
   for(let j=0;j<19;j++){
     const z=16+j*4.5;const radius=18+12*Math.pow(Math.abs((j-9)/9),1.4);const points=[];
     for(let i=0;i<=160;i++){const t=i/160*Math.PI*2;points.push(new THREE.Vector3(Math.cos(t)*radius,Math.sin(t)*radius,z-2.5));}
     const c=new THREE.Color().setHSL(.622,.67,.48+j*.012);const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:c,transparent:true,opacity:.9}));scene.add(line);
   }
   const cone=new THREE.Mesh(new THREE.ConeGeometry(49,28,96,1,true),material(0x4669ea,{transparent:true,opacity:.095,side:THREE.DoubleSide,depthWrite:false}));cone.rotation.x=Math.PI/2;cone.position.z=87;scene.add(cone);
   const axis=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,6),new THREE.Vector3(0,0,112)]),new THREE.LineDashedMaterial({color:0x97a9cd,dashSize:3,gapSize:3,transparent:true,opacity:.6}));axis.computeLineDistances();scene.add(axis);
   return {size:145,center:new THREE.Vector3(0,0,58),auto:true};
 }
 function machineScene(scene){
   const pale=material(0xdce3ef),blue=material(0x5175ea),mint=material(0x24a79a),dark=material(0x344660),steel=material(0xa7b7ce);
   box(scene,160,140,4,0,0,-4,pale);grid(scene,150);
   const axes=new THREE.AxesHelper(35);axes.position.set(-62,-51,0);scene.add(axes);
   const carriage=new THREE.Group();scene.add(carriage);
   const yaw=new THREE.Group();carriage.add(yaw);
   cylinder(yaw,18,12,0,0,0,blue);box(yaw,45,30,8,0,0,9,pale);
   const tilt=new THREE.Group();yaw.add(tilt);cylinder(tilt,10,40,0,0,0,mint,'y');
   box(tilt,9,36,49,0,0,-27,blue);box(tilt,34,32,9,0,0,-52,dark);
   cylinder(tilt,11,24,0,0,-63,steel);cylinder(tilt,7,10,0,0,-79,dark);
   const nozzle=new THREE.Mesh(new THREE.ConeGeometry(5,12,24),material(0xb5a073));nozzle.rotation.x=-Math.PI/2;nozzle.position.z=-90;tilt.add(nozzle);
   const tip=new THREE.Object3D();tip.position.set(0,0,-96);tilt.add(tip);
   const path=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:130},(_,i)=>{const a=i/129*Math.PI*2;return new THREE.Vector3(30*Math.cos(a),30*Math.sin(a),4);})),new THREE.LineBasicMaterial({color:0x9aacd6}));scene.add(path);
   const origin=new THREE.Mesh(new THREE.SphereGeometry(2.5,20,12),material(0x4262e9));origin.position.z=22;scene.add(origin);
   function update(b,c){yaw.rotation.z=c*Math.PI/180;tilt.rotation.y=b*Math.PI/180;carriage.position.set(0,0,0);scene.updateMatrixWorld(true);const p=tip.getWorldPosition(new THREE.Vector3());carriage.position.copy(new THREE.Vector3(0,0,22).sub(p));scene.updateMatrixWorld(true);}
   update(25,30);return {size:200,center:new THREE.Vector3(0,0,47),update};
 }
 function dispose(){if(!active)return;const old=active;active=null;old.renderer.setAnimationLoop(null);old.controls.dispose();old.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});old.renderer.dispose();old.renderer.domElement.remove();old.renderer.forceContextLoss();}
 function mount(slide){
   dispose();const el=slide.querySelector('[data-visual]');if(!el)return;el.querySelectorAll('.visual-unavailable').forEach(p=>p.remove());
   if(!window.THREE){fallback(el,'3D 라이브러리를 불러오지 못했습니다.');return;}
   try{
     const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(39,1,.01,10000);camera.up.set(0,0,1);
     scene.add(new THREE.HemisphereLight(0xffffff,0x8c9dbe,.95));const light=new THREE.DirectionalLight(0xffffff,1.15);light.position.set(70,-100,180);scene.add(light);const fill=new THREE.DirectionalLight(0xd6e5ff,.65);fill.position.set(-100,70,65);scene.add(fill);
     const type=el.dataset.visual;const setup=type==='cover'?coverScene(scene):type==='machine'?machineScene(scene):modelScene(scene,el.dataset.model);
     const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputEncoding=THREE.sRGBEncoding;renderer.setClearColor(0x000000,0);el.appendChild(renderer.domElement);
     const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.enablePan=false;controls.autoRotate=!!setup.auto&&!reduced;controls.autoRotateSpeed=.45;controls.minDistance=setup.size*.6;controls.maxDistance=setup.size*6;
     function reset(){controls.target.copy(setup.center);camera.position.copy(setup.center).add(new THREE.Vector3(setup.size*.95,-setup.size*1.5,setup.size*1.0));camera.lookAt(setup.center);controls.update();controls.saveState();}
     reset();function resize(){const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}resize();
     const state={scene,camera,renderer,controls,setup,el,resize,reset};active=state;el.querySelector('[data-reset-view]')?.addEventListener('click',reset);
     renderer.setAnimationLoop(()=>{if(active!==state)return;controls.update();renderer.render(scene,camera);});
     renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(active===state&&renderer.domElement.isConnected)fallback(el,'3D 화면이 중단됐습니다. 슬라이드를 다시 열어주세요.');});
   }catch(e){console.warn('3D 뷰어',e);fallback(el,'3D를 표시할 수 없습니다. 다른 브라우저에서 열어주세요.');}
 }
 function fallback(el,text){if(el.querySelector('.visual-unavailable'))return;const p=document.createElement('div');p.className='visual-unavailable';p.innerHTML=text+'<br><small>본문과 메모는 계속 사용할 수 있습니다.</small>';el.appendChild(p);}
 return {mount,dispose,resize:()=>active?.resize(),setMachine:(b,c)=>active?.setup.update?.(b,c),reset:()=>active?.reset()};
})();
