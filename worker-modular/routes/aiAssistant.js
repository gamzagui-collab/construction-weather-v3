import { jsonResponse } from "../utils/response.js";

export async function handleAiAssistant(request, env, BRAND) {
  const url = new URL(request.url);
  const trades = (url.searchParams.get("trades") || "").split(",").map(x => x.trim()).filter(Boolean);
  const weatherRisk = url.searchParams.get("weatherRisk") || "normal";

  const accidentTop5 = buildAccidentTop5(trades, weatherRisk);
  const qualityTop3 = buildQualityTop3(trades);
  const inspectionTop3 = buildInspectionTop3(trades);

  return jsonResponse(request, {
    ok: true,
    brand: BRAND,
    meta: { generatedAt: new Date().toISOString(), trades, weatherRisk },
    assistant: {
      summary: trades.length ? `선택 공종(${trades.join(", ")}) 기준으로 사고위험, 품질문제, 감리지적 가능성을 확인하세요.` : "공종을 선택하면 AI 현장비서 판단이 표시됩니다.",
      accidentTop5,
      qualityTop3,
      inspectionTop3,
      tbm: buildTbm(accidentTop5, qualityTop3, inspectionTop3)
    }
  });
}

function buildAccidentTop5(trades, weatherRisk) {
  const text = trades.join(" ");
  const list = [];
  if (/철근|거푸집|비계|철골/.test(text)) list.push("추락: 작업발판·개구부·안전대 체결 확인");
  if (/크레인|양중|철골|자재/.test(text)) list.push("낙하·맞음: 인양물 하부 출입금지와 줄걸이 점검");
  if (/굴착|토공|흙막이/.test(text)) list.push("붕괴: 굴착면·흙막이·우수 유입 확인");
  if (/지게차|하역|덤프|굴착기/.test(text)) list.push("끼임·협착: 장비 작업반경 출입통제와 신호수 배치");
  if (/방수|도장|용접/.test(text)) list.push("화재·중독: 환기, MSDS, 화기작업 허가 확인");
  if (weatherRisk !== "normal") list.push("기상위험: 강수·강풍·폭염 시간대 작업 조정");
  return [...new Set(list.length ? list : ["공통: 작업 전 위험성평가와 TBM 실시"])].slice(0, 5);
}

function buildQualityTop3(trades) {
  const text = trades.join(" ");
  const list = [];
  if (/콘크리트|타설|레미콘/.test(text)) list.push("콘크리트 품질: 슬럼프·공기량·공시체·강우 보양 확인");
  if (/철근/.test(text)) list.push("철근 품질: 피복두께·정착길이·이음길이·간격 확인");
  if (/방수/.test(text)) list.push("방수 품질: 바탕면 건조·습도·로트·두께 확인");
  if (/도장/.test(text)) list.push("도장 품질: 습도·표면처리·도막두께 확인");
  if (/철골/.test(text)) list.push("철골 품질: 부재번호·볼트·용접부·도장손상 확인");
  return [...new Set(list.length ? list : ["선택 공종의 시방서·검측·사진기록 확인"])].slice(0, 3);
}

function buildInspectionTop3(trades) {
  const text = trades.join(" ");
  const list = ["검측 전 후속공정 진행 금지", "시공 전·중·후 사진 누락 방지"];
  if (/콘크리트|타설/.test(text)) list.push("강우 시 감리 승인·보양계획·추가 공시체 기록");
  if (/철근/.test(text)) list.push("철근 배근 검측 전 타설 금지");
  if (/방수/.test(text)) list.push("방수 바탕면 건조 확인 및 담수시험 기록");
  return [...new Set(list)].slice(0, 3);
}

function buildTbm(accidentTop5, qualityTop3, inspectionTop3) {
  return [
    "📋 AI 현장비서 TBM", "",
    "사고위험 TOP", ...accidentTop5.map(x => `□ ${x}`), "",
    "품질 중점관리", ...qualityTop3.map(x => `□ ${x}`), "",
    "감리지적 예방", ...inspectionTop3.map(x => `□ ${x}`)
  ].join("\n");
}
