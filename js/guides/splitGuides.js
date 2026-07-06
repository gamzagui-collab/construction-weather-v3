import { buildScheduleTasksForDate } from "../schedule/siteSchedule.js";

function todayIso(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function renderTaskGroups(obj, cls){
  const entries = Object.entries(obj || {});
  if (!entries.length) return `<div class="task-line ${cls}">오늘 스케줄 기반 추가 할 일이 없습니다.</div>`;
  return entries.map(([group,tasks]) => `
    <div class="task-group-title">${group}</div>
    <div class="task-list">
      ${[...new Set(tasks)].slice(0,12).map(t => `<label class="task-line ${cls}"><input type="checkbox"> ${t}</label>`).join("")}
    </div>
  `).join("");
}

export function renderTodaySafetyGuide(rootId="todaySafetyGuideRoot"){
  const root = document.getElementById(rootId);
  if (!root) return;
  const { safety, rows } = buildScheduleTasksForDate(todayIso());

  root.innerHTML = `
    <div class="ga-section-title">🛡 오늘의 안전가이드</div>
    <div class="guide-card">
      <p><b>07:00~17:00 작업시간 기준</b> · 현장스케줄 ${rows.length}건 반영</p>
      ${renderTaskGroups(safety, "safety")}
    </div>
  `;
}

export function renderTodayFieldGuide(rootId="todayFieldGuideRoot"){
  const root = document.getElementById(rootId);
  if (!root) return;
  const { field, rows } = buildScheduleTasksForDate(todayIso());

  root.innerHTML = `
    <div class="ga-section-title">🏗 오늘의 현장가이드</div>
    <div class="guide-card">
      <p><b>공사·품질·자재 중심</b> · 안전 관련 항목은 오늘의 안전가이드로 분리</p>
      ${renderTaskGroups(field, "field")}
    </div>
  `;
}

function refreshGuides(){
  renderTodaySafetyGuide();
  renderTodayFieldGuide();
}
document.addEventListener("DOMContentLoaded", refreshGuides);
window.addEventListener("guiArc:scheduleUpdated", refreshGuides);
