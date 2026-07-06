import { ROLES, tasksForRoles } from './roleManager.js';
import { initWorkSelector } from './workSelector.js';
import { renderTradeTasks, renderRoleTasks } from './checklist.js';
import { buildFieldSummary } from './aiPlanner.js';
import { buildTbmText } from './tbmGenerator.js';
import { copyText } from '../export/clipboard.js';
import { printPage } from '../export/pdf.js';
import { downloadCsv, buildGuideCsvRows } from '../export/excel.js';
import { renderDailyReport, getDailyReportText } from './dailyReport.js';

let selectedRoles = new Set(JSON.parse(localStorage.getItem('selectedRoles') || '[]'));
let currentTrades = [];
let latestSummary = null;
let latestRain = [];
let latestSafety = [];

export function initFieldGuide() {
  renderRoles();
  const selector = initWorkSelector((trades) => {
    currentTrades = trades;
    updateFieldGuide(latestRain, latestSafety);
  });
  currentTrades = selector?.getSelected?.() || [];

  document.getElementById('copyGuideBtn')?.addEventListener('click', async () => {
    await copyText(buildCopyText());
    alert('오늘의 현장 가이드를 복사했습니다.');
  });
  document.getElementById('printGuideBtn')?.addEventListener('click', () => printPage());
  document.getElementById('exportGuideCsvBtn')?.addEventListener('click', () => {
    downloadCsv('guis-arc-field-guide.csv', buildGuideCsvRows(latestSummary, [...selectedRoles], currentTrades));
  });
}

export function updateFieldGuide(rainRows = [], safetyRows = []) {
  latestRain = rainRows;
  latestSafety = safetyRows;
  latestSummary = buildFieldSummary(rainRows, safetyRows, currentTrades);

  renderRiskSummary(latestSummary);
  renderAiDecision(latestSummary);
  renderDiseaseBriefing(latestSummary);
  renderRoleTasks(tasksForRoles([...selectedRoles], latestSummary));
  renderTradeTasks(currentTrades, [...selectedRoles]);
  renderDailyReport(latestSummary, [...selectedRoles], currentTrades);

  const tbm = document.getElementById('tbmText');
  if (tbm) tbm.value = buildTbmText(latestSummary, currentTrades);
}

function renderRoles() {
  const box = document.getElementById('roleSelector');
  if (!box) return;
  box.innerHTML = ROLES.map((r) => `<button type="button" class="chip ${selectedRoles.has(r) ? 'active' : ''}" data-role="${r}">${r}</button>`).join('');
  box.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
    const r = btn.dataset.role;
    selectedRoles.has(r) ? selectedRoles.delete(r) : selectedRoles.add(r);
    localStorage.setItem('selectedRoles', JSON.stringify([...selectedRoles]));
    renderRoles();
    updateFieldGuide(latestRain, latestSafety);
  }));
}

function riskIcon(code) {
  if (['danger', 'extreme', 'stop'].includes(code)) return '🔴';
  if (['high', 'caution'].includes(code)) return '🟠';
  if (['watch'].includes(code)) return '🟡';
  return '🟢';
}

function renderRiskSummary(s) {
  const el = document.getElementById('fieldRiskSummary');
  if (!el) return;
  el.innerHTML = `
    <div class="guide-item"><b>오늘 집중관리</b><p>${riskIcon(s.heatRule?.code)} ${s.heatText}</p><small>${s.maxHeatText}</small></div>
    <div class="guide-item"><b>강수</b><p>${riskIcon(s.rainRule?.code)} ${s.rainText}</p><small>최대 ${s.maxRain.toFixed(1)}mm/hr · ${s.maxRainHour}</small></div>
    <div class="guide-item"><b>풍속</b><p>${riskIcon(s.windRule?.code)} ${s.windText}</p><small>최대 ${s.maxWind.toFixed(1)}m/s · ${s.maxWindHour}</small></div>
    <div class="guide-item wide"><b>관리자 주의요망</b><p>${s.advice.slice(0, 8).join('<br>')}</p></div>`;
}

function renderAiDecision(s) {
  const el = document.getElementById('aiDecisionPanel');
  if (!el) return;
  const timeCards = (s.timeAdvice || []).map((item) => `
    <article class="ai-card ${item.level}">
      <strong>${item.title}</strong>
      <p>${item.text}</p>
    </article>`).join('');
  const tomorrow = (s.tomorrowPrep || []).map((text) => `<li>${text}</li>`).join('');
  const tradeRisks = (s.tradeRiskCards || []).map((t) => `
    <tr>
      <td>${t.name}</td>
      <td><b>${t.stars}</b><br><small>${t.label}</small></td>
      <td>${t.reasons.join('<br>')}</td>
    </tr>`).join('');

  el.innerHTML = `
    <div class="ai-card-grid">${timeCards}</div>
    <div class="ai-section"><h4>명일 날씨 대비</h4><ul>${tomorrow}</ul></div>
    <div class="ai-section"><h4>선택 공종별 위험도</h4>
      ${tradeRisks ? `<div class="table-wrap compact"><table><thead><tr><th>공종</th><th>위험</th><th>조언</th></tr></thead><tbody>${tradeRisks}</tbody></table></div>` : '<p class="muted">공종을 선택하면 공종별 위험도와 조언이 표시됩니다.</p>'}
    </div>`;
}

function renderDiseaseBriefing(s) {
  const el = document.getElementById('diseaseBriefing');
  if (!el) return;
  const guides = s.diseaseGuides || [];
  if (!guides.length) {
    el.innerHTML = '<p class="muted">현재 위험도에서는 특별 응급처치 카드가 필요하지 않습니다.</p>';
    return;
  }
  el.innerHTML = guides.map((g) => `
    <article class="disease-card">
      <h4>${g.name}</h4>
      <div><b>예상 증상</b><ul>${g.symptoms.map((v) => `<li>${v}</li>`).join('')}</ul></div>
      <div><b>응급조치</b><ul>${g.firstAid.map((v) => `<li>${v}</li>`).join('')}</ul></div>
    </article>`).join('');
}

function buildCopyText() {
  const lines = [];
  lines.push('[GUI\'s Arc 오늘의 현장 가이드]');
  lines.push('');
  if (latestSummary) {
    lines.push(`오늘 집중관리: ${latestSummary.heatText} / ${latestSummary.maxHeatText}`);
    lines.push(`강수: ${latestSummary.rainText}`);
    lines.push(`풍속: ${latestSummary.windText}`);
    lines.push('');
    lines.push('AI 작업판단');
    latestSummary.timeAdvice?.forEach((item) => lines.push(`- ${item.title}: ${item.text}`));
    lines.push('');
    lines.push('중점 조치');
    latestSummary.advice?.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
  }
  const report = getDailyReportText(latestSummary, [...selectedRoles], currentTrades);
  if (report) {
    lines.push('');
    lines.push(report);
  }
  const tbm = document.getElementById('tbmText')?.value;
  if (tbm) {
    lines.push('');
    lines.push(tbm);
  }
  return lines.join('\n');
}
