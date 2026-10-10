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
 function machineScene(scene,el){
   const pale=material(0xdce3ef),blue=material(0x5175ea),mint=material(0x24a79a),dark=material(0x344660),steel=material(0xa7b7ce);
   box(scene,160,140,4,0,0,-2,pale);grid(scene,150);
   const axes=new THREE.AxesHelper(35);axes.position.set(-62,-51,.1);scene.add(axes);
   const carriage=new THREE.Group();scene.add(carriage);
   const yaw=new THREE.Group();carriage.add(yaw);
   cylinder(yaw,18,12,0,0,0,blue);box(yaw,45,30,8,0,0,9,pale);
   const tilt=new THREE.Group();yaw.add(tilt);cylinder(tilt,10,40,0,0,0,mint,'y');
   box(tilt,9,36,49,0,0,-27,blue);box(tilt,34,32,9,0,0,-52,dark);
   cylinder(tilt,11,24,0,0,-63,steel);cylinder(tilt,4,10,0,0,-79,dark);
   const nozzle=new THREE.Mesh(new THREE.ConeGeometry(2,12,24),material(0xb5a073));nozzle.rotation.x=-Math.PI/2;nozzle.position.z=-90;tilt.add(nozzle);
   const tip=new THREE.Object3D();tip.position.set(0,0,-96);tilt.add(tip);
   const program=GCodeSimulation.parse(GCodeSimulation.demo());
   const deposition=program.segments.filter(s=>s.extruding),sides=6,verticesPerBead=12,indicesPerBead=36;
   // 한 메시의 표시 범위만 늘려 완성된 압출 경로를 보존합니다.
   function bead(from,to,positions,offset=0,layer=0){
     const tangent=new THREE.Vector3(to.x-from.x,to.y-from.y,to.z-from.z).normalize();
     [from,to].forEach((p,end)=>{
       const b=p.b*Math.PI/180,c=p.c*Math.PI/180,normal=new THREE.Vector3(Math.sin(b)*Math.cos(c),Math.sin(b)*Math.sin(c),Math.cos(b));
       const across=new THREE.Vector3().crossVectors(tangent,normal).normalize(),up=new THREE.Vector3().crossVectors(across,tangent).normalize();
       const thickness=(layer===0?GCodeSimulation.config.layerHeight:GCodeSimulation.surface(p.x,p.y,layer)-GCodeSimulation.surface(p.x,p.y,layer-1))*normal.z;
       for(let k=0;k<sides;k++){
       const a=Math.PI/6+k/sides*Math.PI*2,v=new THREE.Vector3(p.x,p.y,p.z).addScaledVector(normal,-thickness/2).addScaledVector(across,Math.cos(a)*GCodeSimulation.config.lineWidth/(2*Math.cos(Math.PI/6))).addScaledVector(up,Math.sin(a)*thickness/2);
       const j=offset+(end*sides+k)*3;positions[j]=v.x;positions[j+1]=v.y;positions[j+2]=v.z;
     }});
   }
   function beadIndices(count){const indices=[];for(let j=0;j<count;j++)for(let k=0;k<sides;k++){
     const a=j*verticesPerBead+k,b=j*verticesPerBead+(k+1)%sides;
     indices.push(a,b,a+sides,b,b+sides,a+sides);
   }return indices;}
   const positions=new Float32Array(deposition.length*verticesPerBead*3),colors=new Float32Array(positions.length);
   deposition.forEach((s,i)=>{bead(s.from,s.to,positions,i*verticesPerBead*3,s.layer-1);const color=new THREE.Color().setHSL(.47+s.layer/program.layers*.06,.57,.43+s.layer/program.layers*.12);for(let v=0;v<verticesPerBead;v++)color.toArray(colors,i*verticesPerBead*3+v*3);});
   const printedGeometry=new THREE.BufferGeometry();printedGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));printedGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));printedGeometry.setIndex(beadIndices(deposition.length));printedGeometry.computeVertexNormals();printedGeometry.setDrawRange(0,0);
   const printed=new THREE.Mesh(printedGeometry,material(0xffffff,{vertexColors:true,side:THREE.DoubleSide}));scene.add(printed);
   const liveGeometry=new THREE.BufferGeometry();liveGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(verticesPerBead*3),3).setUsage(THREE.DynamicDrawUsage));liveGeometry.setIndex(beadIndices(1));
   const live=new THREE.Mesh(liveGeometry,mint);live.frustumCulled=false;live.visible=false;scene.add(live);
   let elapsed=0,running=true,speed=3,cycle=1,lastTime=null,lastReadout=-Infinity,pose={x:0,y:0,z:4,b:0,c:-180,e:0},latest=null;
   const slide=el.closest('.slide'),find=id=>slide.querySelector('#'+id),play=find('machine-play');
   speed=Number(find('machine-speed').value)||3;
   function place(p){
     yaw.rotation.z=p.c*Math.PI/180;tilt.rotation.y=p.b*Math.PI/180;carriage.position.set(0,0,0);scene.updateMatrixWorld(true);
     carriage.position.copy(new THREE.Vector3(p.x,p.y,p.z).sub(tip.getWorldPosition(new THREE.Vector3())));scene.updateMatrixWorld(true);
   }
   function readout(state,hold=false){
     const p=state.pose,s=state.segment;
     find('b-control').value=p.b;find('c-control').value=((p.c+180)%360+360)%360-180;
     find('b-value').textContent=p.b.toFixed(1)+'°';find('c-value').textContent=p.c.toFixed(1)+'°';
     find('machine-code').textContent=s.raw;
     find('machine-position').textContent=`X ${p.x.toFixed(1)}  Y ${p.y.toFixed(1)}  Z ${p.z.toFixed(1)} mm`;
     find('machine-layer').textContent=`${Math.max(1,s.layer)} / ${program.layers}층 · ${s.coneAngle.toFixed(1)}°`;
     find('machine-progress').value=Math.min(100,elapsed/program.duration*100);
     const phase=s.type==='INFILL'?'내부 채움':'외벽 출력';
     find('machine-status').textContent=hold?'완료 · 반복 준비':!running?'일시정지':s.extruding?phase:'이동 · 리트랙션';
     el.querySelector('.visual-caption').textContent=`${cycle}회차 · ${hold?'출력 완료':s.extruding?phase:'노즐 이동'} · 가변각 원뿔 슬라이싱`;
     play.textContent=running?'일시정지':'계속 재생';play.setAttribute('aria-pressed',String(!running));
   }
   function renderState(force=false){
     const state=GCodeSimulation.sample(program,elapsed);latest=state;pose=state.pose;place(pose);
     printedGeometry.setDrawRange(0,state.completed*indicesPerBead);
     live.visible=state.segment.extruding&&state.fraction>0&&state.fraction<1;
     if(live.visible){bead(state.segment.from,pose,liveGeometry.attributes.position.array,0,state.segment.layer-1);liveGeometry.attributes.position.needsUpdate=true;liveGeometry.computeVertexNormals();}
     if(force||elapsed-lastReadout>.08){readout(state,elapsed>=program.duration);lastReadout=elapsed;}
   }
   function restart(){elapsed=0;lastTime=null;lastReadout=-Infinity;running=true;renderState(true);}
   function tick(now){
     const dt=lastTime===null?0:Math.min(Math.max((now-lastTime)/1000,0),.1);lastTime=now;
     if(running&&!document.hidden){
       elapsed+=dt*speed;
       if(elapsed>=program.duration+speed*1.7){elapsed=0;cycle++;lastReadout=-Infinity;}
       renderState();
     }
   }
   play.onclick=()=>{running=!running;lastTime=null;readout(latest,elapsed>=program.duration);};
   find('machine-restart').onclick=restart;
   find('machine-speed').onchange=e=>{speed=Number(e.target.value);};
   find('machine-download').onclick=()=>{
     const url=URL.createObjectURL(new Blob([program.source],{type:'text/plain'})),a=document.createElement('a');a.href=url;a.download='rep5x-slide11-demo.gcode';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   };
   renderState(true);
   function update(b,c){running=false;pose={...pose,b,c};place(pose);readout({...latest,pose});live.visible=false;}
   return {size:190,center:new THREE.Vector3(0,0,52),update,tick,getState:()=>({elapsed,running,cycle,pose:{...pose},nozzle:tip.getWorldPosition(new THREE.Vector3()).toArray(),deposits:printedGeometry.drawRange.count/indicesPerBead,live:live.visible,duration:program.duration}),cleanup:()=>{[play,find('machine-restart'),find('machine-speed'),find('machine-download')].forEach(button=>{button.onclick=null;button.onchange=null;});}};
 }

 function dispose(){if(!active)return;const old=active;active=null;old.renderer.setAnimationLoop(null);old.setup.cleanup?.();old.controls.dispose();old.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});old.renderer.dispose();old.renderer.domElement.remove();old.renderer.forceContextLoss();}
 function mount(slide){
   dispose();const el=slide.querySelector('[data-visual]');if(!el)return;el.querySelectorAll('.visual-unavailable').forEach(p=>p.remove());
   if(!window.THREE){fallback(el,'3D 라이브러리를 불러오지 못했습니다.');return;}
   try{
     const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(39,1,.01,10000);camera.up.set(0,0,1);
     scene.add(new THREE.HemisphereLight(0xffffff,0x8c9dbe,.95));const light=new THREE.DirectionalLight(0xffffff,1.15);light.position.set(70,-100,180);scene.add(light);const fill=new THREE.DirectionalLight(0xd6e5ff,.65);fill.position.set(-100,70,65);scene.add(fill);
     const type=el.dataset.visual;const setup=type==='cover'?coverScene(scene):type==='machine'?machineScene(scene,el):modelScene(scene,el.dataset.model);
     const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputEncoding=THREE.sRGBEncoding;renderer.setClearColor(0x000000,0);el.appendChild(renderer.domElement);
     const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.enablePan=false;controls.autoRotate=!!setup.auto&&!reduced;controls.autoRotateSpeed=.45;controls.minDistance=setup.size*.6;controls.maxDistance=setup.size*6;
     function reset(){controls.target.copy(setup.center);camera.position.copy(setup.center).add(new THREE.Vector3(setup.size*.95,-setup.size*1.5,setup.size*1.0));camera.lookAt(setup.center);controls.update();controls.saveState();}
     reset();function resize(){const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}resize();
     const state={scene,camera,renderer,controls,setup,el,resize,reset};active=state;const resetButton=el.querySelector('[data-reset-view]');if(resetButton)resetButton.onclick=reset;
     renderer.setAnimationLoop(now=>{if(active!==state)return;setup.tick?.(now);controls.update();renderer.render(scene,camera);});
     renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(active===state&&renderer.domElement.isConnected)fallback(el,'3D 화면이 중단됐습니다. 슬라이드를 다시 열어주세요.');});
   }catch(e){console.warn('3D 뷰어',e);fallback(el,'3D를 표시할 수 없습니다. 다른 브라우저에서 열어주세요.');}
 }
 function fallback(el,text){if(el.querySelector('.visual-unavailable'))return;const p=document.createElement('div');p.className='visual-unavailable';p.innerHTML=text+'<br><small>본문과 메모는 계속 사용할 수 있습니다.</small>';el.appendChild(p);}
 return {mount,dispose,resize:()=>active?.resize(),setMachine:(b,c)=>active?.setup.update?.(b,c),getMachineState:()=>active?.setup.getState?.(),reset:()=>active?.reset()};
})();
