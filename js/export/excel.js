export function downloadCsv(filename, rows) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function buildGuideCsvRows(summary = {}, roles = [], trades = []) {
  const rows = [
    ['구분', '항목', '내용'],
    ['역할', '선택 역할', roles.join(' / ')],
    ['공종', '선택 공종', trades.join(' / ')],
    ['위험요약', '체감온도', `${summary.heatText || ''} ${summary.maxHeatText || ''}`],
    ['위험요약', '강수', summary.rainText || ''],
    ['위험요약', '풍속', summary.windText || '']
  ];

  (summary.timeAdvice || []).forEach((item) => rows.push(['AI 작업판단', item.title, item.text]));
  (summary.tomorrowPrep || []).forEach((text) => rows.push(['명일 대비', '준비사항', text]));
  (summary.advice || []).forEach((text, index) => rows.push(['중점 조치', index + 1, text]));
  (summary.tradeRiskCards || []).forEach((trade) => rows.push(['공종 위험도', `${trade.name} / ${trade.label}`, trade.reasons.join(' / ')]));
  (summary.diseaseGuides || []).forEach((disease) => {
    rows.push(['건설안전 브리핑', disease.name, `증상: ${disease.symptoms.join(' / ')}`]);
    rows.push(['응급조치', disease.name, disease.firstAid.join(' / ')]);
  });
  return rows;
}
