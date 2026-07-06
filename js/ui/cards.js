import { safetyLevel } from '../weather/temperature.js';
import { buildHealthRisk } from '../safety/healthRisk.js';
export function updateTopSafety(row){ if(!row)return; const lv=safetyLevel(row); set('topTemp',fmt(row.temperature)+'℃'); set('topApparent',fmt(row.apparentTemperature)+'℃'); set('topHumidity',fmt(row.humidity,0)+'%'); set('topWind',fmt(row.windSpeed)+' m/s'); set('topSafety',lv.label); }
export function renderHealthRisk(row){ const el=document.getElementById('healthRiskCard'); if(!el)return; const r=buildHealthRisk(row); el.innerHTML=`<h3>${r.stars} ${r.title}</h3><p>${r.body}</p><h4>예상 증상</h4><ul>${r.symptoms.map(s=>`<li>${s}</li>`).join('')}</ul>`; }
function set(id,v){const el=document.getElementById(id); if(el)el.textContent=v} function fmt(v,n=1){return typeof v==='number'?v.toFixed(n):'-'}
