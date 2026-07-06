function formatRain(value){
  if(typeof value==="object"&&value!==null&&value.type==="probability") return `<span class="probability-value">${value.value}%<small>중기 · ${value.region}</small></span>`;
  if(typeof value!=="number"||Number.isNaN(value)) return `<span class="no-data">정보없음</span>`;
  return `${value.toFixed(1)} mm`;
}
function formatAvg(value){if(typeof value!=="number"||Number.isNaN(value))return `<span class="no-data">-</span>`;return `<strong>${value.toFixed(1)} mm</strong>`;}
function getRainCellClass(value){
  if(typeof value==="object"&&value!==null&&value.type==="probability"){if(value.value<=20)return"prob-lv1";if(value.value<=40)return"prob-lv2";if(value.value<=60)return"prob-lv3";if(value.value<=80)return"prob-lv4";return"prob-lv5";}
  if(typeof value!=="number"||Number.isNaN(value))return"rain-empty";
  if(value===0)return"rain-zero"; if(value<=1)return"rain-lv1"; if(value<=4)return"rain-lv2"; if(value<=7)return"rain-lv3"; if(value<=10)return"rain-lv4"; if(value<=13)return"rain-lv5"; if(value<=16)return"rain-lv6"; return"rain-lv7";
}
function getDateRowSpanMap(rows){const map={};rows.forEach((r)=>map[r.date]=(map[r.date]||0)+1);return map;}
function renderSummary(summary){document.getElementById("rainStart").textContent=summary.rainStart||"-";document.getElementById("rainEnd").textContent=summary.rainEnd||"-";document.getElementById("totalRain").textContent=summary.totalRain||"-";document.getElementById("workableHours").textContent=summary.workableHours||"-";document.getElementById("agreementSummary").textContent=summary.agreementSummary||"-";document.getElementById("recommendationText").textContent=summary.recommendation||"예보 판단 자료가 부족합니다.";}
function renderLocationInfo(location){document.getElementById("currentLocationName").textContent=location?.name||"선택 위치";document.getElementById("currentLocationCoord").textContent=`${Number(location.lat).toFixed(6)}, ${Number(location.lon).toFixed(6)}`;}
function renderTable(rows){const body=document.getElementById("forecastTableBody");body.innerHTML="";const spans=getDateRowSpanMap(rows);const done=new Set();rows.forEach((row)=>{const tr=document.createElement("tr");let dateCell="";if(!done.has(row.date)){dateCell=`<td rowspan="${spans[row.date]}" class="date-cell">${row.date}<br><small>(${row.weekday})</small></td>`;done.add(row.date);}tr.innerHTML=`${dateCell}<td>${row.hour}</td><td class="${getRainCellClass(row.kma)}">${formatRain(row.kma)}</td><td class="${getRainCellClass(row.ecmwf)}">${formatRain(row.ecmwf)}</td><td class="${getRainCellClass(row.gfs)}">${formatRain(row.gfs)}</td><td class="${getRainCellClass(row.jma)}">${formatRain(row.jma)}</td><td class="${getRainCellClass(row.avg)}">${formatAvg(row.avg)}</td><td>
  <span class="risk-badge risk-${row.riskCode}">
    ${row.riskLabel}
  </span>
  <div class="risk-desc">${row.riskDesc || ""}</div>
</td><td><span class="risk-badge agreement-${row.agreementCode}">${row.agreementLabel} ${row.agreementStars}</span></td>`;body.appendChild(tr);});}
let rainChart=null;
function renderChart(rows){
  const ctx=document.getElementById("rainChart");
  const labels=rows.map((r)=>`${r.date} ${r.hour}`);
  const onlyNumber=(v)=>typeof v==="number"&&!Number.isNaN(v)?v:null;
  const data={labels,datasets:[
    {label:"KMA 한국기상청",data:rows.map((r)=>onlyNumber(r.kma)),tension:.35},
    {label:"ECMWF 유럽중기예보센터",data:rows.map((r)=>onlyNumber(r.ecmwf)),tension:.35},
    {label:"GFS 미국 전지구모델",data:rows.map((r)=>onlyNumber(r.gfs)),tension:.35},
    {label:"JMA 일본기상청",data:rows.map((r)=>onlyNumber(r.jma)),tension:.35},
    {label:"평균값",data:rows.map((r)=>onlyNumber(r.avg)),tension:.35,borderWidth:3}
  ]};
  if(rainChart)rainChart.destroy();
  rainChart=new Chart(ctx,{type:"line",data,options:{responsive:true,maintainAspectRatio:false,spanGaps:false,interaction:{mode:"index",intersect:false},plugins:{legend:{position:"top"},tooltip:{callbacks:{label(context){if(context.raw===null)return `${context.dataset.label}: 정보없음`;return `${context.dataset.label}: ${context.raw} mm`;}}}},scales:{x:{ticks:{autoSkip:true,maxTicksLimit:48,maxRotation:60,minRotation:60}},y:{beginAtZero:true,title:{display:true,text:"강수량 (mm)"}}}}});
}
function renderBrandInfo(brand,meta){const footer=document.querySelector(".brand-footer");if(!footer)return;footer.innerHTML=`<strong>${brand?.name||"GAMZAGUI"}</strong><span>${brand?.title||"Construction Weather"}</span><em>${brand?.version||meta?.version||"v3.2.0"} · ${meta?.cached?"Cached":"Live"}</em>`;}
function updateWindyMap(lat,lon){const f=document.getElementById("windyFrame");if(!f)return;f.src=`https://embed.windy.com/embed2.html?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&detailLat=${encodeURIComponent(lat)}&detailLon=${encodeURIComponent(lon)}&width=650&height=500&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=m%2Fs&metricTemp=%C2%B0C&radarRange=-1`;}
function downloadCsv(rows){if(!rows.length){alert("다운로드할 데이터가 없습니다.");return;}const h=["날짜","요일","시간","KMA","ECMWF","GFS","JMA","평균값","위험도","예보일치도"];const cell=(v)=>typeof v==="object"&&v?`${v.value}%(${v.region})`:v??"정보없음";const b=rows.map((r)=>[r.date,r.weekday,r.hour,cell(r.kma),cell(r.ecmwf),cell(r.gfs),cell(r.jma),r.avg??"-",r.riskLabel,`${r.agreementLabel} ${r.agreementStars}`]);const csv=[h,...b].map((line)=>line.join(",")).join("\n");const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="gamzagui_construction_weather_hourly.csv";a.click();URL.revokeObjectURL(url);}
