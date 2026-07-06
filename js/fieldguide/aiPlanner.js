import { matchRule } from '../database/weatherRules.js';
import { adviceForTradeWeather } from '../database/workRules.js';
import { diseaseGuidesForSafety } from '../database/diseases.js';

function hourNumber(row) {
  return Number.parseInt(String(row?.hour || '0').slice(0, 2), 10);
}

function inWorkHours(row) {
  const h = hourNumber(row);
  return h >= 7 && h <= 17;
}

function sameDate(row, date) {
  return !date || row?.date === date;
}

function firstDate(rows = []) {
  return rows.find((row) => row?.date)?.date || '';
}

function maxBy(rows, key) {
  if (!rows.length) return {};
  return rows.reduce((a, b) => ((Number(b?.[key]) || -999) > (Number(a?.[key]) || -999) ? b : a), rows[0]);
}

function maxRainValue(row) {
  return Number(row?.avg ?? row?.kma ?? row?.ecmwf ?? row?.gfs ?? row?.jma ?? 0) || 0;
}

function riskRange(rows, predicate) {
  const hit = rows.filter(predicate);
  if (!hit.length) return null;
  return {
    start: hit[0].hour,
    end: hit[hit.length - 1].hour,
    count: hit.length
  };
}

function stars(level) {
  return '★★★★★'.slice(0, level) + '☆☆☆☆☆'.slice(level);
}

function tradeNames(trades = []) {
  return trades.map((t) => typeof t === 'string' ? t : (t?.name || t?.trade || String(t))).filter(Boolean);
}

function includesAny(name, words) {
  return words.some((word) => String(name || '').includes(word));
}

function buildTradeRiskCards(names, summary) {
  return names.map((name) => {
    let score = 1;
    const reasons = [];

    if (summary.maxRain >= 3 && includesAny(name, ['콘크리트', '타설', '방수', '미장', '도장', '면갈이', '견출'])) {
      score = Math.max(score, 5);
      reasons.push('강수 영향이 커 작업 중지·승인조건 재검토 필요');
    } else if (summary.maxRain >= 1 && includesAny(name, ['콘크리트', '타설', '방수', '미장', '도장'])) {
      score = Math.max(score, 4);
      reasons.push('강수 대비 보양·배수·표면상태 확인 필요');
    }

    if (summary.maxWind >= 8 && includesAny(name, ['크레인', '양중', '고소', '철골', '파일', '천공'])) {
      score = Math.max(score, 5);
      reasons.push('풍속 영향으로 장비·고소작업 조건 재검토 필요');
    } else if (summary.maxWind >= 5 && includesAny(name, ['크레인', '양중', '고소', '철골'])) {
      score = Math.max(score, 4);
      reasons.push('줄걸이·신호수·비산물 고정 확인 필요');
    }

    if (summary.maxApparent >= 33 && includesAny(name, ['철근', '거푸집', '동바리', '토공', '굴착', '포장', '외부', '파일'])) {
      score = Math.max(score, 4);
      reasons.push('폭염 시간대 옥외 고강도 작업 조정 필요');
    }

    if (includesAny(name, ['면갈이', '견출', '절단', '그라인더', '석재', '타일'])) {
      score = Math.max(score, 3);
      reasons.push('분진·비산물 관리, 보안경·방진마스크 확인 필요');
    }

    if (!reasons.length) reasons.push('기본 TBM, 작업 전 점검, 작업구역 정리 유지');

    const label = score >= 5 ? '매우 높음' : score >= 4 ? '높음' : score >= 3 ? '주의' : '보통';
    return { name, score, label, stars: stars(score), reasons };
  });
}

function buildTimeAdvice(todaySafety, todayRain, summary) {
  const items = [];
  const heatRange = riskRange(todaySafety, (r) => (Number(r.apparentTemperature) || 0) >= 31);
  const highHeatRange = riskRange(todaySafety, (r) => (Number(r.apparentTemperature) || 0) >= 35);
  const rainRange = riskRange(todayRain, (r) => maxRainValue(r) >= 1);
  const windRange = riskRange(todaySafety, (r) => (Number(r.windSpeed) || 0) >= 8);

  if (highHeatRange) {
    items.push({ level: 'danger', title: `${highHeatRange.start}~${highHeatRange.end} 작업시간 단축 검토`, text: '체감온도 위험 구간입니다. 옥외 고강도 작업을 오전으로 당기고, 순회·체온관리·휴식계획을 강화하세요.' });
  } else if (heatRange) {
    items.push({ level: 'caution', title: `${heatRange.start}~${heatRange.end} 폭염 주의`, text: '수분섭취, 식염포도당, 그늘휴식, 관리감독자 순회 시간을 사전에 지정하세요.' });
  }

  if (rainRange) {
    items.push({ level: 'rain', title: `${rainRange.start}~${rainRange.end} 강수 대비`, text: '자재 덮개, 배수로, 집수정, 보양재를 미리 확인하세요. 콘크리트·방수·도장 공정은 착수 전 승인조건을 재확인하세요.' });
  }

  if (windRange) {
    items.push({ level: 'wind', title: `${windRange.start}~${windRange.end} 풍속 관리`, text: '크레인·양중·고소작업은 풍속 기준, 신호수, 줄걸이, 비산물 고정 상태를 재점검하세요.' });
  }

  if (!items.length) {
    items.push({ level: 'normal', title: '07~17시 기본 작업 가능', text: '큰 기상 위험은 낮습니다. 다만 TBM, 작업 전 점검, 휴식·수분섭취 관리는 유지하세요.' });
  }

  const bestMorning = todaySafety.filter((r) => hourNumber(r) >= 7 && hourNumber(r) <= 10);
  const best = bestMorning.length ? '07:00~10:00' : '오전 시간대';
  items.unshift({ level: 'best', title: `추천 우선작업 시간 ${best}`, text: '온도·습도·풍속이 상대적으로 낮은 시간대에 외부 고강도 작업과 품질 민감 작업을 우선 배치하는 것이 좋습니다.' });

  return items;
}

function buildTomorrowPrep(rainRows, safetyRows) {
  const dates = [...new Set([...rainRows, ...safetyRows].map((r) => r.date).filter(Boolean))];
  const tomorrow = dates[1];
  if (!tomorrow) return [];

  const tomorrowRain = rainRows.filter((r) => r.date === tomorrow && inWorkHours(r));
  const tomorrowSafety = safetyRows.filter((r) => r.date === tomorrow && inWorkHours(r));
  const maxRain = Math.max(0, ...tomorrowRain.map(maxRainValue));
  const maxHeat = Math.max(0, ...tomorrowSafety.map((r) => Number(r.apparentTemperature) || 0));
  const maxWind = Math.max(0, ...tomorrowSafety.map((r) => Number(r.windSpeed) || 0));

  const prep = [];
  if (maxRain >= 1) prep.push(`명일 강수 가능성 있음: 금일 퇴근 전 자재 덮개, 배수로, 집수정, 보양재를 확인하세요. 최대 ${maxRain.toFixed(1)}mm/hr.`);
  if (maxHeat >= 31) prep.push(`명일 폭염 대비: 냉수·전해질·그늘휴식 공간과 순회계획을 금일 중 준비하세요. 최고 체감 ${maxHeat.toFixed(1)}℃.`);
  if (maxWind >= 5) prep.push(`명일 풍속 관리: 가설물, 적치물, 양중계획을 사전 점검하세요. 최대 ${maxWind.toFixed(1)}m/s.`);
  if (!prep.length) prep.push('명일 큰 기상 위험은 낮으나 기본 작업 전 점검과 자재 정리는 유지하세요.');
  return prep;
}

export function buildFieldSummary(rainRows = [], safetyRows = [], selectedTrades = []) {
  const today = firstDate(safetyRows) || firstDate(rainRows);
  const workSafety = safetyRows.filter((r) => sameDate(r, today) && inWorkHours(r));
  const workRain = rainRows.filter((r) => sameDate(r, today) && inWorkHours(r));
  const maxHeatRow = maxBy(workSafety, 'apparentTemperature');
  const maxWindRow = maxBy(workSafety, 'windSpeed');
  const maxRainRow = workRain.reduce((a, b) => (maxRainValue(b) > maxRainValue(a) ? b : a), workRain[0] || {});

  const maxApparent = Number(maxHeatRow?.apparentTemperature) || 0;
  const maxWind = Number(maxWindRow?.windSpeed) || 0;
  const maxRain = maxRainValue(maxRainRow);
  const heatRule = matchRule('heat', maxApparent);
  const windRule = matchRule('wind', maxWind);
  const rainRule = matchRule('rain', maxRain);

  const heatRiskRows = workSafety.filter((r) => (Number(r.apparentTemperature) || 0) >= 31);
  const rainRiskRows = workRain.filter((r) => maxRainValue(r) >= 1);
  const windRiskRows = workSafety.filter((r) => (Number(r.windSpeed) || 0) >= 5);

  const names = tradeNames(selectedTrades);
  const tradeAdvice = names.flatMap((t) => adviceForTradeWeather(t, { maxApparent, maxWind, maxRain }).map((a) => `${t}: ${a}`));
  const advice = [
    ...heatRule.actions,
    ...rainRule.actions,
    ...windRule.actions,
    ...tradeAdvice
  ];
  if (!advice.length) advice.push('07~17시 작업시간 기준 큰 기상 위험은 낮지만 TBM과 기본 순회점검을 유지하세요.');

  const tradeRiskCards = buildTradeRiskCards(names, { maxApparent, maxWind, maxRain });
  const timeAdvice = buildTimeAdvice(workSafety, workRain, { maxApparent, maxWind, maxRain });
  const tomorrowPrep = buildTomorrowPrep(rainRows, safetyRows);
  const diseaseGuides = diseaseGuidesForSafety(heatRule.code).slice(0, maxApparent >= 37 ? 3 : 2);

  return {
    today,
    maxApparent,
    maxWind,
    maxRain,
    maxHeatHour: maxHeatRow?.hour || '-',
    maxWindHour: maxWindRow?.hour || '-',
    maxRainHour: maxRainRow?.hour || '-',
    heatRule,
    rainRule,
    windRule,
    heatRisk: heatRule.code !== 'normal',
    rainRisk: rainRule.code !== 'ok',
    windRisk: windRule.code !== 'normal',
    heatText: heatRiskRows.length ? `${heatRiskRows[0].hour}~${heatRiskRows.at(-1).hour} ${heatRule.label}` : '폭염 위험 낮음',
    maxHeatText: maxHeatRow?.hour ? `${maxHeatRow.hour} 체감 ${maxApparent.toFixed(1)}℃` : '-',
    rainText: rainRiskRows.length ? `${rainRiskRows[0].hour}~${rainRiskRows.at(-1).hour} ${rainRule.label} / 최대 ${maxRain.toFixed(1)}mm/hr` : '강수 위험 낮음',
    windText: windRiskRows.length ? `${windRiskRows[0].hour}~${windRiskRows.at(-1).hour} ${windRule.label} / 최대 ${maxWind.toFixed(1)}m/s` : '풍속 위험 낮음',
    advice: [...new Set(advice)].slice(0, 36),
    timeAdvice,
    tomorrowPrep,
    tradeRiskCards,
    diseaseGuides,
    selectedTrades: names
  };
}
