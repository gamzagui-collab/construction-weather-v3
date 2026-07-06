import { safetyLevel, humidityFeel } from "../weather/temperature.js";
export function buildHealthRisk(row){
  if(!row) return {title:"자료 없음",body:"예보 조회 후 표시됩니다.",symptoms:[]};
  const lv=safetyLevel(row); const h=humidityFeel(row.humidity);
  return {title:lv.label, stars:"★".repeat(lv.score)+"☆".repeat(5-lv.score), body:`체감상황: ${h}. 체감온도 ${fmt(row.apparentTemperature)}℃ 기준 ${lv.comment}가 필요합니다.`, symptoms: lv.score>=4?["땀이 잘 마르지 않음","탈수","근육경련","두통","어지럼증","집중력 저하"]:["수분 부족","피로 누적","집중력 저하"]};
}
function fmt(v){return typeof v==="number"?v.toFixed(1):"-"}
