import { MATERIAL_RULES } from "../database/materialRules.js";

const STORAGE_KEY = "guiArc.siteSchedule.v62";

function todayIso(){
  const d = new Date();
  return toIsoDate(d);
}
function toIsoDate(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function addDays(date, n){
  const d = new Date(date);
  d.setDate(d.getDate()+n);
  return d;
}
export function loadSchedule(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");}
  catch{return [];}
}
export function saveSchedule(items){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("guiArc:scheduleUpdated", { detail: items }));
}
export function getScheduleByDate(date){
  return loadSchedule().filter(x => x.date === date).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
}
export function getTodaySchedule(){
  return getScheduleByDate(todayIso());
}
export function findMaterialRule(materialName=""){
  const text = String(materialName).toLowerCase();
  return MATERIAL_RULES.materials.find(m => m.keywords.some(k => text.includes(k.toLowerCase())) || text.includes(m.name.toLowerCase()));
}
export function buildScheduleTasksForDate(date){
  const rows = getScheduleByDate(date);
  const safety = {};
  const field = {};
  rows.forEach((row) => {
    const materialRule = findMaterialRule(row.material) || null;
    const equipment = row.unloadMethod || materialRule?.defaultUnload || "";
    const equipTasks = MATERIAL_RULES.equipmentRules[equipment] || [];

    if (materialRule){
      Object.entries(materialRule.safetyTasks || {}).forEach(([role, tasks]) => {
        safety[role] ||= [];
        tasks.forEach(t => safety[role].push(`[${row.time}] ${row.material}: ${t}`));
      });
      Object.entries(materialRule.fieldTasks || {}).forEach(([group, tasks]) => {
        field[group] ||= [];
        tasks.forEach(t => field[group].push(`[${row.time}] ${row.material}: ${t}`));
      });
    }

    if (equipTasks.length){
      safety["장비관리자"] ||= [];
      equipTasks.forEach(t => safety["장비관리자"].push(`[${row.time}] ${equipment}: ${t}`));
    }

    safety["공통"] ||= [];
    safety["공통"].push(`[${row.time}] ${row.material || "자재"} 반입구역 출입통제 및 차량동선 확인`);

    field["자재"] ||= [];
    field["자재"].push(`[${row.time}] ${row.material || "자재"} ${row.quantity || ""} 반입수량·보관위치 확인`);
  });

  return { safety, field, rows };
}

function getCalendarDays(baseDate = new Date()){
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const startDay = start.getDay();
  const gridStart = addDays(start, -startDay);
  return Array.from({length:42}, (_,i)=>addDays(gridStart,i));
}

export function renderSiteSchedule(rootId="siteScheduleRoot"){
  const root = document.getElementById(rootId);
  if (!root) return;
  let selectedDate = root.dataset.selectedDate || todayIso();

  function draw(){
    const items = loadSchedule();
    const days = getCalendarDays(new Date(selectedDate));
    const daysHtml = days.map(d => {
      const iso = toIsoDate(d);
      const dayItems = items.filter(x => x.date === iso);
      return `<div class="schedule-day ${iso===todayIso()?'today':''} ${iso===selectedDate?'selected':''}" data-date="${iso}">
        <div class="schedule-date">${d.getMonth()+1}/${d.getDate()}</div>
        ${dayItems.slice(0,3).map(x=>`<span class="schedule-chip">📦 ${x.time} ${x.material}</span>`).join("")}
        ${dayItems.length>3?`<span class="schedule-chip">+${dayItems.length-3}건</span>`:""}
      </div>`;
    }).join("");

    const selectedItems = items.filter(x=>x.date===selectedDate).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
    const listHtml = selectedItems.length ? selectedItems.map((x,idx)=>`
      <div class="schedule-item">
        <strong>${x.time} · ${x.material} · ${x.quantity || ""}</strong>
        <div>하차방법: ${x.unloadMethod || "-"} / 장비: ${x.equipment || "-"}</div>
        <div>${x.memo || ""}</div>
        <button class="secondary" data-delete="${x.id}">삭제</button>
      </div>`).join("") : `<div class="schedule-item">선택일 기록이 없습니다.</div>`;

    root.innerHTML = `
      <div class="ga-section-title">📅 현장스케줄</div>
      <div class="schedule-shell">
        <div class="schedule-card">
          <div class="schedule-calendar">${daysHtml}</div>
        </div>
        <div class="schedule-card">
          <h3>📦 자재·장비 반입 기록</h3>
          <p>현장스케줄은 기록만 합니다. 안전가이드와 현장가이드는 이 기록을 읽어 자동 생성됩니다.</p>
          <div class="schedule-form-grid">
            <label>날짜<input id="schDate" type="date" value="${selectedDate}"></label>
            <label>시간<input id="schTime" type="time" value="08:00"></label>
            <label>자재명<input id="schMaterial" placeholder="예: 철근, 레미콘, 유로폼"></label>
            <label>수량<input id="schQty" placeholder="예: 20 pallet, 30톤"></label>
            <label>하차방법
              <select id="schUnload">
                <option>지게차</option><option>크레인</option><option>펌프카</option><option>덤프</option><option>수작업</option>
              </select>
            </label>
            <label>장비<input id="schEquip" placeholder="예: 3톤 지게차, 25톤 크레인"></label>
            <textarea id="schMemo" placeholder="비고: 반입 위치, 차량 대수, 담당자 등"></textarea>
          </div>
          <div class="schedule-actions">
            <button id="addScheduleBtn">기록 추가</button>
            <button class="secondary" id="clearDateScheduleBtn">선택일 전체 삭제</button>
          </div>
          <div class="schedule-list">${listHtml}</div>
        </div>
      </div>
    `;

    root.querySelectorAll(".schedule-day").forEach(el => {
      el.addEventListener("click", () => { selectedDate = el.dataset.date; root.dataset.selectedDate = selectedDate; draw(); });
    });
    root.querySelector("#schDate")?.addEventListener("change", (e)=>{ selectedDate=e.target.value; root.dataset.selectedDate=selectedDate; draw(); });
    root.querySelector("#addScheduleBtn")?.addEventListener("click", () => {
      const newItem = {
        id: `sch-${Date.now()}`,
        date: root.querySelector("#schDate").value,
        time: root.querySelector("#schTime").value,
        material: root.querySelector("#schMaterial").value.trim(),
        quantity: root.querySelector("#schQty").value.trim(),
        unloadMethod: root.querySelector("#schUnload").value,
        equipment: root.querySelector("#schEquip").value.trim(),
        memo: root.querySelector("#schMemo").value.trim()
      };
      if (!newItem.material){ alert("자재명을 입력하세요."); return; }
      const next = [...loadSchedule(), newItem];
      saveSchedule(next);
      selectedDate = newItem.date;
      root.dataset.selectedDate = selectedDate;
      draw();
    });
    root.querySelector("#clearDateScheduleBtn")?.addEventListener("click", () => {
      if (!confirm(`${selectedDate} 기록을 모두 삭제할까요?`)) return;
      saveSchedule(loadSchedule().filter(x=>x.date!==selectedDate));
      draw();
    });
    root.querySelectorAll("[data-delete]").forEach(btn => {
      btn.addEventListener("click", () => {
        saveSchedule(loadSchedule().filter(x=>x.id!==btn.dataset.delete));
        draw();
      });
    });
  }

  draw();
}
document.addEventListener("DOMContentLoaded", () => renderSiteSchedule());
