// ---------- shared ----------
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CMP=JSON.parse(document.getElementById('compare-json').textContent);
const GLO=JSON.parse(document.getElementById('glossary-json').textContent);
const GLO_GEN=JSON.parse(document.getElementById('glossary-general-json').textContent);
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
const RATED=ALLCRIT.filter(k=>k.rated!==false);
const PCOLOR={vena:'#4A9462',snowflake:'#29B5E8',databricks:'#E8492B',fabric:'#117865',google:'#4285F4',aws:'#E89A1A',sap:'#0A6ED1',palantir:'#7B7F86'};
const avatar=(p,size=34)=>`<span class="pav" style="--pc:${PCOLOR[p.id]||'#888'};width:${size}px;height:${size}px">${esc(p.short.slice(0,2))}</span>`;
function store(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function load(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
const toggleIn=(arr,v)=>arr.includes(v)?arr.filter(x=>x!==v):[...arr,v];

// capability groups for tools
const CAPS=[
  {id:'context',name:'Context and memory',re:/semantic|definition|context|learning|memory|ontology|glossary/i},
  {id:'planning',name:'Planning and write-back',re:/planning|write|workflow|consolidation|excel|input|approval/i},
  {id:'ai',name:'AI and agents',re:/natural language|agent|mcp|forecast|query/i},
  {id:'data',name:'Data and integration',re:/ingestion|data access|deployment|sharing/i},
  {id:'commercial',name:'Commercial',re:/pricing/i},
];
const capOf=t=>(CAPS.find(c=>c.re.test(t.mapsTo))||CAPS[3]).id;
const statusGroup=s=>/^GA/i.test(s||'')?'GA':/preview/i.test(s||'')?'Preview':/beta/i.test(s||'')?'Beta':'Other';
const TOOLS=COMPETITORS.flatMap(p=>p.tools.map(t=>({...t,p,cap:capOf(t),sg:statusGroup(t.status)})));

function catScore(p,catId){const ks=RATED.filter(k=>k.cat.id===catId);let sum=0,n=0;ks.forEach(k=>{const r=RANK[(p.ratings[k.id]||{}).r];if(r){sum+=r;n++;}});return n?sum/n:0;}
function tally(p){const t={strong:0,partial:0,gap:0,nd:0};RATED.forEach(k=>{const r=(p.ratings[k.id]||{}).r;if(t[r]!=null)t[r]++;});return t;}
function headToHead(p){let vLead=0,pLead=0,tie=0;RATED.forEach(k=>{const a=RANK[(VENA.ratings[k.id]||{}).r],b=RANK[(p.ratings[k.id]||{}).r];if(!a||!b)return;if(a>b)vLead++;else if(b>a)pLead++;else tie++;});return {vLead,pLead,tie};}
const MAINCATS=[['context','Context'],['ai','AI and agents'],['planning','Planning'],['data','Data']];
const PLAN_STRONG=CMP.categories.find(c=>c.id==='planning').criteria.filter(k=>(VENA.ratings[k.id]||{}).r==='strong').length;

// ---------- compare state ----------
const cs=Object.assign({sec:'overview',provider:'snowflake',mProv:COMPETITORS.map(p=>p.id),cats:CMP.categories.map(c=>c.id),notes:false,diff:false,tPlat:[],tCap:[],tStat:[],tq:''},load('bvb-cmp2')||{});
cs.cell=null; cs.banner=window.innerWidth>720;
const saveCs=()=>store('bvb-cmp2',{sec:cs.sec,provider:cs.provider,mProv:cs.mProv,cats:cs.cats,notes:cs.notes,diff:cs.diff,tPlat:cs.tPlat,tCap:cs.tCap,tStat:cs.tStat});
const SECS=[['overview','Overview'],['h2h','Head to head'],['tools','Tool finder'],['matrix','Matrix'],['effort','Build effort'],['evidence','Caveats and sources']];

function legendHtml(){return `<div class="legend">${CMP.scale.filter(s=>s.key!=='info').map(s=>`<span>${rt(s.key)}</span>`).join('')}<span class="muted">Hover a rating for its meaning</span></div>`;}
function cellHtml(c){if(!c)return rt('nd');return `<div>${rt(c.r)}${stTag(c.status)}</div><p>${esc(c.note)} ${srcLinks(c.src)}</p>`;}
function bars(p){
  return `<div class="cbars">${MAINCATS.map(([id,n])=>{const v=catScore(VENA,id),o=catScore(p,id);return `<div class="cbar"><span class="cl">${n}</span>
    <span class="track"><i style="width:${(v/3*100).toFixed(0)}%;background:var(--accent)"></i></span>
    <span class="track"><i style="width:${(o/3*100).toFixed(0)}%;background:${PCOLOR[p.id]}"></i></span></div>`}).join('')}</div>`;
}
function catChips(){return `<div class="chips" role="group" aria-label="Categories">${CMP.categories.map(c=>`<button class="chip sm" data-cat="${c.id}" aria-pressed="${cs.cats.includes(c.id)}">${esc(c.name)}</button>`).join('')}</div>`;}

function secOverview(){
  return `<div class="ov-grid">${COMPETITORS.map(p=>{const h=headToHead(p);return `<button class="pcard" data-goh2h="${p.id}">
    <div class="pc-top">${avatar(p,38)}<div><b>${esc(p.short)}</b><small>${esc(p.headline.replace(/^vs /,''))}</small></div></div>
    <div class="pc-score"><span class="win">${h.vLead}<small>Vena leads</small></span><span class="lose">${h.pLead}<small>${esc(p.short)} leads</small></span><span>${h.tie}<small>parity</small></span></div>
    <div class="pc-legend"><span><i style="background:var(--accent)"></i>Vena</span><span><i style="background:${PCOLOR[p.id]}"></i>${esc(p.short)}</span></div>
    ${bars(p)}
    <p class="pc-sum">${esc(p.summary)}</p><span class="pc-go">Open head to head</span></button>`}).join('')}</div>
  <div class="card shape"><div class="eyebrow">The shape of the market</div><h2 style="margin:4px 0 8px">Platforms ship context. Vena ships planning, and now context too.</h2>
    <p class="muted" style="max-width:80ch;font-size:14.5px">Snowflake, Databricks, Google and AWS sell semantic layers, agents and MCP servers but no planning application. Microsoft (Fabric Planning) and SAP (Analytics Cloud) are the only platforms that ship both halves. Vena rates strong on ${PLAN_STRONG} of 9 planning criteria, and with Omega GA it adds memory of the planning process itself, which no platform documents.</p></div>`;
}
function toolCard(t,showPlat=true){
  const capN=(CAPS.find(c=>c.id===t.cap)||{}).name;
  return `<article class="tcard" style="--pc:${PCOLOR[t.p.id]}">
    <div class="tc-top">${showPlat?avatar(t.p,28):''}<div style="min-width:0;flex:1"><a href="${esc(t.url)}" target="_blank" rel="noopener"><b>${esc(t.name)}</b></a>${showPlat?`<small>${esc(t.p.short)}</small>`:''}</div>
    <span class="sg ${t.sg.toLowerCase()}">${esc(t.status||'')}</span></div>
    <p>${esc(t.what)}</p>
    <div class="tc-foot"><span class="cap">${esc(capN)}</span><span class="muted">Competes with ${esc(t.mapsTo)}</span></div>
    ${showPlat?`<button class="linkbtn" data-goh2h="${t.p.id}">Vena vs ${esc(t.p.short)}</button>`:''}</article>`;
}
function secH2H(){
  const p=PROV[cs.provider],h=headToHead(p);
  const rows=CMP.categories.filter(c=>cs.cats.includes(c.id)).map(c=>`<tr class="cat"><td colspan="3">${esc(c.name)}</td></tr>`+c.criteria.map(k=>`<tr><td class="crit">${esc(k.name)}<small>${esc(k.desc||'')}</small></td><td class="cell">${cellHtml(VENA.ratings[k.id])}</td><td class="cell">${cellHtml(p.ratings[k.id])}</td></tr>`).join('')).join('');
  return `<div class="chips" role="group" aria-label="Platform">${COMPETITORS.map(x=>`<button class="chip pchip" data-prov="${x.id}" aria-pressed="${x.id===cs.provider}" style="--pc:${PCOLOR[x.id]}">${esc(x.short)}</button>`).join('')}</div>
  <div class="card"><div class="h2h-head"><div style="display:flex;gap:14px;align-items:flex-start">${avatar(p,46)}<div><div class="eyebrow">Head to head</div><h2 style="font-size:24px;margin:4px 0 8px">Vena ${esc(p.headline)}</h2><p class="muted" style="font-size:14.5px;max-width:75ch">${esc(p.summary)}</p></div></div>
    <div class="score"><div class="s"><b style="color:var(--accent-deep)">${h.vLead}</b><small>Vena leads</small></div><div class="s"><b style="color:var(--warn)">${h.pLead}</b><small>${esc(p.short)} leads</small></div><div class="s"><b>${h.tie}</b><small>parity</small></div></div></div>
    <div style="margin-top:14px">${bars(p)}</div></div>
  <div class="ll"><div class="card lead-c"><div class="eyebrow">Where Vena leads</div><ul>${p.leads.map(x=>`<li>${esc(x.text)} ${srcLinks(x.src)}</li>`).join('')}</ul></div>
    <div class="card lag-c"><div class="eyebrow" style="color:var(--amber)">Where Vena lags or is at parity</div><ul>${p.lags.map(x=>`<li>${esc(x.text)} ${srcLinks(x.src)}</li>`).join('')}</ul></div></div>
  <div class="ll"><div class="card"><div class="eyebrow">Talk track</div><h2 style="margin:4px 0 10px">What to say</h2><div class="talk">${p.talkTrack.map(t=>`<div>${esc(t)}</div>`).join('')}</div></div>
    <div class="card"><div class="eyebrow">If they build on ${esc(p.short)}</div><h2 style="margin:4px 0 10px">What they still have to build</h2><ul class="plain checks">${p.build.map(b=>`<li>${esc(b)}</li>`).join('')}</ul></div></div>
  <div class="card"><div class="eyebrow">${esc(p.short)} tools that map to Morpheo and Omega</div><h2 style="margin:4px 0 12px">Their stack</h2>
    <div class="tgrid">${p.tools.map(t=>toolCard({...t,p,cap:capOf(t),sg:statusGroup(t.status)},false)).join('')}</div></div>
  <div class="card"><div class="eyebrow">Criterion by criterion</div><h2 style="margin:4px 0 10px">Vena vs ${esc(p.short)}</h2>${catChips()}<div style="height:10px"></div>
    <div class="mtx"><table><thead><tr><th>Criterion</th><th>Vena (Morpheo / Omega)</th><th>${esc(p.name)}</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function secTools(){
  const q=cs.tq.trim().toLowerCase();
  const list=TOOLS.filter(t=>(!cs.tPlat.length||cs.tPlat.includes(t.p.id))&&(!cs.tCap.length||cs.tCap.includes(t.cap))&&(!cs.tStat.length||cs.tStat.includes(t.sg))&&(!q||[t.name,t.what,t.mapsTo,t.p.short].join(' ').toLowerCase().includes(q)));
  const stats=['GA','Preview','Beta','Other'];
  const any=cs.tPlat.length||cs.tCap.length||cs.tStat.length||cs.tq;
  return `<div class="card filters">
    <div class="gl-search"><input id="tq" type="search" placeholder="Search tools, like Genie, Cortex, memory or write-back" value="${esc(cs.tq)}" aria-label="Search tools" autocomplete="off"><span class="hint">${list.length} of ${TOOLS.length} tools</span>${any?'<button class="linkbtn" data-tclear="1">Clear filters</button>':''}</div>
    <div class="frow"><span class="flabel">Platform</span><div class="chips">${COMPETITORS.map(p=>`<button class="chip sm pchip" data-tplat="${p.id}" aria-pressed="${cs.tPlat.includes(p.id)}" style="--pc:${PCOLOR[p.id]}">${esc(p.short)} <small>${p.tools.length}</small></button>`).join('')}</div></div>
    <div class="frow"><span class="flabel">Capability</span><div class="chips">${CAPS.map(c=>`<button class="chip sm" data-tcap="${c.id}" aria-pressed="${cs.tCap.includes(c.id)}">${esc(c.name)} <small>${TOOLS.filter(t=>t.cap===c.id).length}</small></button>`).join('')}</div></div>
    <div class="frow"><span class="flabel">Status</span><div class="chips">${stats.map(s=>`<button class="chip sm" data-tstat="${s}" aria-pressed="${cs.tStat.includes(s)}">${s} <small>${TOOLS.filter(t=>t.sg===s).length}</small></button>`).join('')}</div></div>
  </div>
  <div class="tgrid">${list.map(t=>toolCard(t)).join('')||'<div class="empty">No tools match. Clear a filter or shorten the search.</div>'}</div>`;
}
function secMatrix(){
  const cols=[VENA,...COMPETITORS.filter(p=>cs.mProv.includes(p.id))];
  const differs=k=>{const v=RANK[(VENA.ratings[k.id]||{}).r];return cols.slice(1).some(p=>{const o=RANK[(p.ratings[k.id]||{}).r];return v&&o&&v!==o;});};
  let pop='<div class="cellpop muted">Select any rating to see the note and sources. Select a platform name to open its head to head.</div>';
  if(cs.cell){const p=PROV[cs.cell.p],k=ALLCRIT.find(x=>x.id===cs.cell.k),c=p.ratings[cs.cell.k]||{};pop=`<div class="cellpop">${avatar(p,24)} <b>${esc(p.short)}</b> on <b>${esc(k.name)}</b><div style="margin-top:6px">${rt(c.r)}${stTag(c.status)}</div><p style="margin-top:6px">${esc(c.note)} ${srcLinks(c.src)}</p></div>`;}
  const rows=CMP.categories.filter(c=>cs.cats.includes(c.id)).map(c=>{const ks=c.criteria.filter(k=>!cs.diff||differs(k));if(!ks.length)return '';return `<tr class="cat"><td colspan="${cols.length+1}">${esc(c.name)}</td></tr>`+ks.map(k=>`<tr><td class="crit">${esc(k.name)}</td>${cols.map(p=>{const c2=p.ratings[k.id]||{r:'nd'};return `<td class="cell ${p.id==='vena'?'vena':''}"><button data-p="${p.id}" data-k="${k.id}" aria-label="${esc(p.short+' '+k.name)}">${rt(c2.r)}</button>${cs.notes?`<p>${esc(c2.note)}</p>`:''}</td>`}).join('')}</tr>`).join('')}).join('');
  return `<div class="card filters">
    <div class="frow"><span class="flabel">Platforms</span><div class="chips">${COMPETITORS.map(p=>`<button class="chip sm pchip" data-mprov="${p.id}" aria-pressed="${cs.mProv.includes(p.id)}" style="--pc:${PCOLOR[p.id]}">${esc(p.short)}</button>`).join('')}</div></div>
    <div class="frow"><span class="flabel">Categories</span>${catChips()}</div>
    <div class="frow"><span class="flabel">View</span><div class="chips"><button class="chip sm" data-mnotes="1" aria-pressed="${cs.notes}">Show notes in cells</button><button class="chip sm" data-mdiff="1" aria-pressed="${cs.diff}">Only rows where Vena differs</button></div></div>
    ${legendHtml()}</div>
  ${pop}
  <div class="mtx master ${cs.notes?'withnotes':''}"><table><thead><tr><th>Criterion</th>${cols.map(p=>`<th class="pv ${p.id==='vena'?'vena':''}">${p.id==='vena'?'Vena':`<button data-goh2h="${p.id}">${esc(p.short)}</button>`}</th>`).join('')}</tr></thead>
  <tbody>${rows}<tr class="tot"><td class="crit">Strong ratings</td>${cols.map(p=>`<td class="cell ${p.id==='vena'?'vena':''}"><b>${tally(p).strong}</b></td>`).join('')}</tr></tbody></table></div>`;
}
function secEffort(){
  return `<div class="card"><div class="eyebrow">If they build it themselves</div><h2 style="margin:4px 0 8px">What building FP&amp;A planning on a lakehouse takes</h2><p class="muted" style="font-size:14px;max-width:80ch;margin-bottom:12px">${esc(CMP.effortNote)}</p>
    <div class="effort">${CMP.effort.map(e=>{const lvl=/high/i.test(e.complexity)?'high':/medium/i.test(e.complexity)?'med':'low';return `<div class="ef"><div class="ef-top"><b>${esc(e.component)}</b><span class="lvl ${lvl}">${esc(e.complexity)}</span></div><p>${esc(e.whatItTakes)}</p><small class="muted">${esc(e.evidence)} ${srcLinks(e.src)}</small></div>`}).join('')}</div></div>
  <div class="card"><div class="eyebrow">Buy on the platform</div><h2 style="margin:4px 0 8px">Planning vendors and semantic layers that connect to lakehouses</h2><p class="muted" style="font-size:14px;margin-bottom:10px">Most planning vendors still copy data into their own engine.</p>
    <div class="tbl"><table><thead><tr><th>Name</th><th>Type</th><th>How it reaches lakehouse data</th><th>Context or memory claim</th><th>Status</th></tr></thead><tbody>
    ${CMP.alternatives.map(a=>`<tr><td>${esc(a.name)}</td><td>${esc(a.type)}</td><td>${esc(a.lakehouse)} ${srcLinks(a.src)}</td><td>${esc(a.memory)}</td><td>${esc(a.status)}</td></tr>`).join('')}
    </tbody></table></div></div>`;
}
function secEvidence(){
  return `<div class="card"><div class="eyebrow">Before you use this with a customer</div><h2 style="margin:4px 0 10px">Caveats</h2><ul class="plain">${CMP.caveats.map(c=>`<li>${esc(c.text)} ${srcLinks(c.src)}</li>`).join('')}</ul></div>
  <div class="card"><div class="eyebrow">Where sources disagree</div><h2 style="margin:4px 0 10px">Safe wording</h2><div class="tbl"><table><thead><tr><th>Item</th><th>Conflict</th><th>Say this</th></tr></thead><tbody>${CMP.conflicts.map(c=>`<tr><td>${esc(c.item)}</td><td>${esc(c.detail)} ${srcLinks(c.src)}</td><td>${esc(c.safeWording)}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card"><div class="eyebrow">Internal</div><h2 style="margin:4px 0 10px">Open questions for Vena</h2><ul class="plain">${CMP.openQuestions.map(q=>`<li>${esc(q)}</li>`).join('')}</ul></div>
  <div class="card"><div class="eyebrow">Audit trail</div><h2 style="margin:4px 0 10px">Sources (${CMP.sources.length})</h2><ol class="srclist">${CMP.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ol></div>`;
}
function renderCompare(){
  const host=document.getElementById('view-compare');
  const body={overview:secOverview,h2h:secH2H,tools:secTools,matrix:secMatrix,effort:secEffort,evidence:secEvidence}[cs.sec]||secOverview;
  const ae=document.activeElement, focusTq=ae&&ae.id==='tq', caret=focusTq?ae.selectionStart:null;
  host.innerHTML=`<div class="cmp">
    <section class="xhero"><div><div class="eyebrow">Compare platforms</div><h2>Morpheo and Omega vs the data platforms</h2>
      <p>What Snowflake, Databricks, Microsoft, Google, AWS, SAP and Palantir actually ship, rated on the same ${ALLCRIT.length} criteria, with every rating linked to its source.</p></div>
      <div class="xstats"><div><b>${COMPETITORS.length}</b><small>platforms</small></div><div><b>${TOOLS.length}</b><small>tools tracked</small></div><div><b>${ALLCRIT.length}</b><small>criteria</small></div><div><b>${CMP.sources.length}</b><small>sources</small></div></div></section>
    <details class="banner" ${cs.banner?'open':''}><summary>Read before using this with a customer</summary><ul>${CMP.caveats.slice(0,4).map(c=>`<li>${esc(c.text)}</li>`).join('')}</ul><p class="muted" style="font-size:12.5px;margin-top:8px">Research as of ${esc(CMP.asOf)}. Public sources only. Full caveats and sources are under Caveats and sources.</p></details>
    <nav class="subnav" role="tablist" aria-label="Compare sections">${SECS.map(([id,n])=>`<button role="tab" data-sec="${id}" aria-selected="${cs.sec===id}">${n}</button>`).join('')}</nav>
    ${body()}
  </div>`;
  const $=s=>host.querySelectorAll(s);
  host.querySelector('.banner').addEventListener('toggle',e=>{cs.banner=e.target.open;});
  $('[data-sec]').forEach(b=>b.onclick=()=>{cs.sec=b.dataset.sec;cs.cell=null;saveCs();renderCompare();});
  $('[data-goh2h]').forEach(b=>b.onclick=()=>{cs.sec='h2h';cs.provider=b.dataset.goh2h;saveCs();renderCompare();host.scrollIntoView({behavior:'smooth'});});
  $('[data-prov]').forEach(b=>b.onclick=()=>{cs.provider=b.dataset.prov;saveCs();renderCompare();});
  $('[data-cat]').forEach(b=>b.onclick=()=>{const c=b.dataset.cat;if(cs.cats.includes(c)){if(cs.cats.length>1)cs.cats=cs.cats.filter(x=>x!==c);}else cs.cats=[...cs.cats,c];saveCs();renderCompare();});
  $('[data-mprov]').forEach(b=>b.onclick=()=>{const n=toggleIn(cs.mProv,b.dataset.mprov);if(n.length)cs.mProv=n;saveCs();renderCompare();});
  $('[data-mnotes]').forEach(b=>b.onclick=()=>{cs.notes=!cs.notes;saveCs();renderCompare();});
  $('[data-mdiff]').forEach(b=>b.onclick=()=>{cs.diff=!cs.diff;saveCs();renderCompare();});
  $('.mtx.master td.cell button').forEach(b=>b.onclick=()=>{cs.cell={p:b.dataset.p,k:b.dataset.k};renderCompare();});
  $('[data-tplat]').forEach(b=>b.onclick=()=>{cs.tPlat=toggleIn(cs.tPlat,b.dataset.tplat);saveCs();renderCompare();});
  $('[data-tcap]').forEach(b=>b.onclick=()=>{cs.tCap=toggleIn(cs.tCap,b.dataset.tcap);saveCs();renderCompare();});
  $('[data-tstat]').forEach(b=>b.onclick=()=>{cs.tStat=toggleIn(cs.tStat,b.dataset.tstat);saveCs();renderCompare();});
  $('[data-tclear]').forEach(b=>b.onclick=()=>{cs.tPlat=[];cs.tCap=[];cs.tStat=[];cs.tq='';saveCs();renderCompare();});
  const tq=host.querySelector('#tq'); if(tq){tq.addEventListener('input',()=>{cs.tq=tq.value;renderCompare();}); if(focusTq){tq.focus();if(caret!=null)tq.setSelectionRange(caret,caret);}}
}
function openCompare(sec,provider){if(provider)cs.provider=provider;if(sec)cs.sec=sec;saveCs();showView('compare');window.scrollTo({top:0,behavior:'smooth'});}

// ---------- glossaries ----------
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-');
const firstLetter=t=>{const c=t.trim()[0].toUpperCase();return /[A-Z]/.test(c)?c:'#';};
const TERM_HOME=new Map(); // term -> glossary id
const GLOSSARIES={};
function makeGlossary(cfg){
  const g={cfg,built:false,st:Object.assign({q:'',sel:[],mode:'both'},load(cfg.storeKey)||{})};
  g.st.q='';
  cfg.data.forEach(e=>{if(!TERM_HOME.has(e.term))TERM_HOME.set(e.term,cfg.id);});
  const pfx=cfg.id+'-';
  const save=()=>store(cfg.storeKey,{sel:g.st.sel,mode:g.st.mode});
  const host=()=>document.getElementById(cfg.hostId);
  const cnt=c=>cfg.data.filter(e=>e.category===c).length;
  function matches(e){const st=g.st;if(st.sel.length&&!st.sel.includes(e.category))return false;const q=st.q.trim().toLowerCase();if(!q)return true;return [e.term,...(e.aka||[]),e.technical,e.sales].join(' ').toLowerCase().includes(q);}
  function card(e){
    const rel=(e.related||[]).filter(r=>TERM_HOME.has(r));
    return `<article class="term" id="${pfx}${slug(e.term)}">
      <div class="term-h"><h3>${esc(e.term)}</h3><span class="pill">${esc(e.category)}</span></div>
      ${e.aka&&e.aka.length?`<div class="aka">Also called ${esc(e.aka.join(', '))}</div>`:''}
      ${g.st.mode!=='tech'?`<div class="def sales"><b>In plain terms</b>${esc(e.sales)}</div>`:''}
      ${g.st.mode!=='sales'?`<div class="def"><b>Technical</b>${esc(e.technical)}</div>`:''}
      ${rel.length?`<div class="rel"><span>See also</span>${rel.map(r=>`<button data-rel="${esc(r)}" ${TERM_HOME.get(r)!==cfg.id?'class="ext" title="Opens in the other glossary"':''}>${esc(r)}</button>`).join('')}</div>`:''}
      ${e.src?`<div class="foot"><a href="${esc(e.src)}" target="_blank" rel="noopener">Official source</a></div>`:''}
    </article>`;
  }
  function list(){
    const h=host(),st=g.st,q=st.q.trim().toLowerCase();
    const items=cfg.data.filter(matches);
    const starts=e=>e.term.toLowerCase().startsWith(q)||(e.aka||[]).some(x=>x.toLowerCase().startsWith(q));
    items.sort((a,b)=>{if(q){const x=starts(a),y=starts(b);if(x!==y)return x?-1:1;}return a.term.localeCompare(b.term,undefined,{sensitivity:'base'});});
    h.querySelector('.gl-count').textContent=`${items.length} of ${cfg.data.length} terms`;
    const letters=new Set(items.map(e=>firstLetter(e.term)));
    const az=h.querySelector('.az');
    az.innerHTML=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(l=>`<button data-az="${l}" ${letters.has(l)&&!q?'':'disabled'}>${l}</button>`).join('');
    az.querySelectorAll('[data-az]').forEach(b=>b.onclick=()=>{const el=document.getElementById(pfx+'L-'+b.dataset.az);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});});
    const out=h.querySelector('.gl-out');
    if(!items.length){out.innerHTML=`<div class="empty">No terms match "${esc(st.q)}". Try a shorter word or clear the filters.</div>`;return;}
    if(q)out.innerHTML=`<div class="gl-list">${items.map(card).join('')}</div>`;
    else{const groups={};items.forEach(e=>{const L=firstLetter(e.term);(groups[L]=groups[L]||[]).push(e);});
      out.innerHTML=Object.keys(groups).sort().map(L=>`<section class="gl-group"><h2 class="gl-letter" id="${pfx}L-${L}">${L}</h2><div class="gl-list">${groups[L].map(card).join('')}</div></section>`).join('');}
    out.querySelectorAll('[data-rel]').forEach(b=>b.onclick=()=>jumpTo(b.dataset.rel));
  }
  function sync(){
    const h=host();
    h.querySelectorAll('[data-gsel]').forEach(x=>x.setAttribute('aria-pressed',g.st.sel.includes(x.dataset.gsel)));
    h.querySelectorAll('[data-gmode]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.gmode===g.st.mode));
    h.querySelector('.gl-clear').hidden=!(g.st.sel.length||g.st.q);
  }
  g.reset=()=>{g.st.q='';g.st.sel=[];const i=host().querySelector('.gl-q');if(i)i.value='';sync();list();};
  g.focusTerm=t=>{g.reset();const el=document.getElementById(pfx+slug(t));if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1600);};
  g.render=()=>{
    if(g.built)return; g.built=true;
    const h=host();
    h.innerHTML=`<section class="xhero"><div><div class="eyebrow">${esc(cfg.eyebrow)}</div><h2>${esc(cfg.title)}</h2><p>${esc(cfg.sub)}</p></div>
      <div class="xstats"><div><b>${cfg.data.length}</b><small>terms</small></div>${cfg.groups.map(gr=>{const n=gr.cats.filter(c=>cnt(c)).length;return `<div><b>${n}</b><small>${esc(gr.label.toLowerCase())}${n===1?'':'s'}</small></div>`}).join('')}</div></section>
      <div class="gl-tools">
        <div class="gl-search"><input class="gl-q" type="search" id="${pfx}q" placeholder="${esc(cfg.placeholder)}" aria-label="Search ${esc(cfg.title)}" autocomplete="off">
          <div class="seg" role="group" aria-label="Definition view"><button data-gmode="both">Both</button><button data-gmode="sales">Plain terms</button><button data-gmode="tech">Technical</button></div>
          <span class="hint gl-count"></span><button class="linkbtn gl-clear" hidden>Clear filters</button></div>
        ${cfg.groups.map(gr=>`<div class="frow"><span class="flabel">${esc(gr.label)}</span><div class="chips">${gr.cats.filter(c=>cnt(c)).map(c=>`<button class="chip sm ${gr.colors?'pchip':''}" data-gsel="${esc(c)}" ${gr.colors?`style="--pc:${gr.colors[c]||'#888'}"`:''}>${esc(c)} <small>${cnt(c)}</small></button>`).join('')}</div></div>`).join('')}
        <nav class="az" aria-label="Jump to letter"></nav>
      </div><div class="gl-out"></div>`;
    const q=h.querySelector('.gl-q'); q.addEventListener('input',()=>{g.st.q=q.value;sync();list();});
    h.querySelectorAll('[data-gsel]').forEach(b=>b.onclick=()=>{g.st.sel=toggleIn(g.st.sel,b.dataset.gsel);save();sync();list();});
    h.querySelectorAll('[data-gmode]').forEach(b=>b.onclick=()=>{g.st.mode=b.dataset.gmode;save();sync();list();});
    h.querySelector('.gl-clear').onclick=()=>{g.reset();save();};
    sync(); list();
  };
  GLOSSARIES[cfg.id]=g; return g;
}
function jumpTo(term){
  const home=TERM_HOME.get(term); if(!home)return;
  const g=GLOSSARIES[home]; const view=g.cfg.view;
  if(document.getElementById('view-'+view).hidden)showView(view);
  g.render(); setTimeout(()=>g.focusTerm(term),30);
}
const GEN_ORDER=['Data foundations','Data management','AI fundamentals','Agents and AI apps','Cloud and software'];
makeGlossary({id:'gp',view:'glossary',hostId:'view-glossary',data:GLO,storeKey:'bvb-gl-p',eyebrow:'Platform glossary',
  title:'Product names and planning terms by platform',
  sub:'What each platform calls its tools, what they actually do, and the planning language you will need to explain why they are not a planning product. Each entry has a plain version for the customer and a technical one for the data team.',
  placeholder:'Search a product or term, like Genie, Cortex Analyst or write-back',
  groups:[{label:'Topic',cats:['Planning and FP&A']},{label:'Platform',cats:['Vena','Snowflake','Databricks','Microsoft','Google','AWS','SAP','Palantir'],colors:{Vena:PCOLOR.vena,Snowflake:PCOLOR.snowflake,Databricks:PCOLOR.databricks,Microsoft:PCOLOR.fabric,Google:PCOLOR.google,AWS:PCOLOR.aws,SAP:PCOLOR.sap,Palantir:PCOLOR.palantir}}]});
makeGlossary({id:'gg',view:'aiglossary',hostId:'view-aiglossary',data:GLO_GEN,storeKey:'bvb-gl-g',eyebrow:'AI and data glossary',
  title:'The general AI and data terms, in plain words',
  sub:'Vendor-neutral definitions for the words that come up on every data and AI conversation, from data lake and semantic layer to LLM, agent, MCP and AGI.',
  placeholder:'Search a term, like data lake, semantic layer, MCP or AGI',
  groups:[{label:'Topic',cats:GEN_ORDER.concat(Array.from(new Set(GLO_GEN.map(e=>e.category))).filter(c=>!GEN_ORDER.includes(c)))}]});
function renderGlossary(){GLOSSARIES.gp.render();}
function renderAiGlossary(){GLOSSARIES.gg.render();}
