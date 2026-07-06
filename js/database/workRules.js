export const WORK_WEATHER_RULES = [
  { keywords:['콘크리트','타설'], when:'rain', min:1, advice:['강수 시간대 타설 자제 검토','보양재·비닐·천막 선배치','공시체 추가 제작 및 감리 승인 조건 확인','타설 후 표면 우수 유입 방지'] },
  { keywords:['방수','도장','미장','면갈이','견출'], when:'rain', min:0.1, advice:['바탕면 함수율·표면건조 상태 확인','강수 전후 작업시간 조정','습도 상승 시 양생·건조시간 재검토'] },
  { keywords:['양중','크레인','고소','철골'], when:'wind', min:8, advice:['풍속 확인 후 작업허가 여부 재검토','신호수 배치 및 줄걸이 점검','돌풍 시 중지 기준 공유'] },
  { keywords:['굴착','토공','되메우기','덤프'], when:'rain', min:1, advice:['비탈면·흙막이·배수로 점검','덤프 운반로 미끄럼 관리','집수정·펌프 가동상태 확인'] },
  { keywords:['철근','거푸집','동바리'], when:'heat', min:33, advice:['옥외 고강도 작업 시간 조정','작업발판·철근 상부 고온 접촉 주의','휴식·수분관리 강화'] },
  { keywords:['견출','면갈이','절단','그라인더'], when:'dust', min:0, advice:['분진마스크·보안경 착용','집진기 또는 습식작업 검토','주변 작업자 접근통제 및 환기'] }
];

export function adviceForTradeWeather(tradeName, summary) {
  const name = String(tradeName || '');
  const result = [];
  WORK_WEATHER_RULES.forEach(rule => {
    const hit = rule.keywords.some(k => name.includes(k));
    if (!hit) return;
    if (rule.when === 'rain' && (summary.maxRain || 0) >= rule.min) result.push(...rule.advice);
    if (rule.when === 'wind' && (summary.maxWind || 0) >= rule.min) result.push(...rule.advice);
    if (rule.when === 'heat' && (summary.maxApparent || 0) >= rule.min) result.push(...rule.advice);
    if (rule.when === 'dust') result.push(...rule.advice);
  });
  return [...new Set(result)];
}
