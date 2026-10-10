(()=>{
 const stage=document.getElementById('stage');let current=0;let presenting=false;
 const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const slides=[...stage.querySelectorAll('.slide')];
 // 제목과 목차는 deck.html의 실제 제목 요소를 읽습니다.
 const slideInfo=slides.map(slide=>{
   const title=slide.querySelector('[id="'+slide.getAttribute('aria-labelledby')+'"]').cloneNode(true);
   title.querySelectorAll('br').forEach(br=>br.replaceWith(' '));
   return {title:title.textContent.replace(/\s+/g,' ').trim(),section:slide.dataset.section};
 });
 const dots=document.getElementById('slide-dots');dots.innerHTML=slideInfo.map((d,i)=>`<button data-go="${i+1}" title="${i+1}. ${safe(d.title)}" aria-label="${i+1}번 슬라이드 ${safe(d.title)}"></button>`).join('');
 document.getElementById('overview-grid').innerHTML=slideInfo.map((d,i)=>`<button data-go="${i+1}"><span>${String(i+1).padStart(2,'0')} / ${safe(d.section)}</span><strong>${safe(d.title)}</strong></button>`).join('');
 const partMenu=document.getElementById('part-menu');
 const parts=[...partMenu.querySelectorAll('button[data-part]')].map(button=>{
   const info=partMenu.querySelector('template[data-part-info="'+button.dataset.part+'"]');
   return {id:button.dataset.part,name:button.textContent.trim(),desc:info.content.querySelector('[data-part-desc]').textContent,detail:info.content.querySelector('[data-part-detail]').textContent};
 });
 function part(id,render=true){const p=parts.find(p=>p.id===id)||parts[0];const sl=slides[11];sl.querySelectorAll('[data-part]').forEach(b=>b.classList.toggle('selected',b.dataset.part===p.id));document.getElementById('part-name').textContent=p.name;document.getElementById('part-file').textContent=p.id+'.3mf';document.getElementById('part-desc').textContent=p.desc;document.getElementById('part-detail').textContent=p.detail;document.getElementById('part-size').textContent='CAD 경계상자 '+MODEL_LIBRARY[p.id].sizeMm.map(x=>x.toFixed(1)).join(' × ')+' mm';sl.querySelector('[data-visual]').dataset.model=p.id;if(render&&current===11)DeckVisuals.mount(sl);}
 part(parts[0].id,false);
 function fit(){const v=document.getElementById('viewport');const scale=Math.min((v.clientWidth-20)/1600,(v.clientHeight-12)/900);stage.style.transform=`scale(${scale})`;DeckVisuals.resize();}
 function notes(){const d=slideInfo[current];document.getElementById('notes-title').textContent=`${current+1}. ${d.title}`;document.getElementById('notes-body').replaceChildren(slides[current].querySelector('.slide-notes').content.cloneNode(true));}
 function show(i){current=Math.max(0,Math.min(slides.length-1,i));slides.forEach((s,j)=>{s.classList.toggle('active',j===current);s.setAttribute('aria-hidden',j===current?'false':'true');s.inert=j!==current;});[...dots.children].forEach((b,j)=>{b.classList.toggle('active',j===current);b.setAttribute('aria-current',j===current?'step':'false');});document.getElementById('counter').textContent=String(current+1).padStart(2,'0')+' / 17';document.getElementById('section-label').textContent=slideInfo[current].section;document.getElementById('prev').disabled=current===0;document.getElementById('next').disabled=current===16;history.replaceState(null,'','#'+(current+1));notes();DeckVisuals.mount(slides[current]);document.getElementById('live-status').textContent=`${current+1}번 슬라이드, ${slideInfo[current].title}`;}
 function toggle(id){const e=document.getElementById(id);e.hidden=!e.hidden;if(!e.hidden)e.querySelector('button')?.focus();return !e.hidden;}
 function present(){presenting=!presenting;document.body.classList.toggle('presenting',presenting);document.body.classList.toggle('hide-memos',presenting);document.getElementById('present-button').textContent=presenting?'초안 모드':'발표 모드';document.getElementById('notes').hidden=true;}
 async function full(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){document.getElementById('live-status').textContent='전체 화면을 사용할 수 없습니다.';}}
 document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){document.getElementById('overview').hidden=true;show(Number(g.dataset.go)-1);}const p=e.target.closest('[data-part]');if(p)part(p.dataset.part);});
 document.getElementById('prev').onclick=()=>show(current-1);document.getElementById('next').onclick=()=>show(current+1);document.getElementById('overview-button').onclick=()=>toggle('overview');document.getElementById('close-overview').onclick=()=>{document.getElementById('overview').hidden=true;document.getElementById('overview-button').focus();};document.getElementById('notes-button').onclick=()=>toggle('notes');document.getElementById('close-notes').onclick=()=>{document.getElementById('notes').hidden=true;document.getElementById('notes-button').focus();};document.getElementById('present-button').onclick=present;document.getElementById('full-button').onclick=full;
 document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='Escape'){document.getElementById('overview').hidden=true;document.getElementById('notes').hidden=true;return;}if(!document.getElementById('overview').hidden)return;const k=e.key.toLowerCase();if(['arrowright','arrowdown','pagedown',' '].includes(k)){e.preventDefault();show(current+1);}else if(['arrowleft','arrowup','pageup'].includes(k)){e.preventDefault();show(current-1);}else if(k==='home')show(0);else if(k==='end')show(16);else if(k==='n')toggle('notes');else if(k==='o')toggle('overview');else if(k==='m')document.body.classList.toggle('hide-memos');else if(k==='p')present();else if(k==='f')full();});
 function machine(){const b=Number(document.getElementById('b-control').value),c=Number(document.getElementById('c-control').value);document.getElementById('b-value').textContent=b+'°';document.getElementById('c-value').textContent=c+'°';DeckVisuals.setMachine(b,c);}
 document.getElementById('b-control').addEventListener('input',machine);document.getElementById('c-control').addEventListener('input',machine);
 document.addEventListener('fullscreenchange',()=>{
   document.querySelector('.appbar').hidden=Boolean(document.fullscreenElement);
   fit();
 });
 window.addEventListener('resize',fit);window.addEventListener('hashchange',()=>{const n=parseInt(location.hash.slice(1),10);if(Number.isFinite(n))show(n-1);});
 window.DeckApp={show,slides,part,get current(){return current},fit};fit();show((parseInt(location.hash.slice(1),10)||1)-1);
})();
