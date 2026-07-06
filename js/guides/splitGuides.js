
import { buildScheduleTasksForDate } from "../schedule/siteSchedule.js";

function todayIso(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function uniq(arr){
  return [...new Set((arr || []).filter(Boolean))];
}

function renderTaskGroups(obj, cls){
  const entries = Object.entries(obj || {});
  if (!entries.length) return `<div class="task-line ${cls}">오늘 스케줄 기반 추가 할 일이 없습니다.</div>`;
  return entries.map(([group,tasks]) => `
    <div class="task-group-title">${group}</div>
    <div class="task-list">
      ${uniq(tasks).slice(0,18).map(t => `<label class="task-line ${cls}"><input type="checkbox"> ${highlightRiskText(t)}</label>`).join("")}
    </div>
  `).join("");
}

function highlightRiskText(text){
  return String(text)
    .replaceAll("[위험요소/상]", "<b class='risk-high'>⚠ [위험요소/상]</b>")
    .replaceAll("위험", "<b class='risk-high'>위험</b>")
    .replaceAll("추락", "<b class='risk-high'>추락</b>")
    .replaceAll("끼임", "<b class='risk-high'>끼임</b>")
    .replaceAll("협착", "<b class='risk-high'>협착</b>")
    .replaceAll("붕괴", "<b class='risk-high'>붕괴</b>");
}

function collectExistingSafetyItems(){
  const items = {
    "공통": [],
    "안전관리자": [],
    "공정별 안전 주의사항": [],
    "건설사고 브리핑": [],
    "TBM": []
  };

  // 역할별 오늘 할 일 중 안전관리자 섹션 이동
  const roleRoot = document.getElementById("roleChecklist");
  if (roleRoot) {
    const sections = [...roleRoot.querySelectorAll(".guide-section, section, article, div")];
    sections.forEach(sec => {
      const title = sec.querySelector("h3,h4,strong")?.innerText || "";
      if (/안전관리자|안전/.test(title)) {
        sec.querySelectorAll("li,label,p").forEach(el => {
          const t = el.innerText?.replace(/\s+/g," ").trim();
          if (t && t.length > 2) items["안전관리자"].push(t);
        });
      }
    });
  }

  // 공정별 주의사항 중 안전/위험 항목 이동
  const processRoot = document.getElementById("processChecklist");
  if (processRoot) {
    processRoot.querySelectorAll("li,label,p,.guide-item").forEach(el => {
      const t = el.innerText?.replace(/\s+/g," ").trim();
      if (t && /(안전|위험|추락|낙하|끼임|협착|붕괴|감전|화재|분진|온열|보호구|작업반경|신호수)/.test(t)) {
        items["공정별 안전 주의사항"].push(t);
      }
    });
  }

  // 기존 건설안전 브리핑 이동
  const briefRoot = document.getElementById("guideSafetyBriefing");
  if (briefRoot) {
    briefRoot.querySelectorAll("li,label,p,div").forEach(el => {
      const t = el.innerText?.replace(/\s+/g," ").trim();
      if (t && t.length > 4 && t.length < 180) items["건설사고 브리핑"].push(t);
    });
  }

  // TBM도 안전가이드에서 확인 가능하게 요약 이동
  const tbmText = document.getElementById("tbmText")?.innerText?.trim();
  if (tbmText) {
    tbmText.split("\n").map(s=>s.trim()).filter(Boolean).slice(0,12).forEach(line => items["TBM"].push(line));
  }

  return items;
}

function removeSafetyFromFieldGuide(){
  // 현장가이드 쪽 공정별 주의사항에서는 안전 키워드 항목을 시각적으로 숨김 처리
  const processRoot = document.getElementById("processChecklist");
  if (!processRoot) return;
  processRoot.querySelectorAll("li,label,p,.guide-item").forEach(el => {
    const t = el.innerText || "";
    if (/(안전관리자|안전|위험|추락|낙하|끼임|협착|붕괴|감전|화재|분진|온열|보호구|작업반경|신호수)/.test(t)) {
      el.classList.add("moved-to-safety-guide");
      el.style.display = "none";
    }
  });
}

export function renderTodaySafetyGuide(rootId="todaySafetyGuideRoot"){
  const root = document.getElementById(rootId);
  if (!root) return;
  const { safety, rows } = buildScheduleTasksForDate(todayIso());
  const moved = collectExistingSafetyItems();

  root.innerHTML = `
    <div class="ga-section-title">🛡 오늘의 안전가이드</div>
    <div class="guide-card safety-moved-zone">
      <p><b>07:00~17:00 작업시간 기준</b> · 현장스케줄 ${rows.length}건 반영 · 현장가이드의 안전 관련 항목을 이곳으로 분리했습니다.</p>

      <div class="guide-section">
        <h3>현장스케줄 기반 안전조치</h3>
        ${renderTaskGroups(safety, "safety")}
      </div>

      <div class="guide-section">
        <h3>역할별 안전관리자 할 일</h3>
        <div class="task-list">
          ${uniq(moved["안전관리자"]).slice(0,20).map(t=>`<label class="task-line safety"><input type="checkbox"> ${highlightRiskText(t)}</label>`).join("") || `<div class="task-line safety">역할별 안전관리자 항목은 공종 선택 후 표시됩니다.</div>`}
        </div>
      </div>

      <div class="guide-section">
        <h3>공정별 안전 주의사항</h3>
        <div class="task-list">
          ${uniq(moved["공정별 안전 주의사항"]).slice(0,25).map(t=>`<label class="task-line safety"><input type="checkbox"> ${highlightRiskText(t)}</label>`).join("") || `<div class="task-line safety">공정별 안전 주의사항은 공종 선택 후 표시됩니다.</div>`}
        </div>
      </div>

      <div class="guide-section">
        <h3>건설사고 브리핑 요약</h3>
        <div class="task-list">
          ${uniq(moved["건설사고 브리핑"]).slice(0,12).map(t=>`<label class="task-line safety"><input type="checkbox"> ${highlightRiskText(t)}</label>`).join("") || `<div class="task-line safety">건설사고 브리핑 탭에서 사고사례를 확인하세요.</div>`}
        </div>
      </div>

      <div class="guide-section">
        <h3>TBM 확인사항</h3>
        <div class="task-list">
          ${uniq(moved["TBM"]).slice(0,12).map(t=>`<label class="task-line safety"><input type="checkbox"> ${highlightRiskText(t)}</label>`).join("") || `<div class="task-line safety">TBM 문구는 공종 선택 후 자동 생성됩니다.</div>`}
        </div>
      </div>
    </div>
  `;

  removeSafetyFromFieldGuide();
}

export function renderTodayFieldGuide(rootId="todayFieldGuideRoot"){
  const root = document.getElementById(rootId);
  if (!root) return;
  const { field, rows } = buildScheduleTasksForDate(todayIso());

  root.innerHTML = `
    <div class="ga-section-title">🏗 오늘의 현장가이드</div>
    <div class="guide-card">
      <p><b>공사·품질·자재·장비 중심</b> · 안전 관련 항목은 오늘의 안전가이드로 분리합니다.</p>
      ${renderTaskGroups(field, "field")}
    </div>
  `;

  setTimeout(removeSafetyFromFieldGuide, 0);
}

function refreshGuides(){
  renderTodaySafetyGuide();
  renderTodayFieldGuide();
}

document.addEventListener("DOMContentLoaded", () => setTimeout(refreshGuides, 350));
window.addEventListener("guiArc:scheduleUpdated", refreshGuides);
document.addEventListener("change", (e) => {
  if (e.target?.classList?.contains("guide-role") || e.target?.classList?.contains("guide-process")) {
    setTimeout(refreshGuides, 150);
  }
});
window.GUI_ARC_refreshSplitGuides = refreshGuides;
