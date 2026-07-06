export const WEATHER_RULES = {
  rain: [
    { min: 0, max: 0, code:'ok', label:'강수 없음', actions:[] },
    { min: 0.1, max: 1, code:'watch', label:'약한 비', actions:['외부 마감·방수 작업 전 표면 상태 확인','자재 덮개 준비'] },
    { min: 1.1, max: 3, code:'caution', label:'강수 주의', actions:['콘크리트 타설 전 감리·품질 승인 조건 재확인','배수로·집수정 확인','보양재 선배치'] },
    { min: 3.1, max: 999, code:'stop', label:'타설 중지 검토', actions:['콘크리트 타설 원칙적 중지 검토','방수·도장·미장 등 표면 품질 민감 공종 조정','토공 비탈면·배수 점검'] }
  ],
  heat: [
    { min: -99, max: 27.9, code:'normal', label:'일반', actions:['기본 수분 섭취 유지'] },
    { min: 28, max: 30.9, code:'watch', label:'관심', actions:['냉수 비치','작업 전 컨디션 확인'] },
    { min: 31, max: 32.9, code:'caution', label:'주의', actions:['1시간마다 휴식','식염포도당 또는 전해질 음료 준비'] },
    { min: 33, max: 34.9, code:'high', label:'경계', actions:['50분 작업/10분 휴식','체온 확인','관리감독자 순회 강화'] },
    { min: 35, max: 36.9, code:'danger', label:'위험', actions:['40분 작업/20분 휴식','옥외 고강도 작업 단축','단독작업 금지'] },
    { min: 37, max: 99, code:'extreme', label:'매우위험', actions:['작업 중지 검토','열사병 응급대응 준비','2인1조 확인'] }
  ],
  wind: [
    { min: 0, max: 4.9, code:'normal', label:'일반', actions:[] },
    { min: 5, max: 7.9, code:'watch', label:'풍속 주의', actions:['양중·고소작업 신호체계 확인','비산물 고정'] },
    { min: 8, max: 9.9, code:'caution', label:'강풍 주의', actions:['크레인·고소작업 작업조건 재검토','가설물·난간·방망 점검'] },
    { min: 10, max: 999, code:'stop', label:'강풍 위험', actions:['양중·고소작업 중지 검토','외부 작업 전면 재검토'] }
  ]
};

export function matchRule(type, value) {
  const rules = WEATHER_RULES[type] || [];
  return rules.find(r => value >= r.min && value <= r.max) || rules[0];
}
