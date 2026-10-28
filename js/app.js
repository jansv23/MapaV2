'use strict';
const $=id=>document.getElementById(id);
const CRC=new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:0});
const CRD=new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC',minimumFractionDigits:2,maximumFractionDigits:2});
const NF=new Intl.NumberFormat('es-CR');
const SEG=[{id:'neutral',label:'Sin segmento (< ₡500 mil)',color:'#a3abb5'},{id:'high',label:'₡500 mil a ₡1 millón',color:'#4c8ee6'},{id:'premium',label:'Más de ₡1 millón',color:'#229d83'}];
let all=[],filtered=[],map,cluster,pointByCode=new Map(),page=0,loadedFile='',issues=[];const PAGE_SIZE=12;
const clean=v=>String(v??'').trim();
const safe=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const amount=v=>{if(typeof v==='number')return Number.isFinite(v)?v:NaN;let s=clean(v).replace(/[₡\s]/g,'');if(!s)return NaN;if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else if(s.includes(','))s=s.replace(',','.');return Number(s)};
const category=x=>x<500000?'neutral':x<=1000000?'high':'premium';
const locate=s=>{if(typeof s!=='string')s=clean(s);const m=s.match(/(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]+\s*(-?\d{2,3}(?:[.,]\d+)?)/);if(!m)return null;const lat=Number(m[1].replace(',','.')),lon=Number(m[2].replace(',','.'));return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=8&&lat<=12&&lon>=-86.5&&lon<=-82?[lat,lon]:null};
function extract(book){const output=[],problems=[],seen=new Set();for(const sheet of book.SheetNames){const rows=XLSX.utils.sheet_to_json(book.Sheets[sheet],{header:1,raw:true,defval:null});const find=rows.findIndex(r=>r.some(v=>norm(v)==='cliente')&&r.some(v=>norm(v)==='nombre'));if(find<0){problems.push(`Hoja ${sheet}: no se encontraron encabezados`);continue;}const h=rows[find].map(norm),idx=(...keys)=>h.findIndex(t=>keys.some(k=>t===k||t.includes(k)));let ci=idx('cliente'),ni=idx('nombre'),di=idx('direccion'),ai=idx('total'),li=idx('coordenadas');if(li<0)li=h.findIndex(x=>x.includes('coord'));if(ci<0||ni<0||li<0||ai<0){problems.push(`Hoja ${sheet}: faltan columnas`);continue;}let seller=clean(sheet);for(let i=find+1;i<rows.length;i++){const r=rows[i];let code=clean(r[ci]);if(!code||/^(total|cliente)$/i.test(code))continue;const name=clean(r[ni]);const total=amount(r[ai]);if(!name||!Number.isFinite(total)){problems.push(`Hoja ${seller}, fila ${i+1}: nombre o monto inválido`);continue;}if(seen.has(code)){problems.push(`Código repetido ${code}: se conserva la primera aparición`);continue;}seen.add(code);const coord=locate(r[li]);if(!coord)problems.push(`Cliente ${code}: coordenadas ausentes o fuera de Costa Rica`);output.push({code,name,address:di>=0?clean(r[di]):'',amount:total,seller,coord,segment:category(total)});}}
return {clients:output,problems};}
let cartoTiles=null;
function setCartoBasemap(key){
  if(!map)return;
  const k=String(key||'').trim();
  if(cartoTiles){map.removeLayer(cartoTiles);cartoTiles=null;}
  if(!k){$('map-setup').hidden=false;return;}
  $('map-setup').hidden=true;
  try { sessionStorage.setItem('atlas-carto-key',k); } catch(e) { console.warn('Almacenamiento temporal no disponible',e); }
  let failureCount=0;
  cartoTiles=L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key='+encodeURIComponent(k),{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution/">CARTO</a>',
    subdomains:'abcd',maxZoom:20,crossOrigin:false
  }).addTo(map);
  cartoTiles.on('tileerror',()=>{failureCount++;if(failureCount===3){$('map-setup').hidden=false;showNotice('No se cargó el mapa CARTO. Comprobá que la clave API sea válida y que permita usar localhost o el dominio donde publicaste el dashboard.','error');}});
  cartoTiles.on('tileload',()=>{if(failureCount<3)$('map-setup').hidden=true;});
}
function initMap(){
  if(typeof L==='undefined'){showNotice('No se cargó Leaflet. Revisá tu conexión a internet.','error');return;}
  map=L.map('map',{zoomControl:false,preferCanvas:true}).setView([9.75,-84.15],8);
  L.control.zoom({position:'bottomright'}).addTo(map);
  cluster=L.layerGroup(); // Puntos individuales: evita errores internos de MarkerCluster.
  map.addLayer(cluster);
  let previous=''; try { previous=sessionStorage.getItem('atlas-carto-key')||''; } catch(e) { console.warn(e); }
  $('carto-key').value=previous;
  if(previous)setCartoBasemap(previous);

}
function addMarker(c){
  if(!c.coord || !map || !cluster)return;
  const color=SEG.find(s=>s.id===c.segment).color;
  const radius=Math.max(5,Math.min(15,5+Math.sqrt(Math.max(0,c.amount)/250000)*1.1));
  const marker=L.circleMarker(c.coord,{radius,color:'#fff',weight:1.7,fillColor:color,fillOpacity:.9,opacity:1,bubblingMouseEvents:false});
  marker.bindPopup(`<div class="client-popup"><small>CLIENTE ${safe(c.code)}</small><b>${safe(c.name)}</b><div class="pop-value">${CRD.format(c.amount)}</div><small>COMPRAS ACUMULADAS</small><p>${safe(c.address)||'Dirección no indicada'}</p><div class="pop-meta"><span>${safe(c.seller)}</span><span>${safe(c.coord.map(n=>n.toFixed(5)).join(', '))}</span></div></div>`,{maxWidth:270});
  cluster.addLayer(marker);
  pointByCode.set(c.code,marker);
}
function mapRender(fit=false){if(!map||!cluster)return;cluster.clearLayers();pointByCode.clear();filtered.forEach(addMarker);$('map-summary').textContent=`${NF.format(pointByCode.size)} ubicaciones visibles`;if(fit&&pointByCode.size){const positions=filtered.filter(c=>c.coord).map(c=>c.coord);map.fitBounds(L.latLngBounds(positions).pad(.10),{maxZoom:12,animate:false});}setTimeout(()=>map.invalidateSize(),80);}
function kpis(){const sum=filtered.reduce((a,b)=>a+b.amount,0),geo=filtered.filter(x=>x.coord).length;const nf=filtered.length;$('kpi-sales').textContent=CRC.format(sum);$('kpi-clients').textContent=NF.format(geo);$('kpi-location-note').textContent=`${nf-geo} clientes sin coordenadas`;$('kpi-sellers').textContent=NF.format(new Set(filtered.map(c=>c.seller)).size);$('kpi-average').textContent=nf?CRC.format(sum/nf):'—';$('filtered-count').textContent=`${NF.format(nf)} clientes`;$('donut-total').textContent=NF.format(nf);$('table-count').textContent=`${NF.format(nf)} registros`}
function sellerBars(){const sums={};for(const c of filtered)sums[c.seller]=(sums[c.seller]||0)+c.amount;const ranks=Object.entries(sums).sort((a,b)=>b[1]-a[1]);const max=ranks[0]?.[1]||1;$('seller-bars').classList.remove('empty-list');$('seller-bars').innerHTML=ranks.length?ranks.map(([name,val])=>`<div class="bar-item"><div class="bar-line-head"><strong>${safe(name)}</strong><span>${CRC.format(val)}</span></div><div class="bar-track"><div class="bar-fill" style="width:${100*val/max}%"></div></div></div>`).join(''):'Sin clientes con estos filtros.';}
function segments(){const vals=SEG.map(s=>({...s,count:filtered.filter(c=>c.segment===s.id).length}));const n=filtered.length;let cursor=0,parts=[];for(const v of vals){const end=cursor+(n?v.count/n*100:0);parts.push(`${v.color} ${cursor}% ${end}%`);cursor=end;}$('donut').style.background=n?`conic-gradient(${parts.join(',')})`:'#edf1f5';$('segment-details').innerHTML=vals.map(v=>`<div class="segment-row"><span><i class="legend-dot" style="background:${v.color}"></i>${safe(v.label)}</span><b>${NF.format(v.count)}</b></div>`).join('')}
function renderTable(){const start=page*PAGE_SIZE,items=filtered.slice(start,start+PAGE_SIZE);$('client-rows').innerHTML=items.length?items.map(c=>`<tr data-code="${safe(c.code)}"><td>${safe(c.name)}<div class="client-sub" title="${safe(c.address)}">${safe(c.address)}</div></td><td>${safe(c.code)}</td><td>${safe(c.seller)}</td><td>${CRC.format(c.amount)}</td><td><span class="tiny-location">${c.coord?'⌖ Ver en mapa':'No disponible'}</span></td></tr>`).join(''):'<tr><td colspan="5" class="empty-row">Sin resultados para estos filtros.</td></tr>';$('page-status').textContent=filtered.length?`${NF.format(start+1)}–${NF.format(Math.min(start+PAGE_SIZE,filtered.length))} de ${NF.format(filtered.length)}`:'0 resultados';$('prev-btn').disabled=page===0;$('next-btn').disabled=(page+1)*PAGE_SIZE>=filtered.length;}
function update(fit=false){const q=norm($('search').value),seller=$('seller').value,seg=$('range').value,min=Number($('min-purchase').value);filtered=all.filter(c=>(!q||norm(`${c.name} ${c.code} ${c.address}`).includes(q))&&(!seller||c.seller===seller)&&(!seg||c.segment===seg)&&c.amount>=min).sort((a,b)=>b.amount-a.amount);page=0;kpis();sellerBars();segments();renderTable();try{mapRender(fit);}catch(e){console.error('Error al dibujar los puntos:',e);showNotice('No se pudieron dibujar los puntos: '+e.message,'error');}$('export-btn').disabled=!filtered.length;}
function showNotice(msg,kind='warning'){const n=$('notice');if(!n){console.error(msg);return;}n.className='notice '+kind;n.innerHTML=`<div class="notice-icon">${kind==='error'?'!':'ⓘ'}</div><div><strong>${kind==='error'?'Problema al cargar el archivo':'Revisión de datos'}</strong><p>${safe(msg)}</p></div>`;}
async function loadFile(file){if(!file)return;if(typeof XLSX==='undefined'){showNotice('No se pudo cargar la biblioteca de Excel. Revisá tu conexión.','error');return;}try{const buffer=await file.arrayBuffer();const wb=XLSX.read(buffer,{type:'array',cellDates:true});const result=extract(wb);if(!result.clients.length)throw Error('No se encontraron clientes. Revisá que existan las columnas Cliente, Nombre, Total y Coordenadas.');all=result.clients;issues=result.problems;loadedFile=file.name;$('file-label').textContent=file.name;$('dataset-label').textContent=`${NF.format(all.length)} clientes · ${wb.SheetNames.length} hojas`;$('seller').innerHTML='<option value="">Todos los vendedores</option>'+[...new Set(all.map(c=>c.seller))].sort().map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('');$('search').value='';$('seller').value='';$('range').value='';$('min-purchase').value='0';$('min-output').textContent='₡0';if(issues.length)showNotice(`${issues.length} advertencia(s) encontradas. ${issues.slice(0,2).join(' · ')}`);else $('notice').className='notice hidden';update(true);}catch(e){showNotice(e.message||String(e),'error');}}
function openClient(code){const c=filtered.find(x=>x.code===code);const marker=pointByCode.get(code);if(!c||!marker||!map)return;document.getElementById('territorio').scrollIntoView({behavior:'smooth'});map.setView(marker.getLatLng(),14);marker.openPopup()}
function csvExport(){if(!filtered.length)return;const cols=['Codigo cliente','Nombre','Direccion','Vendedor','Total CRC','Latitud','Longitud','Segmento'];const csv=[cols,...filtered.map(c=>[c.code,c.name,c.address,c.seller,c.amount,c.coord?.[0]??'',c.coord?.[1]??'',c.segment])].map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(';')).join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='clientes_filtrados.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
function toggleFullscreen(){
  const panel=document.querySelector('.map-panel');
  if(!panel)return;
  if(document.fullscreenElement===panel){document.exitFullscreen?.().catch(e=>showNotice('No se pudo salir de pantalla completa: '+e.message,'error'));return;}
  if(panel.requestFullscreen){panel.requestFullscreen().catch(e=>showNotice('El navegador no permitió pantalla completa: '+e.message,'error'));}
  else {panel.classList.toggle('fallback-fullscreen'); document.body.classList.toggle('map-expanded',panel.classList.contains('fallback-fullscreen'));afterMapResize();}
}
function afterMapResize(){if(map){setTimeout(()=>map.invalidateSize(true),120);setTimeout(()=>map.invalidateSize(true),350);}}
document.addEventListener('fullscreenchange',()=>{const btn=$('fullscreen-btn');if(btn)btn.textContent=document.fullscreenElement?'⤢ Salir de pantalla completa':'⛶ Pantalla completa';afterMapResize();});
function events(){$('file-input').addEventListener('change',e=>loadFile(e.target.files[0]));['search','seller','range'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',()=>update(false)));$('min-purchase').addEventListener('input',e=>{$('min-output').textContent=CRC.format(Number(e.target.value));update(false)});$('reset-btn').addEventListener('click',()=>{$('search').value='';$('seller').value='';$('range').value='';$('min-purchase').value='0';$('min-output').textContent='₡0';update(true)});$('fit-btn').addEventListener('click',()=>mapRender(true));$('fullscreen-btn').addEventListener('click',toggleFullscreen);$('client-rows').addEventListener('click',e=>{const tr=e.target.closest('tr[data-code]');if(tr)openClient(tr.dataset.code)});$('export-btn').addEventListener('click',csvExport);$('prev-btn').addEventListener('click',()=>{page--;renderTable()});$('next-btn').addEventListener('click',()=>{page++;renderTable()})}
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>{
  // Los controles siempre se habilitan, aunque el mapa o un CDN fallen.
  try { events(); } catch(e) { console.error('Error iniciando controles:',e); showNotice('Error iniciando controles: '+e.message,'error'); }
  try { segments(); } catch(e) { console.error(e); }
  $('carto-save').addEventListener('click',()=>{
    const k=$('carto-key').value.trim();
    if(!k){showNotice('Ingresá una clave CARTO antes de activar el mapa.','error');return;}
    if(!map){showNotice('Leaflet no pudo inicializar el mapa. Los datos de Excel pueden cargarse igualmente. Revisá la consola (F12).','error');return;}
    try {setCartoBasemap(k);showNotice('Se solicitó cargar CARTO. Si el fondo sigue vacío, revisá la clave y sus restricciones de dominio.','warning');}
    catch(e){console.error(e);showNotice('Error activando mapa: '+e.message,'error');}
  });
  $('map-config-btn').addEventListener('click',()=>{$('map-setup').hidden=false;});
  try {initMap();} catch(e){console.error('Error iniciando mapa:',e);showNotice('Error iniciando mapa: '+e.message+'. Podés cargar el Excel y usar el directorio.','error');}
});
if(typeof module!=='undefined')module.exports={extract,locate,category,amount};
