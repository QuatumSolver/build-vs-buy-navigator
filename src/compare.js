// ---------- shared ----------
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CMP=JSON.parse(document.getElementById('compare-json').textContent);
const GLO=JSON.parse(document.getElementById('glossary-json').textContent);
const SRC_INDEX=new Map(); CMP.sources.forEach((s,i)=>SRC_INDEX.set(s.url,i+1));
function srcLinks(arr){
  if(!arr||!arr.length)return '';
  return '<span class="srcs">'+arr.map(u=>{
    if(!SRC_INDEX.has(u)){CMP.sources.push({title:u,url:u});SRC_INDEX.set(u,CMP.sources.length);}
    const n=SRC_INDEX.get(u);
    return `<a href="${esc(u)}" target="_blank" rel="noopener" title="${esc(CMP.sources[n-1].title)}">[${n}]</a>`;
  }).join('')+'</span>';
}
const SCALE=Object.fromEntries(CMP.scale.map(s=>[s.key,s]));
const rt=(r)=>`<span class="rt ${esc(r)}" title="${esc((SCALE[r]||{}).desc||'')}">${esc((SCALE[r]||{label:r}).label)}</span>`;
const stTag=s=>s?`<span class="st">${esc(s)}</span>`:'';
const RANK={strong:3,partial:2,gap:1};
const PROV=Object.fromEntries(CMP.providers.map(p=>[p.id,p]));
const VENA=PROV.vena;
const COMPETITORS=CMP.providers.filter(p=>p.id!=='vena');
const ALLCRIT=CMP.categories.flatMap(c=>c.criteria.map(k=>({...k,cat:c})));

// ---------- compare view ----------
let bannerOpen=window.innerWidth>720;
const cmpState={mode:'h2h',provider:'snowflake',cats:new Set(CMP.categories.map(c=>c.id)),cell:null};
try{const s=JSON.parse(localStorage.getItem('bvb-cmp')||'null');if(s&&PROV[s.provider]){cmpState.provider=s.provider;cmpState.mode=s.mode||'h2h';}}catch(e){}
function saveCmp(){try{localStorage.setItem('bvb-cmp',JSON.stringify({provider:cmpState.provider,mode:cmpState.mode}))}catch(e){}}

function tally(p){
  const t={strong:0,partial:0,gap:0,nd:0};
  ALLCRIT.filter(k=>k.rated!==false).forEach(k=>{const r=(p.ratings[k.id]||{}).r;if(t[r]!=null)t[r]++;});
  return t;
}
function headToHead(p){
  let vLead=0,pLead=0,tie=0;
  ALLCRIT.filter(k=>k.rated!==false).forEach(k=>{
    const a=RANK[(VENA.ratings[k.id]||{}).r], b=RANK[(p.ratings[k.id]||{}).r];
    if(!a||!b)return; if(a>b)vLead++; else if(b>a)pLead++; else tie++;
  });
  return {vLead,pLead,tie};
}
function cellHtml(c){
  if(!c)return rt('nd');
  return `<div>${rt(c.r)}${stTag(c.status)}</div><p>${esc(c.note)} ${srcLinks(c.src)}</p>`;
}
function catFilterHtml(){
  return `<div class="chips" role="group" aria-label="Categories">${CMP.categories.map(c=>`<button class="chip" data-cat="${c.id}" aria-pressed="${cmpState.cats.has(c.id)}">${esc(c.name)}</button>`).join('')}</div>`;
}
function legendHtml(){
  return `<div class="legend">${CMP.scale.map(s=>`<span>${rt(s.key)} ${esc(s.desc.split('.')[0])}</span>`).join('')}</div>`;
}
function renderH2H(){
  const p=PROV[cmpState.provider], h=headToHead(p), tv=tally(VENA), tp=tally(p);
  const rows=CMP.categories.filter(c=>cmpState.cats.has(c.id)).map(c=>
    `<tr class="cat"><td colspan="3">${esc(c.name)}</td></tr>`+
    c.criteria.map(k=>`<tr id="crit-${k.id}"><td class="crit">${esc(k.name)}<small>${esc(k.desc||'')}</small></td><td class="cell">${cellHtml(VENA.ratings[k.id])}</td><td class="cell">${cellHtml(p.ratings[k.id])}</td></tr>`).join('')
  ).join('');
  return `
  <div class="card"><div class="h2h-head">
    <div><div class="eyebrow">Head to head</div><h2 style="font-size:24px;margin:4px 0 8px">Vena ${esc(p.headline)}</h2><p class="muted" style="font-size:14.5px;max-width:75ch">${esc(p.summary)}</p></div>
    <div class="score">
      <div class="s"><b style="color:var(--accent-deep)">${h.vLead}</b><small>criteria Vena leads</small></div>
      <div class="s"><b style="color:var(--warn)">${h.pLead}</b><small>criteria ${esc(p.short)} leads</small></div>
      <div class="s"><b>${h.tie}</b><small>at parity</small></div>
    </div></div>
    <p class="muted" style="font-size:12.5px;margin-top:10px">Counts compare rated criteria where both sides have a rating. Not documented cells are left out. Vena strong on ${tv.strong}, ${esc(p.short)} strong on ${tp.strong}.</p>
  </div>
  <div class="ll">
    <div class="card lead-c"><div class="eyebrow">Where Vena leads</div><ul>${p.leads.map(x=>`<li>${esc(x.text)} ${srcLinks(x.src)}</li>`).join('')}</ul></div>
    <div class="card lag-c"><div class="eyebrow" style="color:var(--amber)">Where Vena lags or is at parity</div><ul>${p.lags.map(x=>`<li>${esc(x.text)} ${srcLinks(x.src)}</li>`).join('')}</ul></div>
  </div>
  <div class="ll">
    <div class="card"><div class="eyebrow">Talk track</div><h2 style="margin:4px 0 10px">What to say</h2><div class="talk">${p.talkTrack.map(t=>`<div>${esc(t)}</div>`).join('')}</div></div>
    <div class="card"><div class="eyebrow">If they build on ${esc(p.short)}</div><h2 style="margin:4px 0 10px">What they still have to build</h2><ul class="plain">${p.build.map(b=>`<li>${esc(b)}</li>`).join('')}</ul></div>
  </div>
  <div class="card"><div class="eyebrow">${esc(p.short)} tools that map to Morpheo and Omega</div><h2 style="margin:4px 0 12px">Their stack</h2>
    <div class="tbl"><table class="tools"><thead><tr><th>Tool</th><th>What it does</th><th>Competes with</th><th>Status</th></tr></thead><tbody>
    ${p.tools.map(t=>`<tr><td><a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.name)}</a></td><td>${esc(t.what)}</td><td>${esc(t.mapsTo)}</td><td><span class="st" style="margin:0">${esc(t.status)}</span> <span class="muted" style="font-size:12px">${esc(t.date||'')}</span></td></tr>`).join('')}
    </tbody></table></div></div>
  <div class="card"><div class="eyebrow">Criterion by criterion</div><h2 style="margin:4px 0 10px">Vena vs ${esc(p.short)}</h2>
    ${catFilterHtml()}<div style="height:10px"></div>
    <div class="mtx"><table><thead><tr><th>Criterion</th><th>Vena (Morpheo / Omega)</th><th>${esc(p.name)}</th></tr></thead><tbody>${rows}</tbody></table></div>
  </div>`;
}
function renderMaster(){
  const cols=CMP.providers;
  const sel=cmpState.cell;
  let pop='<div class="cellpop muted">Select any rating to see the note and sources. Select a platform name to open its head to head.</div>';
  if(sel){const p=PROV[sel.p],k=ALLCRIT.find(x=>x.id===sel.k),c=p.ratings[sel.k]||{};
    pop=`<div class="cellpop"><b>${esc(p.short)}</b> on <b>${esc(k.name)}</b><div style="margin-top:6px">${rt(c.r)}${stTag(c.status)}</div><p style="margin-top:6px">${esc(c.note)} ${srcLinks(c.src)}</p></div>`;}
  const rows=CMP.categories.filter(c=>cmpState.cats.has(c.id)).map(c=>
    `<tr class="cat"><td colspan="${cols.length+1}">${esc(c.name)}</td></tr>`+
    c.criteria.map(k=>`<tr><td class="crit">${esc(k.code?k.code+' ':'')}${esc(k.name)}</td>${cols.map(p=>{const r=(p.ratings[k.id]||{}).r||'nd';return `<td class="cell ${p.id==='vena'?'vena':''}"><button data-p="${p.id}" data-k="${k.id}" aria-label="${esc(p.short+' '+k.name)}">${rt(r)}</button></td>`}).join('')}</tr>`).join('')
  ).join('');
  const strongRow=`<tr><td class="crit">Strong ratings</td>${cols.map(p=>`<td class="cell ${p.id==='vena'?'vena':''}"><b>${tally(p).strong}</b></td>`).join('')}</tr>`;
  return `<div class="card"><div class="eyebrow">All platforms</div><h2 style="margin:4px 0 6px">Master matrix</h2>
    <p class="muted" style="font-size:14px;margin-bottom:12px">Every platform rated on the same ${ALLCRIT.length} criteria. Data platforms are strong on context and agents, weak on planning. Vena is the reverse today.</p>
    ${catFilterHtml()}<div style="height:12px"></div>${pop}<div style="height:12px"></div>
    <div class="mtx master"><table><thead><tr><th>Criterion</th>${cols.map(p=>`<th class="pv ${p.id==='vena'?'vena':''}">${p.id==='vena'?'Vena':`<button data-open="${p.id}">${esc(p.short)}</button>`}</th>`).join('')}</tr></thead>
    <tbody>${rows}${strongRow}</tbody></table></div></div>`;
}
function renderExtras(){
  return `
  <details class="more"><summary>Planning vendors and semantic layers on the lakehouse</summary>
    <p class="muted" style="font-size:14px;margin-bottom:10px">The buy-on-platform alternatives. Most planning vendors still copy data into their own engine.</p>
    <div class="tbl"><table><thead><tr><th>Name</th><th>Type</th><th>How it reaches lakehouse data</th><th>Context or memory claim</th><th>Status</th></tr></thead><tbody>
    ${CMP.alternatives.map(a=>`<tr><td>${esc(a.name)}</td><td>${esc(a.type)}</td><td>${esc(a.lakehouse)} ${srcLinks(a.src)}</td><td>${esc(a.memory)}</td><td>${esc(a.status)}</td></tr>`).join('')}
    </tbody></table></div></details>
  <details class="more"><summary>Work effort to build FP&amp;A planning in-house</summary>
    <p class="muted" style="font-size:14px;margin-bottom:10px">${esc(CMP.effortNote)}</p>
    <div class="tbl"><table><thead><tr><th>Component</th><th>What it takes</th><th>Complexity</th><th>Evidence</th></tr></thead><tbody>
    ${CMP.effort.map(e=>`<tr><td>${esc(e.component)}</td><td>${esc(e.whatItTakes)}</td><td>${esc(e.complexity)}</td><td>${esc(e.evidence)} ${srcLinks(e.src)}</td></tr>`).join('')}
    </tbody></table></div></details>
  <details class="more"><summary>Open questions for Vena before using this externally</summary>
    <ul class="plain">${CMP.openQuestions.map(q=>`<li>${esc(q)}</li>`).join('')}</ul></details>
  <details class="more"><summary>Where sources disagree, and the safe wording</summary>
    <div class="tbl"><table><thead><tr><th>Item</th><th>Conflict</th><th>Say this</th></tr></thead><tbody>
    ${CMP.conflicts.map(c=>`<tr><td>${esc(c.item)}</td><td>${esc(c.detail)} ${srcLinks(c.src)}</td><td>${esc(c.safeWording)}</td></tr>`).join('')}
    </tbody></table></div></details>
  <details class="more" id="cmp-sources"><summary>Sources (${CMP.sources.length})</summary>
    <ol>${CMP.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ol></details>`;
}
function renderCompare(){
  const host=document.getElementById('view-compare');
  host.innerHTML=`<div class="cmp">
    <details class="banner" ${bannerOpen?'open':''}><summary>Read before using this with a customer</summary>
      <ul>${CMP.caveats.map(c=>`<li>${esc(c.text)} ${srcLinks(c.src)}</li>`).join('')}</ul>
      <p class="muted" style="font-size:12.5px;margin-top:8px">Research as of ${esc(CMP.asOf)}. Ratings come from public sources only. Preview and announced features never score Strong, for Vena or anyone else.</p></details>
    <div class="card" style="display:grid;gap:12px">
      <div class="chips" role="group" aria-label="View">
        <button class="chip" data-mode="master" aria-pressed="${cmpState.mode==='master'}">All platforms</button>
        ${COMPETITORS.map(p=>`<button class="chip" data-prov="${p.id}" aria-pressed="${cmpState.mode==='h2h'&&cmpState.provider===p.id}">Vena vs ${esc(p.short)}</button>`).join('')}
      </div>
      ${legendHtml()}
    </div>
    ${cmpState.mode==='master'?renderMaster():renderH2H()}
    ${renderExtras()}
  </div>`;
  host.querySelector('.banner').addEventListener('toggle',e=>{bannerOpen=e.target.open;});
  host.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{cmpState.mode='master';cmpState.cell=null;saveCmp();renderCompare();});
  host.querySelectorAll('[data-prov]').forEach(b=>b.onclick=()=>{cmpState.mode='h2h';cmpState.provider=b.dataset.prov;saveCmp();renderCompare();});
  host.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{cmpState.mode='h2h';cmpState.provider=b.dataset.open;saveCmp();renderCompare();host.scrollIntoView({behavior:'smooth'});});
  host.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{const c=b.dataset.cat;if(cmpState.cats.has(c)&&cmpState.cats.size>1)cmpState.cats.delete(c);else cmpState.cats.add(c);renderCompare();});
  host.querySelectorAll('.mtx.master td.cell button').forEach(b=>b.onclick=()=>{cmpState.cell={p:b.dataset.p,k:b.dataset.k};renderCompare();});
}

// ---------- glossary ----------
const glState={q:'',cat:'All',mode:'both'};
const GL_CATS=['All',...Array.from(new Set(GLO.map(g=>g.category)))];
const slug=s=>'g-'+String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-');
let glBuilt=false;
function glMatches(g){
  if(glState.cat!=='All'&&g.category!==glState.cat)return false;
  const q=glState.q.trim().toLowerCase(); if(!q)return true;
  return [g.term,...(g.aka||[]),g.technical,g.sales].join(' ').toLowerCase().includes(q);
}
function renderGlossaryList(){
  const list=GLO.filter(glMatches);
  const q=glState.q.trim().toLowerCase();
  list.sort((a,b)=>{ if(q){const at=a.term.toLowerCase().startsWith(q)||(a.aka||[]).some(x=>x.toLowerCase().startsWith(q)), bt=b.term.toLowerCase().startsWith(q)||(b.aka||[]).some(x=>x.toLowerCase().startsWith(q)); if(at!==bt)return at?-1:1;} return a.term.localeCompare(b.term); });
  document.getElementById('gl-count').textContent=`${list.length} of ${GLO.length} terms`;
  const host=document.getElementById('gl-list');
  if(!list.length){host.innerHTML=`<div class="empty">No terms match "${esc(glState.q)}". Try a shorter word or pick All.</div>`;return;}
  const known=new Set(GLO.map(g=>g.term));
  host.innerHTML=list.map(g=>`<article class="term" id="${slug(g.term)}">
    <div><h3>${esc(g.term)}</h3>${g.aka&&g.aka.length?`<div class="aka">Also called ${esc(g.aka.join(', '))}</div>`:''}</div>
    ${glState.mode!=='tech'?`<div class="def sales"><b>In plain terms</b>${esc(g.sales)}</div>`:''}
    ${glState.mode!=='sales'?`<div class="def"><b>Technical</b>${esc(g.technical)}</div>`:''}
    ${g.related&&g.related.length?`<div class="rel">${g.related.filter(r=>known.has(r)).map(r=>`<button data-rel="${esc(r)}">${esc(r)}</button>`).join('')}</div>`:''}
    <div class="foot"><span class="pill">${esc(g.category)}</span>${g.src?`<a href="${esc(g.src)}" target="_blank" rel="noopener">Source</a>`:''}</div>
  </article>`).join('');
  host.querySelectorAll('[data-rel]').forEach(b=>b.onclick=()=>jumpToTerm(b.dataset.rel));
}
function jumpToTerm(t){
  glState.q='';glState.cat='All';
  document.getElementById('gl-q').value='';
  document.querySelectorAll('#gl-cats .chip').forEach(c=>c.setAttribute('aria-pressed',c.dataset.gcat==='All'));
  renderGlossaryList();
  const el=document.getElementById(slug(t)); if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'center'}); el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),1600);
}
function renderGlossary(){
  if(glBuilt)return; glBuilt=true;
  const host=document.getElementById('view-glossary');
  host.innerHTML=`<div class="gl-tools">
    <div class="gl-search"><input id="gl-q" type="search" placeholder="Search a term, like semantic layer, Genie or write-back" aria-label="Search the glossary" autocomplete="off">
      <div class="seg" role="group" aria-label="Definition view">
        <button data-gmode="both" aria-pressed="true">Both</button><button data-gmode="sales" aria-pressed="false">Plain terms</button><button data-gmode="tech" aria-pressed="false">Technical</button>
      </div><span class="hint" id="gl-count"></span></div>
    <div class="chips" id="gl-cats">${GL_CATS.map(c=>`<button class="chip" data-gcat="${esc(c)}" aria-pressed="${c==='All'}">${esc(c)}${c!=='All'?`<small>${GLO.filter(g=>g.category===c).length}</small>`:''}</button>`).join('')}</div>
  </div><div class="gl-list" id="gl-list"></div>`;
  const q=host.querySelector('#gl-q'); q.addEventListener('input',()=>{glState.q=q.value;renderGlossaryList();});
  host.querySelectorAll('[data-gcat]').forEach(b=>b.onclick=()=>{glState.cat=b.dataset.gcat;host.querySelectorAll('[data-gcat]').forEach(x=>x.setAttribute('aria-pressed',x===b));renderGlossaryList();});
  host.querySelectorAll('[data-gmode]').forEach(b=>b.onclick=()=>{glState.mode=b.dataset.gmode;host.querySelectorAll('[data-gmode]').forEach(x=>x.setAttribute('aria-pressed',x===b));renderGlossaryList();});
  renderGlossaryList();
}
