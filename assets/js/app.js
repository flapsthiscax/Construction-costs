/* Construction Cost Escalator — app logic. Data lives in data/data.js. */
(function(){
'use strict';

/* ---------- theme & chart defaults ---------- */
const css=getComputedStyle(document.documentElement);
const T=n=>css.getPropertyValue(n).trim();
const C={van:T('--van'),cal:T('--cal'),nat:T('--nat'),muted:T('--muted'),dim:T('--dim'),fg:T('--fg'),grid:'rgba(160,140,255,.10)'};
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
Chart.defaults.color=C.muted;
Chart.defaults.font.family="'Manrope',system-ui,sans-serif";
Chart.defaults.font.size=11.5;
Chart.defaults.animation.duration=REDUCED?0:450;
const TIP={backgroundColor:'rgba(12,10,34,.96)',borderColor:'rgba(160,140,255,.3)',borderWidth:1,padding:10,cornerRadius:8,titleColor:C.fg,bodyColor:'#cfcaf3',
  titleFont:{family:"'JetBrains Mono',monospace",size:12,weight:'600'},bodyFont:{family:"'Manrope',sans-serif",size:12}};
const axis=(cb,extra)=>Object.assign({grid:{color:C.grid},border:{display:false},ticks:{color:C.muted,callback:cb}},extra||{});
const charts={};
function mk(id,cfg){if(charts[id])charts[id].destroy();charts[id]=new Chart(document.getElementById(id),cfg);return charts[id];}

/* ---------- helpers ---------- */
const $=id=>document.getElementById(id);
const CITIES=['Vancouver','Calgary'];
const Q=BCPI.quarters, LI=Q.length-1, LAST=Q[LI];
const qLabel=q=>q.replace('-',' ');
const fmt$=v=>'$'+Math.round(v).toLocaleString('en-CA');
const fmtM=v=>Math.abs(v)>=1e6?'$'+(v/1e6).toFixed(v>=1e8?0:v>=1e7?1:2)+'M':Math.abs(v)>=1e3?'$'+Math.round(v/1e3).toLocaleString('en-CA')+'k':fmt$(v);
const pct=(v,d=1)=>(v>=0?'+':'−')+Math.abs(v).toFixed(d)+'%';
const num=el=>{const n=parseFloat((el.value||'').replace(/[^0-9.]/g,''));return isFinite(n)?n:0};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mid=(l,h)=>(l+h)/2;
const TYPE_LABEL={'Bus depot with maintenance and repair facilities':'Bus depot & maintenance','Institutional buildings':'Institutional (school)','Residential':'Residential, all types','Non-residential':'Non-residential, all types'};
const lab=t=>TYPE_LABEL[t]||t;
const HIDE=new Set(['School']); // identical to Institutional buildings as published
const firstQ=(ck,t)=>BCPI[ck][t].findIndex(v=>v!==null);

/* ---------- forecast ---------- */
const FC={Vancouver:{2026:[2.5,3.5],2027:[3.5,4.5]},Calgary:{2026:[3.0,4.0],2027:[4.0,5.0]}};
const PROV={Vancouver:'BC',Calgary:'Alberta'};
const NAT2028=4.0;
const FUT=[];(function(){let [y,q]=LAST.split('-Q').map(Number);while(!(y===2028&&q===4)){q++;if(q>4){q=1;y++}FUT.push(y+'-Q'+q)}})();
const ALLQ=Q.concat(FUT);
let scen='mid';
function rate(ck,year){
  if(year>=2028)return NAT2028;
  const r=FC[ck][Math.max(2026,year)];return scen==='low'?r[0]:scen==='high'?r[1]:(r[0]+r[1])/2;
}
function indexAt(ck,type,q){
  const i=Q.indexOf(q);if(i>=0)return BCPI[ck][type][i];
  let v=BCPI[ck][type][LI];
  for(const f of FUT){v*=Math.pow(1+rate(ck,+f.slice(0,4))/100,.25);if(f===q)break}
  return v;
}
function scenText(){
  const s=scen[0].toUpperCase()+scen.slice(1);
  return `${s} forecast: BC ${rate('Vancouver',2026).toFixed(2)}% (2026), ${rate('Vancouver',2027).toFixed(2)}% (2027); Alberta ${rate('Calgary',2026).toFixed(2)}%, ${rate('Calgary',2027).toFixed(2)}%; 4.0% national for 2028.`;
}

/* ---------- city state ---------- */
const app=$('app');
let city='compare';
function setCity(c,push){
  const prev=city;city=c;app.dataset.city=c;
  document.querySelectorAll('.seg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.city===c)));
  if(push){try{history.replaceState(null,'','#'+c)}catch(e){location.hash=c}}
  fillRomTypes(prev);drawRom();drawEsc();drawRanges();
}
document.querySelectorAll('.seg button').forEach(b=>b.addEventListener('click',()=>setCity(b.dataset.city,true)));

/* ---------- KPIs ---------- */
function yoy(ck,t){const s=BCPI[ck][t];return (s[LI]/s[LI-4]-1)*100}
function since(ck,t,q){const s=BCPI[ck][t];return (s[LI]/s[Q.indexOf(q)]-1)*100}
function kpis(){
  const tiles=[
    {lab:'Non-residential, last 12 months',v:[pct(yoy('Vancouver','Non-residential')),pct(yoy('Calgary','Non-residential'))],src:'StatCan BCPI, Q3 2025 → Q3 2026'},
    {lab:'Residential, last 12 months',v:[pct(yoy('Vancouver','Residential')),pct(yoy('Calgary','Residential'))],src:'StatCan BCPI, Q3 2025 → Q3 2026'},
    {lab:'Non-residential since 2019',v:[pct(since('Vancouver','Non-residential','2019-Q1'),0),pct(since('Calgary','Non-residential','2019-Q1'),0)],src:'StatCan BCPI, Q1 2019 → Q3 2026'},
    {lab:'2027 bid-price forecast',v:['3.5–4.5%','4.0–5.0%'],sm:true,src:'Turner & Townsend, Q3 2026 (BC / AB)'}
  ];
  $('kpis').innerHTML=tiles.map(t=>`<div class="panel kpi"><div class="klab">${t.lab}</div>
    <div class="pair"><div class="cv van"><span class="c">Vancouver</span><span class="v${t.sm?' sm':''}">${t.v[0]}</span></div>
    <div class="cv cal"><span class="c">Calgary</span><span class="v${t.sm?' sm':''}">${t.v[1]}</span></div></div>
    <div class="src">${t.src}</div></div>`).join('');
}

/* ---------- shared type select (StatCan types) ---------- */
function fillTypes(sel,def){
  const res=BCPI.types.slice(0,6), non=BCPI.types.slice(6).filter(t=>!HIDE.has(t));
  const opt=t=>{const fq=Q[firstQ('Vancouver',t)];return `<option value="${t}">${lab(t)}${fq.slice(0,4)>'1981'?` · from ${fq.slice(0,4)}`:''}</option>`};
  sel.innerHTML=`<optgroup label="Non-residential">${non.map(opt).join('')}</optgroup><optgroup label="Residential">${res.map(opt).join('')}</optgroup>`;
  sel.value=def;
}

/* ---------- calculator tabs ---------- */
let mode='rom';
function setMode(m){
  mode=m;
  $('t-rom').setAttribute('aria-selected',String(m==='rom'));$('t-esc').setAttribute('aria-selected',String(m==='esc'));
  $('p-rom').hidden=m!=='rom';$('p-esc').hidden=m!=='esc';
  $('calcSub').textContent=m==='rom'
    ?'Pick a building type and enter the area. Ranges come from the latest cost guide for each city, moved to your pricing date with StatCan’s index and Turner & Townsend’s forecast.'
    :'Enter what the project cost and when it was priced. StatCan’s building price index brings it to Q3 2026; Turner & Townsend’s forecast takes it further.';
  if(m==='esc')drawEsc();
}
$('t-rom').addEventListener('click',()=>setMode('rom'));
$('t-esc').addEventListener('click',()=>setMode('esc'));
document.querySelector('[role=tablist]').addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const n=mode==='rom'?'esc':'rom';setMode(n);$('t-'+n).focus()}});
document.querySelectorAll('[data-sc]').forEach(b=>b.addEventListener('click',()=>{
  scen=b.dataset.sc;document.querySelectorAll('[data-sc]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.sc===scen)));drawRom();drawEsc()}));

/* ---------- ROM ---------- */
const BASIS={altus:'2026-Q1',rlb:'2026-Q3'}; // Altus 2026 guide published Apr 2026; RLB data current to mid-Q3 2026
function altusIndexType(r){
  switch(r.g){
    case 'Condominiums':return 'High-rise apartment';
    case 'Wood Frame':return /Townhouse|Stacked/.test(r.n)?'Townhouse':/Single/.test(r.n)?'Single-detached house':'Low-rise apartment';
    case 'Seniors Housing':return 'Apartment buildings';
    case 'Office':return 'Office building';
    case 'Retail':return 'Shopping centre';
    case 'Hotels':return 'Commercial buildings';
    case 'Industrial':return 'Warehouse';
    case 'Educational':return 'Institutional buildings';
    case 'Transportation':return /Bus/.test(r.n)?'Bus depot with maintenance and repair facilities':'Non-residential';
    default:return 'Non-residential';
  }
}
function rlbIndexType(r){
  switch(r.g){
    case 'Offices':return 'Office building';
    case 'Retail':return 'Shopping centre';
    case 'Hotels':return 'Commercial buildings';
    case 'Industrial':return 'Warehouse';
    case 'Education':return 'Institutional buildings';
    case 'Residential':return /Single/.test(r.n)?'Single-detached house':'Apartment buildings';
    default:return 'Non-residential';
  }
}
const PAIRS=[ // [label, Altus Vancouver name, RLB Calgary name, sector]
  ['Office, Class A / prime','Office 5–30 Storeys (A)','Offices – Prime','commercial'],
  ['Office, Class B / secondary','Office <5 Storeys (B)','Offices – Secondary','commercial'],
  ['Shopping centre / enclosed mall','Enclosed Mall','Retail – Shopping Center','commercial'],
  ['Strip retail','Strip Plaza','Retail – Strip','commercial'],
  ['Full-service hotel (Altus 4★ / RLB 5★)','4-Star Full Service','Hotels – 5 Star','commercial'],
  ['Limited-service hotel (Altus budget / RLB 3★)','Budget Hotel','Hotels – 3 Star','commercial'],
  ['Warehouse','Warehouse','Industrial – Warehouse','industrial'],
  ['Parkade, above grade','Parking Garage (Above)','Parking – Ground','industrial'],
  ['Parkade, below grade','Underground Parking','Parking – Basement','industrial'],
  ['Multi-family (Altus 6-storey wood)','6-Storey Wood Condo','Residential – Multi-Family','residential'],
  ['Single-family','Single Family','Residential – Single-Family','residential'],
  ['Elementary school','Elementary School','Education – Elementary','institutional'],
  ['Secondary school','Secondary School','Education – High School','institutional'],
  ['University teaching','University Teaching','Education – University','institutional'],
  ['General hospital','General Hospital','Hospital – General','institutional'],
];
const altusBy=n=>ALTUS_VAN.find(r=>r.n===n), rlbBy=n=>RLB_CAL.find(r=>r.n===n);
const $rt=$('romType'),$ra=$('romArea'),$rat=$('romAt');
function groupOpts(rows,prefix){
  const g={};rows.forEach(r=>(g[r.g]=g[r.g]||[]).push(r));
  return Object.entries(g).map(([k,v])=>`<optgroup label="${esc(k)}">${v.map(r=>`<option value="${prefix}${esc(r.n)}">${esc(r.n.replace(k+' – ',''))}</option>`).join('')}</optgroup>`).join('');
}
function fillRomTypes(prev){
  const cur=$rt.value||'P:0';
  // translate the current choice across city modes
  let altusName=null,rlbName=null,pair=null;
  if(cur.startsWith('P:')){pair=+cur.slice(2);altusName=PAIRS[pair][1];rlbName=PAIRS[pair][2]}
  else if(cur.startsWith('A:')){altusName=cur.slice(2);pair=PAIRS.findIndex(p=>p[1]===altusName);if(pair>=0)rlbName=PAIRS[pair][2]}
  else if(cur.startsWith('R:')){rlbName=cur.slice(2);pair=PAIRS.findIndex(p=>p[2]===rlbName);if(pair>=0)altusName=PAIRS[pair][1]}
  if(city==='vancouver'){$rt.innerHTML=groupOpts(ALTUS_VAN,'A:');$rt.value='A:'+(altusName||PAIRS[0][1])}
  else if(city==='calgary'){$rt.innerHTML=groupOpts(RLB_CAL,'R:');$rt.value='R:'+(rlbName||PAIRS[0][2])}
  else{
    const sect={commercial:'Commercial',industrial:'Industrial & parking',residential:'Residential',institutional:'Institutional'};
    $rt.innerHTML=Object.entries(sect).map(([k,l])=>`<optgroup label="${l}">${PAIRS.map((p,i)=>p[3]===k?`<option value="P:${i}">${esc(p[0])}</option>`:'').join('')}</optgroup>`).join('');
    $rt.value='P:'+(pair>=0&&pair!==null?pair:0);
  }
  if(!$rt.value)$rt.selectedIndex=0;
}
function fillRomAt(){
  $rat.innerHTML=`<option value="${LAST}">Now · ${qLabel(LAST)} (latest index)</option>`+
    FUT.map(q=>`<option value="${q}">${qLabel(q)} · forecast</option>`).join('');
  $rat.value=LAST;
}
let romSummary='';
function romFor(ck,row,src){
  const area=num($ra),at=$rat.value;
  const it=src==='altus'?altusIndexType(row):rlbIndexType(row);
  const basis=BASIS[src];
  const f=indexAt(ck,it,at)/indexAt(ck,it,basis);
  const l=src==='altus'?row.l26:row.l, h=src==='altus'?row.h26:row.h;
  return {ck,row,src,it,basis,f,l,h,L:l*f,H:h*f,area,at};
}
function drawRom(){
  const v=$rt.value,out=[];
  if(v.startsWith('P:')){const p=PAIRS[+v.slice(2)];out.push(romFor('Vancouver',altusBy(p[1]),'altus'),romFor('Calgary',rlbBy(p[2]),'rlb'))}
  else if(v.startsWith('A:'))out.push(romFor('Vancouver',altusBy(v.slice(2)),'altus'));
  else out.push(romFor('Calgary',rlbBy(v.slice(2)),'rlb'));
  const box=$('romResults');box.classList.toggle('one',out.length===1);
  const maxH=Math.max(...out.map(o=>o.H));
  box.innerHTML=out.map(o=>{
    const a=o.area, M=mid(o.L,o.H);
    const srcName=o.src==='altus'?'Altus 2026':'RLB Q3 2026';
    const esc_=(o.f-1)*100;
    return `<div class="res ${o.ck==='Vancouver'?'van':'cal'}">
      <span class="c">${o.ck} · midpoint</span>
      <span class="big">${a?fmtM(M*a):'—'}</span>
      <span class="range">${a?`${fmtM(o.L*a)} – ${fmtM(o.H*a)}`:'Enter a floor area'}</span>
      <div class="viz" aria-hidden="true"><b style="left:${o.L/maxH*100}%;right:${100-o.H/maxH*100}%"></b><i style="left:calc(${M/maxH*100}% - 1px)"></i></div>
      <span class="psf">$${Math.round(o.L)}–$${Math.round(o.H)}/sf at ${qLabel(o.at)} · ${srcName} $${o.l}–$${o.h}/sf ${Math.abs(esc_)<0.05?'(no change)':pct(esc_)}</span>
      <span class="srcl">${esc(o.row.n)} · escalated on StatCan ${lab(o.it).toLowerCase()} index from ${qLabel(o.basis)}</span>
    </div>`}).join('');
  const fut=FUT.includes($rat.value);
  $('p-rom').querySelector('.sc-wrap').hidden=!fut;
  $('romNote').textContent=(fut?scenText()+' ':'')+'Altus 2026 is treated as Q1 2026 pricing and RLB as Q3 2026. Hard costs only; add soft costs, contingency and GST separately.';
  romSummary=out.map(o=>`${o.ck} ROM – ${o.row.n}, ${num($ra).toLocaleString('en-CA')} sf at ${qLabel(o.at)}: ${fmt$(o.L*o.area)} to ${fmt$(o.H*o.area)} (mid ${fmt$(mid(o.L,o.H)*o.area)}); $${Math.round(o.L)}–$${Math.round(o.H)}/sf. Basis ${o.src==='altus'?'Altus Canadian Cost Guide 2026':'RLB Q3 2026'}, escalated with StatCan BCPI${fut?' + Turner & Townsend '+scen+' forecast':''}. Hard costs only.`).join('\n');
}
$rt.addEventListener('change',drawRom);$rat.addEventListener('change',drawRom);
$ra.addEventListener('input',drawRom);
$ra.addEventListener('blur',()=>{const n=num($ra);$ra.value=n?n.toLocaleString('en-CA'):''});

/* ---------- Escalate a past project ---------- */
const $amt=$('amt'),$bt=$('btype'),$yf=$('yfrom'),$qt=$('qto');
let qf=2;
function fillYears(){
  const y0=+Q[0].slice(0,4),y1=+LAST.slice(0,4);let h='';
  for(let y=y1;y>=y0;y--)h+=`<option value="${y}">${y}</option>`;
  $yf.innerHTML=h;$yf.value='2019';
}
function fillTo(){
  $qt.innerHTML=`<option value="${LAST}">Now · ${qLabel(LAST)} (latest index)</option>`+FUT.map(q=>`<option value="${q}">${qLabel(q)} · forecast</option>`).join('');
  $qt.value=LAST;
}
let escSummary='';
function drawEsc(){
  if(mode!=='esc'&&charts.calcChart)return;
  const amt=num($amt),type=$bt.value,from=$yf.value+'-Q'+qf,to=$qt.value;
  const fi=ALLQ.indexOf(from),ti=ALLQ.indexOf(to);
  $('p-esc').querySelector('.sc-wrap').hidden=!(ti>LI);
  const out=CITIES.map(ck=>{
    const fq=firstQ(ck,type);
    if(fi<0||fi<fq)return {ck,missing:Q[fq]};
    const a=indexAt(ck,type,from),b=indexAt(ck,type,to);
    let hist=null,fc=null;
    if(ti>fi){
      if(fi<LI)hist=(indexAt(ck,type,ALLQ[Math.min(ti,LI)])/a-1)*100;
      if(ti>LI)fc=(b/indexAt(ck,type,ALLQ[Math.max(fi,LI)])-1)*100;
    }
    return {ck,v:amt*b/a,p:(b/a-1)*100,hist,fc};
  });
  $('escResults').innerHTML=out.map(o=>o.missing?`<div class="res ${o.ck==='Vancouver'?'van':'cal'}"><span class="c">${o.ck}</span>
      <span class="warn">StatCan’s ${lab(type).toLowerCase()} series starts in ${qLabel(o.missing)}. For older projects use Non-residential, or High-rise apartment for residential work back to 1988.</span></div>`
    :`<div class="res ${o.ck==='Vancouver'?'van':'cal'}">
    <span class="c">${o.ck} · at ${qLabel(to)}</span><span class="big">${fmt$(o.v)}</span>
    <span class="pct${o.p<0?' neg':''}">${pct(o.p)} since ${qLabel(from)}</span>
    <span class="split">${[o.hist!==null?`Actual: ${pct(o.hist)}`:'',o.fc!==null?`Forecast: ${pct(o.fc)}`:''].filter(Boolean).join(' · ')||'&nbsp;'}</span></div>`).join('');
  // path chart
  const lo=Math.min(fi,ti),hi=Math.max(fi,ti);
  const ok=out.filter(o=>!o.missing);
  if(fi<0||!ok.length){if(charts.calcChart){charts.calcChart.destroy();delete charts.calcChart}}
  else{
    const span=ALLQ.slice(lo,hi+1);
    const ds=ok.map(o=>{const ck=o.ck,base=indexAt(ck,type,from);return{
      label:ck,data:span.map(q=>amt*indexAt(ck,type,q)/base),borderColor:ck==='Vancouver'?C.van:C.cal,
      backgroundColor:'transparent',borderWidth:city==='compare'||city===ck.toLowerCase()?2.4:1.1,
      pointRadius:0,pointHoverRadius:4,tension:.25,
      segment:{borderDash:ctx=>(lo+ctx.p1DataIndex)>LI?[5,4]:undefined}}});
    mk('calcChart',{type:'line',data:{labels:span.map(qLabel),datasets:ds},
      options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
        plugins:{legend:{display:false},tooltip:{...TIP,callbacks:{label:c=>` ${c.dataset.label}: ${fmt$(c.parsed.y)}`}}},
        scales:{x:axis(undefined,{ticks:{color:C.muted,maxTicksLimit:8,autoSkip:true,maxRotation:0}}),y:axis(v=>fmtM(v))}}});
  }
  const notes=[];
  if(ti>LI)notes.push('Dashed line is forecast. '+scenText()+' Forecasts are all-building bid prices, so every type gets the same rate.');
  else notes.push(`Actual StatCan index movement for ${lab(type).toLowerCase()} from ${qLabel(from)} to ${qLabel(to)}.`);
  if(type==='High-rise apartment'&&fi>=0&&fi<Q.indexOf('2017-Q1'))notes.push('StatCan re-weighted residential series in 2017; the high-rise index steps up 3–5% at the splice, so treat pre-2017 results as approximate.');
  if(fi>=0&&fi<Q.indexOf('2010-Q1')&&type!=='High-rise apartment')notes.push('The 2008–09 downturn shows as a real drop in the non-residential index.');
  $('escNote').textContent=notes.join(' ');
  escSummary=ok.map(o=>`${o.ck}: ${fmt$(amt)} priced ${qLabel(from)} → ${fmt$(o.v)} at ${qLabel(to)} (${pct(o.p)}), StatCan BCPI ${lab(type).toLowerCase()}${ti>LI?' + Turner & Townsend '+scen+' forecast':''}.`).join('\n');
}
$amt.addEventListener('input',drawEsc);
$amt.addEventListener('blur',()=>{const n=num($amt);$amt.value=n?n.toLocaleString('en-CA'):''});
[$bt,$yf,$qt].forEach(s=>s.addEventListener('change',drawEsc));
document.querySelectorAll('#qfromQ button').forEach(b=>b.addEventListener('click',()=>{
  qf=+b.dataset.q;document.querySelectorAll('#qfromQ button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));drawEsc()}));

/* ---------- copy ---------- */
function copy(btn,getText){
  btn.addEventListener('click',()=>{
    const text=getText(),done=m=>{btn.textContent=m;setTimeout(()=>btn.textContent='Copy summary',1800)};
    const fallback=()=>{const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
      let ok=false;try{ok=document.execCommand('copy')}catch(e){}document.body.removeChild(ta);done(ok?'Copied':'Copy blocked')};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>done('Copied'),fallback);else fallback();
  });
}
copy($('romCopy'),()=>romSummary);
copy($('escCopy'),()=>escSummary);

/* ---------- index chart ---------- */
const $it=$('itype');let imode='cum',irange=10;
function drawIndex(){
  const t=$it.value;
  const start=irange?Math.max(0,Q.length-irange*4-1):0;
  const labels=Q.slice(start).map(qLabel);
  const tf=full=>{
    const s=full.slice(start);
    if(imode==='raw')return s;
    if(imode==='yoy')return s.map((v,i)=>{const j=start+i;return j<4||v===null||full[j-4]===null?null:(v/full[j-4]-1)*100});
    const b=s.find(v=>v!==null);return s.map(v=>v===null?null:(v/b-1)*100);
  };
  const mkds=(ck,col,dash)=>({label:ck==='Composite'?'15-city composite':ck,data:tf(BCPI[ck][t]),borderColor:col,backgroundColor:'transparent',
    borderWidth:dash?1.6:2.4,borderDash:dash?[5,4]:undefined,pointRadius:0,pointHoverRadius:4,tension:.25});
  const ds=[mkds('Vancouver',C.van),mkds('Calgary',C.cal),mkds('Composite',C.nat,true)];
  const fq=firstQ('Vancouver',t);
  $('idxNote').textContent=fq>start?`· series starts ${qLabel(Q[fq])}`:'';
  mk('idxChart',{type:'line',data:{labels,datasets:ds},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false},tooltip:{...TIP,callbacks:{label:c=>c.parsed.y==null?null:` ${c.dataset.label}: ${imode==='raw'?c.parsed.y.toFixed(1):pct(c.parsed.y)}`}}},
      scales:{x:axis(undefined,{ticks:{color:C.muted,maxTicksLimit:9,maxRotation:0}}),y:axis(imode==='raw'?(v=>v):(v=>(v>0?'+':'')+v+'%'))}}});
}
$it.addEventListener('change',drawIndex);
function wireMini(id,attr,fn){document.querySelectorAll(`#${id} button`).forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll(`#${id} button`).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));fn(b.dataset[attr]);drawIndex()}))}
wireMini('imode','m',v=>imode=v);
wireMini('irange','r',v=>irange=+v);

/* ---------- cost ranges ---------- */
const SECT=[['all','All'],['residential','Residential'],['commercial','Commercial'],['industrial','Industrial & parking'],['institutional','Institutional']];
let sector='all';
function sectorChips(){
  $('sectors').innerHTML=SECT.map(([k,l])=>`<button class="chip" data-s="${k}" aria-pressed="${k===sector}">${l}</button>`).join('');
  document.querySelectorAll('#sectors .chip').forEach(b=>b.addEventListener('click',()=>{sector=b.dataset.s;sectorChips();drawRanges()}));
}
function drawRanges(){
  const sub=$('rngSub'),cav=$('rngCaveat'),lg=$('rngLegend'),tb=$('rngTable');
  const keep=r=>sector==='all'||r.s===sector;
  let labels,datasets,rows;
  if(city==='compare'){
    sub.textContent='Closest matching building types, Vancouver vs Calgary, latest editions. CAD $/sf.';
    cav.hidden=false;
    const P=PAIRS.filter(p=>sector==='all'||p[3]===sector).map(p=>({lab:p[0],a:altusBy(p[1]),b:rlbBy(p[2])}));
    labels=P.map(p=>p.lab);
    datasets=[
      {label:'Vancouver · Altus 2026',data:P.map(p=>[p.a.l26,p.a.h26]),backgroundColor:'rgba(56,217,245,.75)'},
      {label:'Calgary · RLB Q3 2026',data:P.map(p=>[p.b.l,p.b.h]),backgroundColor:'rgba(255,155,94,.78)'}];
    lg.innerHTML='<span><i class="box" style="background:var(--van)"></i>Vancouver · Altus 2026</span><span><i class="box" style="background:var(--cal)"></i>Calgary · RLB Q3 2026</span><span class="lg-note">Bar = low to high range</span>';
    tb.innerHTML=`<thead><tr><th>Building type</th><th class="n">Vancouver</th><th class="n">Calgary</th><th class="n">Midpoint gap</th></tr></thead><tbody>${P.map(p=>{
      const g=(mid(p.b.l,p.b.h)/mid(p.a.l26,p.a.h26)-1)*100;
      return `<tr><td>${esc(p.lab)}</td><td class="n">$${p.a.l26}–${p.a.h26}</td><td class="n">$${p.b.l}–${p.b.h}</td><td class="n ${g>0?'d-up':'d-down'}">Calgary ${pct(g,0)}</td></tr>`}).join('')}</tbody>`;
  } else if(city==='vancouver'){
    sub.textContent='Altus Canadian Cost Guide, Vancouver. 2026 edition with 2024 behind it. CAD $/sf.';
    cav.hidden=true;
    rows=ALTUS_VAN.filter(keep);labels=rows.map(r=>r.n);
    datasets=[
      {label:'Altus 2024',data:rows.map(r=>[r.l24,r.h24]),backgroundColor:'rgba(255,255,255,.16)'},
      {label:'Altus 2026',data:rows.map(r=>[r.l26,r.h26]),backgroundColor:'rgba(56,217,245,.78)'}];
    lg.innerHTML='<span><i class="box" style="background:var(--van)"></i>Altus 2026</span><span><i class="box" style="background:rgba(255,255,255,.2)"></i>Altus 2024</span><span class="lg-note">Bar = low to high range</span>';
    tb.innerHTML=`<thead><tr><th>Building type</th><th>Group</th><th class="n">2026 range</th><th class="n">Midpoint</th><th class="n">vs 2024</th></tr></thead><tbody>${rows.map(r=>{
      const d=(mid(r.l26,r.h26)/mid(r.l24,r.h24)-1)*100;
      return `<tr><td>${esc(r.n)}</td><td><span class="pill">${esc(r.g)}</span></td><td class="n">$${r.l26}–${r.h26}</td><td class="n">$${Math.round(mid(r.l26,r.h26))}</td><td class="n ${d>0.05?'d-up':d<-0.05?'d-down':'d-flat'}">${pct(d)}</td></tr>`}).join('')}</tbody>`;
  } else {
    sub.textContent='RLB Quarterly Construction Cost Report Q3 2026, Calgary. CAD $/sf.';
    cav.hidden=true;
    rows=RLB_CAL.filter(keep);labels=rows.map(r=>r.n);
    datasets=[{label:'RLB Q3 2026',data:rows.map(r=>[r.l,r.h]),backgroundColor:'rgba(255,155,94,.8)'}];
    lg.innerHTML='<span><i class="box" style="background:var(--cal)"></i>RLB Q3 2026</span><span class="lg-note">Bar = low to high range · Altus Calgary is gated (see Sources)</span>';
    tb.innerHTML=`<thead><tr><th>Building type</th><th class="n">Low</th><th class="n">High</th><th class="n">Midpoint</th></tr></thead><tbody>${rows.map(r=>
      `<tr><td>${esc(r.n)}</td><td class="n">$${r.l}</td><td class="n">$${r.h}</td><td class="n">$${Math.round(mid(r.l,r.h))}</td></tr>`).join('')}</tbody>`;
  }
  datasets.forEach(d=>Object.assign(d,{borderRadius:4,borderSkipped:false,barPercentage:.78,categoryPercentage:.78}));
  const narrow=$('rngBox').clientWidth<560;
  if(narrow)labels=labels.map(l=>{const w=String(l).split(' '),out=[''];w.forEach(x=>{if((out[out.length-1]+' '+x).trim().length>16)out.push(x);else out[out.length-1]=(out[out.length-1]+' '+x).trim()});return out});
  $('rngBox').style.height=Math.max(220,labels.length*(datasets.length>1?(narrow?44:34):(narrow?32:26))+60)+'px';
  mk('rngChart',{type:'bar',data:{labels,datasets},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false},tooltip:{...TIP,callbacks:{label:c=>{const [l,h]=c.raw;return ` ${c.dataset.label}: $${l}–$${h}/sf (mid $${Math.round(mid(l,h))})`}}}},
    scales:{x:axis(v=>'$'+v,{position:'top',ticks:{color:C.muted,callback:v=>'$'+v,maxRotation:0,maxTicksLimit:narrow?4:10}}),y:{grid:{display:false},border:{display:false},ticks:{color:C.muted,autoSkip:false,font:{size:narrow?10.5:11.5}}}}}});
}
let rw=innerWidth;addEventListener('resize',()=>{if((rw<600)!==(innerWidth<600)){rw=innerWidth;drawRanges()}});

/* ---------- outlook ---------- */
function drawForecast(){
  const mkd=(label,data,bg)=>({label,data,backgroundColor:bg,borderRadius:4,borderSkipped:false,barPercentage:.82,categoryPercentage:.8});
  mk('fcChart',{type:'bar',data:{labels:['2026','2027'],datasets:[
    mkd('BC · Q3 2026',[[2.5,3.5],[3.5,4.5]],'rgba(56,217,245,.8)'),
    mkd('BC · Q1 2026 call',[[1.5,2.5],[3.0,4.0]],'rgba(56,217,245,.2)'),
    mkd('Alberta · Q3 2026',[[3.0,4.0],[4.0,5.0]],'rgba(255,155,94,.82)'),
    mkd('Alberta · Q1 2026 call',[[2.5,3.5],[2.5,3.5]],'rgba(255,155,94,.22)')]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{...TIP,callbacks:{label:c=>` ${c.dataset.label}: ${c.raw[0].toFixed(1)}–${c.raw[1].toFixed(1)}%`}}},
      scales:{x:axis(v=>v+'%',{min:0,max:6}),y:{grid:{display:false},border:{display:false},ticks:{color:C.fg,font:{family:"'JetBrains Mono',monospace",size:12,weight:'600'}}}}}});
}
function signals(){
  const r=RLB_CAL_INDEX,rk=Object.keys(r),rlb=(r[rk[rk.length-1]]/r[rk[0]]-1)*100;
  const f=FITOUT.Total;
  const S=[
    {t:'Building price index, non-res',s:'StatCan · Q3 2025 → Q3 2026',v:[pct(yoy('Vancouver','Non-residential')),pct(yoy('Calgary','Non-residential'))]},
    {t:'Building price index, residential',s:'StatCan · Q3 2025 → Q3 2026',v:[pct(yoy('Vancouver','Residential')),pct(yoy('Calgary','Residential'))]},
    {t:'Comparative cost index',s:'RLB · Jul 2025 → Jul 2026',v:[null,pct(rlb)]},
    {t:'Construction cost inflation',s:'Turner & Townsend GCMI 2026',v:['+2.0%',null]},
    {t:'Bid-price forecast 2026',s:'Turner & Townsend · Q3 2026',v:['2.5–3.5%','3.0–4.0%']},
    {t:'Office fit-out total',s:'Cushman & Wakefield · 2025 → 2026',v:[pct((f.Vancouver[2]/f.Vancouver[1]-1)*100),pct((f.Calgary[2]/f.Calgary[1]-1)*100)]},
    {t:'Market commentary, 2025',s:'Altus 2026 guide · Vancouver eased; Alberta up',v:['down','≥ +4%']},
  ];
  $('signals').innerHTML=S.map(x=>`<div class="sig-row"><div><div class="t">${x.t}</div><div class="s">${x.s}</div></div>
    <div class="v ${x.v[0]?'van':'na'}"><small>VAN</small>${x.v[0]||'—'}</div><div class="v ${x.v[1]?'cal':'na'}"><small>CAL</small>${x.v[1]||'—'}</div></div>`).join('');
}

/* ---------- Altus history ---------- */
function drawAltus(){
  const d=ALTUS_ESC[$('altSel').value];
  mk('altChart',{type:'bar',data:{labels:d.yrs,datasets:[{label:'Avg',data:d.avg,borderRadius:4,
    backgroundColor:d.avg.map(v=>v>=10?'rgba(251,113,133,.8)':v>=5?'rgba(251,191,36,.75)':v<0?'rgba(52,211,153,.75)':'rgba(56,217,245,.7)')}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...TIP,callbacks:{
      label:c=>[` Midpoint: ${pct(c.parsed.y,2)}`,` Low end: ${pct(d.low[c.dataIndex],2)}`,` High end: ${pct(d.high[c.dataIndex],2)}`]}}},
      scales:{x:{grid:{display:false},border:{display:false}},y:axis(v=>v+'%')}}});
}
$('altSel').addEventListener('change',drawAltus);

/* ---------- fit-out ---------- */
function drawFit(){
  const f=FITOUT,tr=Object.keys(f).filter(k=>k!=='Total');
  const short={'General Requirements, General Conditions & Fee':'General reqs, GCs & fee','Mechanical, Plumbing, Fire Protection':'Mechanical, plumbing, fire','Drywall, Acoustic, Carpentry':'Drywall, acoustic, carpentry','Doors, Frames, Hdwr':'Doors, frames, hardware','Misc. Architectural Trades':'Misc. architectural','Arch. Millwork':'Millwork'};
  const t=f.Total;
  $('fitTot').innerHTML=[['Vancouver',t.Vancouver,'var(--van)'],['Calgary',t.Calgary,'var(--cal)']].map(([c,v,col])=>
    `<div><span class="c">${c} total</span><span class="v" style="color:${col}">$${v[2].toFixed(2)}/sf</span><span class="d">${pct((v[2]/v[1]-1)*100)} vs 2025</span></div>`).join('');
  const order=tr.sort((a,b)=>f[b].Vancouver[2]-f[a].Vancouver[2]);
  mk('fitChart',{type:'bar',data:{labels:order.map(k=>short[k]||k),datasets:[
    {label:'Vancouver',data:order.map(k=>f[k].Vancouver[2]),backgroundColor:'rgba(56,217,245,.78)',borderRadius:3},
    {label:'Calgary',data:order.map(k=>f[k].Calgary[2]),backgroundColor:'rgba(255,155,94,.8)',borderRadius:3}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{...TIP,callbacks:{label:c=>{const k=order[c.dataIndex],v=f[k][c.dataset.label];return ` ${c.dataset.label}: $${v[2].toFixed(2)}/sf (${pct((v[2]/v[1]-1)*100)} vs 2025)`}}}},
      scales:{x:axis(v=>'$'+v),y:{grid:{display:false},border:{display:false},ticks:{color:C.muted,autoSkip:false}}}}});
}

/* ---------- sources ---------- */
function sources(){
  const S=[
    {n:'Statistics Canada BCPI',e:'Table 18-10-0289-01 · Q3 2026',c:[1,1],st:'live',p:'Quarterly building price index by type, 1981 onward. Drives both calculators and the index chart.',u:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810028901'},
    {n:'Altus Group Canadian Cost Guide',e:'2024 & 2026 editions',c:[1,0],st:'live',p:'Vancouver $/sf ranges for 53 building types, plus year-over-year history.',u:'https://www.altusgroup.com/featured-insights/canadian-cost-guide/'},
    {n:'RLB Quarterly Cost Report',e:'North America · Q3 2026',c:[0,1],st:'live',p:'Calgary $/sf ranges for 15 building types and the comparative cost index. RLB does not cover Vancouver.',u:'https://www.rlb.com/americas/insight/rlb-construction-cost-report-north-america-q3-2026/'},
    {n:'Turner & Townsend Canada MI',e:'Q3 2026 · Tariffs and turbulence',c:[1,1],st:'live',p:'Bid-price escalation forecasts for BC and Alberta, 2026–2027, and the national baseline to 2028.',u:'https://marketintelligence.turnerandtownsend.com/canada-mi-q3-2026/provincial-overview'},
    {n:'Cushman & Wakefield Fit Out Cost Guide',e:'Americas · 2026',c:[1,1],st:'live',p:'Office interior fit-out $/sf by trade, 2024–2026.',u:'https://www.cushmanwakefield.com/en/canada/insights/office-fit-out-cost-guide'},
    {n:'BuildForce Canada',e:'2026–2035 outlook',c:[1,1],st:'live',p:'Construction labour supply and demand by province.',u:'https://www.buildforce.ca/'},
    {n:'Altus Calgary tables',e:'2026 guide',c:[0,1],st:'gated',p:'Behind a sign-up form. Adding it gives Calgary and Vancouver from one publisher.',u:'https://www.altusgroup.com/featured-insights/canadian-cost-guide/'},
    {n:'Turner & Townsend cost guide',e:'Canada MI · Q1 2026',c:[1,1],st:'gated',p:'CA$/sf by building type for Canadian cities, published as an image/PDF only.',u:'https://marketintelligence.turnerandtownsend.com/canada-mi-q1-2026/annual-cost-guide'},
    {n:'BTY Market Intelligence',e:'2026 report',c:[1,1],st:'gated',p:'Emailed after a sign-up form. No public figures.',u:'https://www.bty.com/market-intelligence/'},
  ];
  $('sources').innerHTML=S.map(s=>`<div class="s-card"><div class="h"><b>${s.n}</b><span class="st ${s.st}">${s.st==='live'?'In use':'Gated'}</span></div>
    <div class="cov"><span class="${s.c[0]?'on':'off'} van">VAN</span><span class="${s.c[1]?'on':'off'} cal">CAL</span><span class="ed">${s.e}</span></div>
    <p>${s.p}</p><a href="${s.u}" target="_blank" rel="noopener">${s.u.replace(/^https?:\/\/(www\.)?/,'').split('/')[0]} ↗</a></div>`).join('');
}

/* ---------- starfield ---------- */
function sky(){
  const cv=$('sky'),x=cv.getContext('2d');let stars=[];
  function size(){const d=Math.min(devicePixelRatio||1,2);cv.width=innerWidth*d;cv.height=innerHeight*d;x.setTransform(d,0,0,d,0,0);
    let s=7;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647};
    stars=Array.from({length:Math.round(innerWidth*innerHeight/5200)},()=>({x:rnd()*innerWidth,y:rnd()*innerHeight,r:rnd()*1.1+.25,p:rnd()*6.28,s:.4+rnd()*1.2}));}
  function frame(t){x.clearRect(0,0,innerWidth,innerHeight);
    for(const s of stars){const a=REDUCED?.6:.35+.5*Math.abs(Math.sin(s.p+t/1000*s.s*.6));x.fillStyle=`rgba(225,215,255,${a})`;x.beginPath();x.arc(s.x,s.y,s.r,0,6.283);x.fill()}
    if(!REDUCED)requestAnimationFrame(frame)}
  size();addEventListener('resize',()=>{size();if(REDUCED)frame(0)});requestAnimationFrame(frame);
}

/* ---------- init ---------- */
fillTypes($bt,'Non-residential');fillTypes($it,'Non-residential');
fillYears();fillTo();fillRomAt();
kpis();sectorChips();drawIndex();drawForecast();signals();drawAltus();drawFit();sources();sky();
setMode('rom');
const h=(location.hash||'').slice(1);
setCity(['vancouver','calgary','compare'].includes(h)?h:'compare',false);
drawEsc();
addEventListener('hashchange',()=>{const k=location.hash.slice(1);if(['vancouver','calgary','compare'].includes(k)&&k!==city)setCity(k,false)});
})();
