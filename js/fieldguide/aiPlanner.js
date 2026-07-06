export function buildFieldSummary(rainRows=[], safetyRows=[]){
 const workSafety=safetyRows.filter(r=>{const h=parseInt(r.hour);return h>=7&&h<=17});
 const maxHeat=workSafety.reduce((a,b)=>(b.apparentTemperature??-99)>(a.apparentTemperature??-99)?b:a,{});
 const highHeat=workSafety.filter(r=>(r.apparentTemperature??0)>=33);
 const rainRisk=rainRows.filter(r=>{const h=parseInt(r.hour);return h>=7&&h<=17 && (r.avg??0)>1});
 return {heatText: highHeat.length?`${highHeat[0].hour}~${highHeat.at(-1).hour} 집중관리`:`폭염 위험 낮음`, maxHeatText:maxHeat?.hour?`${maxHeat.hour} 체감 ${maxHeat.apparentTemperature?.toFixed(1)}℃`:`-`, rainText: rainRisk.length?`${rainRisk[0].hour} 이후 강수 주의`:`강수 위험 낮음`, windText:"풍속 데이터 확인", advice: buildAdvice(rainRisk, highHeat)};
}
function buildAdvice(rainRisk, highHeat){ const a=[]; if(highHeat.length)a.push("체감온도 상승 시간대에는 옥외 고강도 작업을 조정하고 휴식·수분관리를 강화하세요."); if(rainRisk.length)a.push("강수가 예상되므로 자재 덮기, 배수로 확인, 타설·방수 작업 일정을 재검토하세요."); if(!a.length)a.push("07~17시 기준 큰 기상 위험은 낮지만 현장 순회와 기본 안전관리를 유지하세요."); return a; }
