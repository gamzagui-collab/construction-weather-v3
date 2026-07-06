function todayText(summary) {
  return summary?.today || new Date().toISOString().slice(0, 10);
}

function list(items = []) {
  if (!items.length) return '<li>특이사항 없음</li>';
  return items.map((item) => `<li>${item}</li>`).join('');
}

function selectedTradeNames(trades = []) {
  return trades.map((trade) => typeof trade === 'string' ? trade : (trade?.name || trade?.trade || '')).filter(Boolean);
}

function weatherRows(summary) {
  if (!summary) return '<tr><td colspan="2">예보 조회 후 표시됩니다.</td></tr>';
  return `
    <tr><th>체감온도</th><td>최고 ${summary.maxApparent?.toFixed ? summary.maxApparent.toFixed(1) : '-'}℃ · ${summary.maxHeatHour || '-'}</td></tr>
    <tr><th>강수</th><td>최대 ${summary.maxRain?.toFixed ? summary.maxRain.toFixed(1) : '0.0'} mm/hr · ${summary.maxRainHour || '-'}</td></tr>
    <tr><th>풍속</th><td>최대 ${summary.maxWind?.toFixed ? summary.maxWind.toFixed(1) : '0.0'} m/s · ${summary.maxWindHour || '-'}</td></tr>
    <tr><th>중점관리</th><td>${summary.heatText || '-'} / ${summary.rainText || '-'} / ${summary.windText || '-'}</td></tr>
  `;
}

function buildReportText(summary, roles = [], trades = []) {
  const names = selectedTradeNames(trades);
  const lines = [];
  lines.push('[GUI\'s Arc 오늘 작업일보]');
  lines.push(`날짜: ${todayText(summary)}`);
  lines.push(`역할: ${roles.length ? roles.join(', ') : '미선택'}`);
  lines.push(`공종: ${names.length ? names.join(', ') : '미선택'}`);
  lines.push('');
  lines.push('기상 및 현장 위험');
  lines.push(`- 체감온도: 최고 ${summary?.maxApparent?.toFixed ? summary.maxApparent.toFixed(1) : '-'}℃ / ${summary?.maxHeatHour || '-'}`);
  lines.push(`- 강수: 최대 ${summary?.maxRain?.toFixed ? summary.maxRain.toFixed(1) : '0.0'}mm/hr / ${summary?.maxRainHour || '-'}`);
  lines.push(`- 풍속: 최대 ${summary?.maxWind?.toFixed ? summary.maxWind.toFixed(1) : '0.0'}m/s / ${summary?.maxWindHour || '-'}`);
  lines.push('');
  lines.push('오늘 중점 조치');
  (summary?.advice || ['예보 조회 및 공종 선택 후 자동 생성됩니다.']).slice(0, 12).forEach((item, idx) => lines.push(`${idx + 1}. ${item}`));
  lines.push('');
  lines.push('명일 대비');
  (summary?.tomorrowPrep || ['명일 기상 대비 사항 없음']).forEach((item, idx) => lines.push(`${idx + 1}. ${item}`));
  return lines.join('\n');
}

export function renderDailyReport(summary, roles = [], trades = []) {
  const el = document.getElementById('dailyReportPanel');
  if (!el) return;
  const names = selectedTradeNames(trades);
  el.innerHTML = `
    <div class="report-grid">
      <section class="report-card"><b>작업일</b><strong>${todayText(summary)}</strong></section>
      <section class="report-card"><b>선택 역할</b><strong>${roles.length ? roles.join(' · ') : '미선택'}</strong></section>
      <section class="report-card wide"><b>선택 공종</b><strong>${names.length ? names.join(' · ') : '공종을 선택하세요'}</strong></section>
    </div>
    <div class="table-wrap compact">
      <table class="report-table"><tbody>${weatherRows(summary)}</tbody></table>
    </div>
    <div class="report-section"><h4>오늘 중점 조치</h4><ul>${list((summary?.advice || []).slice(0, 12))}</ul></div>
    <div class="report-section"><h4>명일 대비</h4><ul>${list(summary?.tomorrowPrep || [])}</ul></div>
  `;
}

export function getDailyReportText(summary, roles = [], trades = []) {
  return buildReportText(summary, roles, trades);
}
