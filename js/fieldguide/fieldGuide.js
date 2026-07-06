import { ROLES, tasksForRoles } from './roleManager.js';
import { initWorkSelector } from './workSelector.js';
import { renderTradeTasks, renderRoleTasks } from './checklist.js';
import { buildFieldSummary } from './aiPlanner.js';
import { buildTbmText } from './tbmGenerator.js';

let selectedRoles = new Set(JSON.parse(localStorage.getItem('selectedRoles')||'[]'));
let currentTrades = [];
let latestSummary = null;
let latestRain = [];
let latestSafety = [];

export function initFieldGuide(){
  renderRoles();
  const selector = initWorkSelector((trades)=>{ currentTrades=trades; updateFieldGuide(latestRain, latestSafety); });
  currentTrades = selector?.getSelected?.() || [];
  document.getElementById('copyGuideBtn')?.addEventListener('click',()=>navigator.clipboard?.writeText(document.getElementById('tbmText')?.value||''));
  document.getElementById('printGuideBtn')?.addEventListener('click',()=>window.print());
}

export function updateFieldGuide(rainRows=[], safetyRows=[]){
  latestRain=rainRows; latestSafety=safetyRows;
  latestSummary = buildFieldSummary(rainRows, safetyRows);
  renderRiskSummary(latestSummary);
  renderRoleTasks(tasksForRoles([...selectedRoles], latestSummary));
  renderTradeTasks(currentTrades);
  const tbm=document.getElementById('tbmText'); if(tbm) tbm.value=buildTbmText(latestSummary,currentTrades);
}

function renderRoles(){
  const box=document.getElementById('roleSelector'); if(!box)return;
  box.innerHTML=ROLES.map(r=>`<button type="button" class="chip ${selectedRoles.has(r)?'active':''}" data-role="${r}">${r}</button>`).join('');
  box.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{ const r=btn.dataset.role; selectedRoles.has(r)?selectedRoles.delete(r):selectedRoles.add(r); localStorage.setItem('selectedRoles',JSON.stringify([...selectedRoles])); renderRoles(); updateFieldGuide(latestRain, latestSafety); }));
}

function renderRiskSummary(s){ const el=document.getElementById('fieldRiskSummary'); if(!el)return; el.innerHTML=`<div class="guide-item"><b>오늘 집중관리</b><p>${s.heatText}</p><small>${s.maxHeatText}</small></div><div class="guide-item"><b>강수</b><p>${s.rainText}</p></div><div class="guide-item"><b>관리자 주의요망</b><p>${s.advice.join('<br>')}</p></div>`; }
