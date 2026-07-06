import { APP_CONFIG } from './config.js';
import { fetchForecast } from './api/workerApi.js';
import { initTabs } from './ui/tabs.js';
import { renderRainTable, renderSafetyTable } from './ui/tables.js';
import { updateTopSafety, renderHealthRisk } from './ui/cards.js';
import { renderTodaySafetyChart, renderEnvironmentChart } from './charts/safetyCharts.js';
import { initFieldGuide, updateFieldGuide } from './fieldguide/fieldGuide.js';

let state = { rainRows: [], safetyRows: [], location: APP_CONFIG.defaultLocation };

document.addEventListener('DOMContentLoaded',()=>{
  initTabs(); initFieldGuide();
  document.getElementById('searchBtn')?.addEventListener('click',handleSearch);
  handleSearch();
});

async function handleSearch(){
  const btn=document.getElementById('searchBtn'); if(btn){btn.disabled=true;btn.textContent='조회 중...'}
  try{
    state.location = parseLocation();
    const data = await fetchForecast(state.location);
    state.rainRows = data.rows || [];
    state.safetyRows = data.safetyRows || data.weatherRows || buildSafetyFallback(data.rows||[]);
    renderRainTable(state.rainRows);
    renderSafetyTable(state.safetyRows);
    updateTopSafety(currentSafetyRow(state.safetyRows));
    renderHealthRisk(currentSafetyRow(state.safetyRows));
    renderTodaySafetyChart(state.safetyRows);
    renderEnvironmentChart(state.safetyRows);
    updateFieldGuide(state.rainRows, state.safetyRows);
  }catch(e){ console.error(e); alert(e.message||'조회 실패'); }
  finally{ if(btn){btn.disabled=false;btn.textContent='예보 조회'} }
}

function parseLocation(){
  const coord=document.getElementById('customCoord')?.value.trim();
  if(coord){ const m=coord.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/); if(m) return {name:'직접 입력 좌표',lat:Number(m[1]),lon:Number(m[2])}; }
  return {...APP_CONFIG.defaultLocation, name: document.getElementById('regionSearch')?.value.trim() || APP_CONFIG.defaultLocation.name};
}
function currentSafetyRow(rows){ return rows.find(r=>{const h=parseInt(r.hour);return h>=7}) || rows[0]; }
function buildSafetyFallback(rows){ return rows.map(r=>({date:r.date,weekday:r.weekday,hour:r.hour,temperature:null,apparentTemperature:null,humidity:null,windSpeed:null})); }
