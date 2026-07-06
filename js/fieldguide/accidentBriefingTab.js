
import { ACCIDENT_CASES } from "../database/accidentCases.js";
import { SAFETY_SOURCES } from "../database/safetySources.js";

const WORK_HOURS = { start: 7, end: 17 };

function getSelectedTradeNames(){
  const names = new Set();

  document.querySelectorAll("input[type='checkbox']:checked").forEach((el) => {
    const text = (el.dataset.trade || el.value || el.closest("label")?.textContent || "").trim();
    if (text && text.length < 40) names.add(text);
  });

  try{
    const stored = JSON.parse(localStorage.getItem("selectedTrades") || "[]");
    stored.forEach((item) => names.add(item.name || item.trade || item));
  }catch{}

  return [...names].filter(Boolean);
}

function matchCases(tradeNames){
  if (!tradeNames.length) return ACCIDENT_CASES.slice(0, 6);

  const matched = ACCIDENT_CASES.filter((item) => {
    const hay = `${item.majorWork} ${item.trade}`;
    return tradeNames.some((name) => hay.includes(name) || name.includes(item.trade) || item.trade.includes(name));
  });

  return (matched.length ? matched : ACCIDENT_CASES).slice(0, 8);
}

function buildTopTypes(cases){
  const map = {};
  cases.forEach((c) => {
    map[c.accidentType] ||= { type:c.accidentType, count:0, checks:new Set(), standards:new Set(), causes:new Set() };
    map[c.accidentType].count += 1;
    c.fieldChecks.forEach((x) => map[c.accidentType].checks.add(x));
    c.standards.forEach((x) => map[c.accidentType].standards.add(x));
    map[c.accidentType].causes.add(c.mainCause);
  });

  return Object.values(map).sort((a,b)=>b.count-a.count).slice(0,5).map((x, idx)=>({
    ...x,
    level: idx < 2 ? "high" : idx < 4 ? "mid" : "low",
    checks:[...x.checks].slice(0,5),
    standards:[...x.standards].slice(0,4),
    causes:[...x.causes].slice(0,3)
  }));
}

function buildTbm(top, tradeNames){
  const lines = [];
  lines.push("📋 오늘의 건설사고 예방 TBM");
  lines.push(`작업시간 기준: ${WORK_HOURS.start}:00~${WORK_HOURS.end}:00`);
  lines.push("");
  lines.push(`오늘 선택 공종: ${tradeNames.length ? tradeNames.join(", ") : "공종 미선택 - 일반 건설작업 기준"}`);
  lines.push("");
  lines.push("중점 사고유형");
  top.forEach((risk, i) => {
    lines.push(`${i+1}. ${risk.type}`);
    risk.checks.slice(0,3).forEach((check) => lines.push(`   □ ${check}`));
  });
  lines.push("");
  lines.push("현장 공통 전달사항");
  lines.push("□ 작업 전 위험성평가와 TBM을 실시하십시오.");
  lines.push("□ 작업반경 출입통제, 신호수 배치, 보호구 착용상태를 확인하십시오.");
  lines.push("□ 사고사례 1건을 공유하고 우리 현장 확인사항을 즉시 점검하십시오.");
  return lines.join("\n");
}

function renderAccidentBriefing(){
  const host = document.getElementById("accidentBriefingRoot");
  if (!host) return;

  const tradeNames = getSelectedTradeNames();
  const cases = matchCases(tradeNames);
  const top = buildTopTypes(cases);
  const today = new Date().toLocaleDateString("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit", weekday:"short" });
  const tbm = buildTbm(top, tradeNames);

  const topHtml = top.map((risk, idx) => `
    <div class="accident-info-card">
      <strong>${idx+1}. ⚠ ${risk.type}</strong>
      <div>
        <span class="accident-pill accident-${risk.level}">${risk.level === "high" ? "상" : risk.level === "mid" ? "중" : "하"}</span>
      </div>
      <p><b>주요 원인</b><br>${risk.causes.join("<br>")}</p>
      <b>우리 현장 확인 5가지</b>
      <ul class="accident-check-list">
        ${risk.checks.map((c)=>`<li>${c}</li>`).join("")}
      </ul>
      <b>관련 기준</b>
      <ul class="accident-check-list">
        ${risk.standards.map((s)=>`<li>${s}</li>`).join("")}
      </ul>
    </div>
  `).join("");

  const latestHtml = cases.slice(0,3).map((c) => `
    <div class="accident-info-card">
      <strong>📅 ${c.date} · 📍 ${c.region}</strong>
      <p>🏗 ${c.majorWork} / ${c.trade}</p>
      <p>⚠ ${c.accidentType}</p>
      <p>❗ ${c.mainCause}</p>
    </div>
  `).join("");

  const sourceHtml = SAFETY_SOURCES.map((s) => `
    <a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.button}</a>
  `).join("");

  host.innerHTML = `
    <section class="accident-briefing-card">
      <div class="accident-briefing-title">🚨 오늘의 건설사고 브리핑</div>
      <div class="accident-briefing-sub">
        ${today} 기준 · 선택 공종과 사고유형 DB를 바탕으로 TBM용 사고 예방 브리핑을 생성합니다.
        실제 신규 사고는 하단 공식 채널 4곳에서 확인하세요.
      </div>

      <div class="accident-grid">
        ${latestHtml}
      </div>
    </section>

    <section class="accident-briefing-card">
      <div class="accident-briefing-title">⚠ 사고위험 TOP5</div>
      <div class="accident-grid">
        ${topHtml}
      </div>
    </section>

    <section class="accident-briefing-card">
      <div class="accident-briefing-title">📋 TBM 교육자료 자동 생성</div>
      <pre id="accidentTbmText" class="accident-tbm">${tbm}</pre>
      <button class="accident-copy-btn" id="copyAccidentTbmBtn">TBM 문구 복사</button>
    </section>

    <section class="accident-briefing-card">
      <div class="accident-briefing-title">📚 공식 확인 채널 바로가기</div>
      <div class="accident-source-buttons">
        ${sourceHtml}
      </div>
    </section>
  `;

  document.getElementById("copyAccidentTbmBtn")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(tbm);
    alert("건설사고 TBM 문구를 복사했습니다.");
  });
}

function installAccidentTab(){
  const tabButtons = document.querySelector(".tab-buttons, .tabs, .tab-nav, nav");
  const tabContents = document.querySelector(".tab-contents, main, .layout, body");

  if (!document.getElementById("accidentBriefingPanel")) {
    const panel = document.createElement("section");
    panel.id = "accidentBriefingPanel";
    panel.className = "tab-panel accident-panel";
    panel.style.display = "none";
    panel.innerHTML = `<div id="accidentBriefingRoot"></div>`;
    tabContents?.appendChild(panel);
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tab-btn accident-tab-btn";
  btn.textContent = "🚨 건설사고 브리핑";
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-panel, .tab-content").forEach((p) => p.style.display = "none");
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.getElementById("accidentBriefingPanel").style.display = "block";
    btn.classList.add("active");
    renderAccidentBriefing();
  });

  if (tabButtons) {
    tabButtons.appendChild(btn);
  } else {
    document.body.prepend(btn);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  installAccidentTab();
  window.GUI_ARC_renderAccidentBriefing = renderAccidentBriefing;
});
