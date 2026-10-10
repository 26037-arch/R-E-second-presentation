/* 발표용 G-code 실행기: 장비 제어·충돌 검증과 무관한 시각화입니다. */
(function(root){
 'use strict';
 const axes=['x','y','z','b','c','e'];
 const config={layers:40,layerHeight:.65,lineWidth:1,fillSpacing:.9,maxConeAngle:18,coreRadius:1.8};
 function layerProfile(layer){
   const t=layer/(config.layers-1),smooth=t*t*(3-2*t);
   return {baseZ:.65+layer*config.layerHeight,angle:config.maxConeAngle*smooth,radius:14+8*Math.pow(2*t-1,2)};
 }
 function surface(x,y,layer){
   const p=layerProfile(layer),r=Math.hypot(x,y),slope=Math.tan(p.angle*Math.PI/180);
   // z = z′ − r tanθ. 중앙의 원뿔 꼭짓점만 부드럽게 정규화합니다.
   return p.baseZ-slope*(Math.sqrt(r*r+config.coreRadius**2)-config.coreRadius);
 }
 function poseAt(x,y,layer,previousC=0){
   const r=Math.hypot(x,y),slope=Math.tan(layerProfile(layer).angle*Math.PI/180);
   const b=Math.atan(slope*r/Math.sqrt(r*r+config.coreRadius**2))*180/Math.PI;
   let c=r<1e-8?previousC:Math.atan2(y,x)*180/Math.PI;
   c+=360*Math.round((previousC-c)/360);
   return {x,y,z:surface(x,y,layer),b,c};
 }
 function parse(source){
   let p={x:0,y:0,z:3,b:0,c:0,e:0},absolute=true,extruderAbsolute=true,feed=1800,motion=0,time=0,depositCount=0,layer=0,type='TRAVEL',coneAngle=0;
   const segments=[];
   source.split(/\r?\n/).forEach((raw,line)=>{
     const layerMatch=raw.match(/;LAYER:(\d+)/i);if(layerMatch)layer=Number(layerMatch[1])+1;
     const typeMatch=raw.match(/;TYPE:(\w+)/i);if(typeMatch)type=typeMatch[1].toUpperCase();
     const angleMatch=raw.match(/;CONE_ANGLE:([\d.]+)/i);if(angleMatch)coneAngle=Number(angleMatch[1]);
     const code=raw.replace(/\([^)]*\)/g,'').split(';')[0].trim().toUpperCase();if(!code)return;
     const words=[...code.matchAll(/([A-Z])\s*([-+]?(?:\d+\.?\d*|\.\d+))/g)];
     const values={};let command=null;
     words.forEach(w=>{if(w[1]==='G'||w[1]==='M')command=w[1]+Number(w[2]);else values[w[1].toLowerCase()]=Number(w[2]);});
     if(command==='G90'){absolute=true;return;}if(command==='G91'){absolute=false;return;}
     if(command==='M82'){extruderAbsolute=true;return;}if(command==='M83'){extruderAbsolute=false;return;}
     if(command==='G92'){axes.forEach(a=>{if(a in values)p[a]=values[a];});return;}
     if(command==='G0'||command==='G1')motion=Number(command.slice(1));else if(command)return;
     if(values.f>0)feed=values.f;
     if(!axes.some(a=>a in values))return;
     const next={...p};axes.forEach(a=>{if(a in values)next[a]=(a==='e'?extruderAbsolute:absolute)?values[a]:p[a]+values[a];});
     const distance=Math.hypot(next.x-p.x,next.y-p.y,next.z-p.z),extruding=motion===1&&next.e>p.e+1e-7&&distance>1e-7;
     const duration=Math.max(distance/feed*60,Math.abs(next.b-p.b)/45,Math.abs(next.c-p.c)/90,Math.abs(next.e-p.e)/18,.005);
     const segment={from:{...p},to:next,start:time,end:time+duration,duration,extruding,line:line+1,raw:raw.trim(),layer,type,coneAngle,depositIndex:extruding?depositCount++:-1,completedDeposits:depositCount};
     segments.push(segment);time+=duration;p=next;
   });
   return {source,segments,duration:time,depositCount,layers:segments.reduce((n,s)=>Math.max(n,s.layer),0)};
 }
 function demo(){
   const lines=['; Variable-angle conical slicing demo; not a machine-ready file','; Outward: z=zPrime-tan(theta)*(sqrt(r*r+core*core)-core)','; 2 perimeters + 100% rectilinear infill; nozzle tracks local surface normal','; Flat first layer for bed adhesion; angles then increase smoothly','G90','M82','G92 E0','G0 X0 Y0 Z4 B0 C-180 F2400'];
   let e=0,last={x:0,y:0,z:4,b:0,c:-180};
   const fmt=p=>`X${p.x.toFixed(4)} Y${p.y.toFixed(4)} Z${p.z.toFixed(4)} B${p.b.toFixed(3)} C${p.c.toFixed(3)}`;
   function travel(x,y,layer,preferredC){
     const p=poseAt(x,y,layer,last.c),safeZ=layerProfile(layer).baseZ+2;
     lines.push(';TYPE:TRAVEL',`G1 E${(e-.7).toFixed(5)} F1200`,`G0 ${fmt({...last,z:safeZ})} F2400`);
     // 연속 방위각이 설명용 C축 범위를 넘으면 안전 높이에서 되감습니다.
     if(preferredC!==undefined)p.c=preferredC;
     if(Math.abs(p.c)>330)p.c-=360*Math.round(p.c/360);
     if(Math.abs(p.c-last.c)>180)lines.push(`G0 B0 C${p.c.toFixed(3)} F1200`);
     lines.push(`G0 ${fmt({...p,z:safeZ})} F2400`,`G0 ${fmt(p)} F1200`,`G1 E${e.toFixed(5)} F1200`);last=p;
   }
   function extrude(x,y,layer){
     const p=poseAt(x,y,layer,last.c),distance=Math.hypot(p.x-last.x,p.y-last.y,p.z-last.z);
     // 중심 근처의 빠른 방위각 변화도 짧은 동기 이동으로 나눕니다.
     if(distance>1e-5&&(Math.abs(p.c-last.c)>15||Math.abs(p.b-last.b)>.75)){
       const midX=(x+last.x)/2,midY=(y+last.y)/2;extrude(midX,midY,layer);extrude(x,y,layer);return;
     }
     // Eは実空間の線長×線幅×局所層厚から算出します。
     const thickness=(layer===0?config.layerHeight:surface(x,y,layer)-surface(x,y,layer-1))*Math.cos(p.b*Math.PI/180);
     e+=distance*config.lineWidth*thickness/(Math.PI*(1.75/2)**2);
     lines.push(`G1 ${fmt(p)} E${e.toFixed(5)} F1200`);last=p;
   }
   for(let layer=0;layer<config.layers;layer++){
     const {radius,angle}=layerProfile(layer);
     lines.push(';LAYER:'+layer,';CONE_ANGLE:'+angle.toFixed(5));
     for(let wall=0;wall<2;wall++){
       const r=radius-wall*config.lineWidth;
       travel(-r,0,layer,wall===0?-180:180);lines.push(';TYPE:PERIMETER');
       for(let i=1;i<=96;i++){
         const a=(-Math.PI+(wall===0?1:-1)*i/96*Math.PI*2);
         extrude(r*Math.cos(a),r*Math.sin(a),layer);
       }
     }
     // 이웃한 채움 선을 지그재그로 연결하고 각 점을 원뿔면으로 역변환합니다.
     const fillRadius=radius-1.5*config.lineWidth,rows=2*Math.ceil(fillRadius/config.fillSpacing),spacing=2*fillRadius/rows,rotate=layer%2?Math.PI/2:0;
     const xy=(u,v)=>({x:u*Math.cos(rotate)-v*Math.sin(rotate),y:u*Math.sin(rotate)+v*Math.cos(rotate)});
     const start=xy(-Math.sqrt(fillRadius**2-(-fillRadius+spacing/2)**2),-fillRadius+spacing/2);
     travel(start.x,start.y,layer);lines.push(';TYPE:INFILL');
     for(let row=0;row<rows;row++){
       const v=-fillRadius+(row+.5)*spacing,half=Math.sqrt(Math.max(0,fillRadius**2-v*v)),u0=row%2?half:-half,u1=-u0;
       const begin=xy(u0,v);
       if(row>0){const n=Math.max(1,Math.ceil(Math.hypot(begin.x-last.x,begin.y-last.y)/1.2));const old={...last};for(let j=1;j<=n;j++)extrude(old.x+(begin.x-old.x)*j/n,old.y+(begin.y-old.y)*j/n,layer);}
       const n=Math.max(1,Math.ceil(2*half/1.2));for(let j=1;j<=n;j++){const p=xy(u0+(u1-u0)*j/n,v);extrude(p.x,p.y,layer);}
     }
   }
   lines.push(';TYPE:TRAVEL',`G1 E${(e-.7).toFixed(5)} F1200`,`G0 ${fmt({...last,z:layerProfile(config.layers-1).baseZ+8})} F2400`,'G0 X40 Y0 Z40 B0 C0 F2400');
   return lines.join('\n');
 }
 function sample(program,time){
   const segments=program.segments;if(!segments.length)return null;
   time=Math.max(0,Math.min(time,program.duration));let low=0,high=segments.length-1;
   while(low<high){const mid=(low+high)>>1;if(segments[mid].end<=time)low=mid+1;else high=mid;}
   const segment=segments[low],fraction=Math.min(1,Math.max(0,(time-segment.start)/segment.duration)),pose={};
   axes.forEach(a=>pose[a]=segment.from[a]+(segment.to[a]-segment.from[a])*fraction);
   return {segment,fraction,pose,index:low,completed:segment.completedDeposits-(segment.extruding&&fraction<1?1:0)};
 }
 const api={parse,demo,sample,config,layerProfile,surface,poseAt};root.GCodeSimulation=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);

