import { TBM_TEMPLATES } from '../database/tbmTemplates.js';

export function buildTbmText(summary = {}, trades = []) {
  const lines = [];
  lines.push('오늘 TBM 전달사항');
  lines.push('');
  lines.push(TBM_TEMPLATES.base);
  lines.push('');

  lines.push('1. 오늘 기상 중점');
  if (summary.heatRisk) lines.push(`- 체감온도: ${summary.heatText}, ${summary.maxHeatText}. ${TBM_TEMPLATES.heat}`);
  if (summary.rainRisk) lines.push(`- 강수: ${summary.rainText}. ${TBM_TEMPLATES.rain}`);
  if (summary.windRisk) lines.push(`- 풍속: ${summary.windText}. ${TBM_TEMPLATES.wind}`);
  if (!summary.heatRisk && !summary.rainRisk && !summary.windRisk) lines.push('- 07~17시 기준 큰 기상 위험은 낮으나 기본 안전수칙과 작업 전 점검을 유지합니다.');

  lines.push('');
  lines.push('2. 시간대별 작업판단');
  (summary.timeAdvice || []).slice(0, 5).forEach((item) => lines.push(`- ${item.title}: ${item.text}`));

  if (trades.length) {
    lines.push('');
    lines.push(`3. 오늘 선택 공종: ${trades.join(', ')}`);
    (summary.tradeRiskCards || []).slice(0, 8).forEach((trade) => {
      lines.push(`- ${trade.name}(${trade.label}): ${trade.reasons[0]}`);
    });
  }

  if (summary.tomorrowPrep?.length) {
    lines.push('');
    lines.push('4. 명일 대비');
    summary.tomorrowPrep.slice(0, 4).forEach((text) => lines.push(`- ${text}`));
  }

  if (summary.advice?.length) {
    lines.push('');
    lines.push('5. 중점 조치');
    summary.advice.slice(0, 10).forEach((a, i) => lines.push(`${i + 1}. ${a}`));
  }

  return lines.join('\n');
}
