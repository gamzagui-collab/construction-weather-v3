function formatRain(value) {
  if (typeof value === "object" && value !== null && value.type === "probability") {
    return `<span class="probability-value">${value.value}%<small>중기 · ${value.region}</small></span>`;
  }
  if (typeof value !== "number" || Number.isNaN(value)) return `<span class="no-data">정보없음</span>`;
  return `${value.toFixed(1)} mm`;
}

function formatAvg(value) {
  return (typeof value === "number" && !Number.isNaN(value))
    ? `<strong>${value.toFixed(1)} mm</strong>`
    : `<span class="no-data">-</span>`;
}

function getRainCellClass(value) {
  if (typeof value === "object" && value !== null && value.type === "probability") {
    if (value.value <= 20) return "prob-lv1";
    if (value.value <= 40) return "prob-lv2";
    if (value.value <= 60) return "prob-lv3";
    if (value.value <= 80) return "prob-lv4";
    return "prob-lv5";
  }
  if (typeof value !== "number" || Number.isNaN(value)) return "rain-empty";
  if (value === 0) return "rain-zero";
  if (value <= 1) return "rain-lv1";
  if (value <= 2) return "rain-lv2";
  if (value <= 3) return "rain-lv3";
  if (value <= 5) return "rain-lv4";
  if (value <= 10) return "rain-lv6";
  return "rain-lv7";
}


function formatShortDate(dateText) {
  if (!dateText || !dateText.includes("-")) return dateText || "-";
  const [yyyy, mm, dd] = dateText.split("-");
  return `${mm}/${dd}`;
}

function formatDayLabel(row) {
  return `${formatShortDate(row.date)} (${row.weekday})`;
}

function renderSummary(summary) {
  document.getElementById("rainStart").textContent = summary.rainStart || "-";
  document.getElementById("rainEnd").textContent = summary.rainEnd || "-";
  document.getElementById("totalRain").textContent = summary.totalRain || "-";
  document.getElementById("workableHours").textContent = summary.workableHours || "-";
  document.getElementById("agreementSummary").textContent = summary.agreementSummary || "-";
  document.getElementById("recommendationText").textContent = summary.recommendation || "예보 판단 자료가 부족합니다.";
}

function renderLocationInfo(location) {
  document.getElementById("currentLocationName").textContent = location?.name || "선택 위치";
  document.getElementById("currentLocationCoord").textContent = `${Number(location.lat).toFixed(6)}, ${Number(location.lon).toFixed(6)}`;
}

function renderTable(rows) {
  const tableBody = document.getElementById("forecastTableBody");
  tableBody.innerHTML = "";

  const displayRows = (rows || []).slice(0, 24 * 6);
  let prevDate = "";

  displayRows.forEach((row) => {
    if (row.date !== prevDate) {
      const groupTr = document.createElement("tr");
      groupTr.className = "day-group-row";
      groupTr.innerHTML = `<td colspan="9"><span>${formatDayLabel(row)}</span></td>`;
      tableBody.appendChild(groupTr);
      prevDate = row.date;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="date-cell day-empty"></td>
      <td class="time-cell">${row.hour}</td>
      <td class="model-cell ${getRainCellClass(row.kma)}">${formatRain(row.kma)}</td>
      <td class="model-cell ${getRainCellClass(row.ecmwf)}">${formatRain(row.ecmwf)}</td>
      <td class="model-cell ${getRainCellClass(row.gfs)}">${formatRain(row.gfs)}</td>
      <td class="model-cell ${getRainCellClass(row.jma)}">${formatRain(row.jma)}</td>
      <td class="avg-cell ${getRainCellClass(row.avg)}">${formatAvg(row.avg)}</td>
      <td class="risk-cell">
        <div class="risk-box">
          <span class="risk-badge risk-${row.riskCode}">${row.riskLabel}</span>
          <span class="risk-desc">${row.riskDesc || ""}</span>
        </div>
      </td>
      <td class="agree-cell"><span class="risk-badge agreement-${row.agreementCode}">${row.agreementLabel} ${row.agreementStars}</span></td>
    `;
    tableBody.appendChild(tr);
  });
}

let rainChart = null;
function renderChart(rows) {
  const ctx = document.getElementById("rainChart");
  const displayRows = (rows || []).slice(0, 24 * 6);
  const labels = displayRows.map((row) => `${row.date} ${row.hour}`);
  const pick = (v) => typeof v === "number" ? v : null;
  const data = {
    labels,
    datasets: [
      { label: "KMA 한국기상청", data: displayRows.map((row) => pick(row.kma)), tension: 0.35 },
      { label: "ECMWF 유럽중기예보센터", data: displayRows.map((row) => pick(row.ecmwf)), tension: 0.35 },
      { label: "GFS 미국 전지구모델", data: displayRows.map((row) => pick(row.gfs)), tension: 0.35 },
      { label: "JMA 일본기상청", data: displayRows.map((row) => pick(row.jma)), tension: 0.35 },
      { label: "평균값", data: displayRows.map((row) => pick(row.avg)), tension: 0.35, borderWidth: 3 }
    ]
  };
  if (rainChart) rainChart.destroy();
  rainChart = new Chart(ctx, {
    type: "line",
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      spanGaps: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label(context) {
              if (context.raw === null) return `${context.dataset.label}: 정보없음`;
              return `${context.dataset.label}: ${context.raw} mm`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 48, maxRotation: 60, minRotation: 60 } },
        y: { beginAtZero: true, title: { display: true, text: "강수량 (mm/hr)" } }
      }
    }
  });
}

function renderBrandInfo(brand, meta) {
  const footer = document.querySelector(".brand-footer");
  if (!footer) return;
  const name = brand?.name || "GUI's Arc";
  const title = brand?.title || "Construction Field Guide";
  const version = brand?.version || meta?.version || "v4.4";
  const cached = meta?.cached ? "Cached" : "Live";
  footer.innerHTML = `<strong>${name}</strong><span>${title}</span><em>${version} · ${cached} · Developed for Construction Site Decision Support</em>`;
}

function updateWindyMap(lat, lon) {
  const frame = document.getElementById("windyFrame");
  if (!frame) return;
  frame.src = `https://embed.windy.com/embed2.html?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&detailLat=${encodeURIComponent(lat)}&detailLon=${encodeURIComponent(lon)}&width=650&height=500&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=m%2Fs&metricTemp=%C2%B0C&radarRange=-1`;
}


function renderHealthManagement(rows) {
  const starsEl = document.getElementById("healthStars");
  const levelEl = document.getElementById("healthLevel");
  const envEl = document.getElementById("healthEnv");
  const feelEl = document.getElementById("healthFeelText");
  const actionsEl = document.getElementById("healthActions");
  const symptomsEl = document.getElementById("healthSymptoms");
  const firstAidEl = document.getElementById("healthFirstAid");
  const cardEl = document.getElementById("healthLevelCard");
  const focusEl = document.getElementById("healthFocusTime");
  const workRiskEl = document.getElementById("healthWorkRisk");
  const aiEl = document.getElementById("healthAiDecision");

  if (!starsEl || !levelEl || !envEl || !feelEl || !actionsEl || !symptomsEl || !firstAidEl) return;

  const validRows = (rows || []).filter((row) => typeof row.temperature === "number" || typeof row.apparentTemperature === "number");

  if (!validRows.length) {
    starsEl.textContent = "☆☆☆☆☆";
    levelEl.textContent = "자료 부족";
    envEl.textContent = "기온 - · 습도 - · 풍속 -";
    feelEl.textContent = "온도 자료를 조회하면 현장 체감 설명이 표시됩니다.";
    actionsEl.innerHTML = "";
    symptomsEl.innerHTML = "";
    firstAidEl.innerHTML = "";
    if (cardEl) cardEl.className = "health-level-card";
    if (focusEl) focusEl.innerHTML = "예보를 조회하면 집중관리 시간이 표시됩니다.";
    if (workRiskEl) workRiskEl.innerHTML = "";
    if (aiEl) aiEl.innerHTML = "예보를 조회하면 작업판단 문구가 표시됩니다.";
    return;
  }

  const today = validRows[0].date;
  const todayRows = validRows.filter((row) => row.date === today && isWorkHour(row, 6, 18));
  const workRows = validRows.filter((row) => row.date === today && isWorkHour(row, 7, 17));
  const candidates = todayRows.length ? todayRows : validRows.slice(0, 24);
  const priority = { none: 0, normal: 1, caution: 2, warning: 3, danger: 4, stop: 5, coldcaution: 2, cold: 4, coldstop: 5 };
  const target = candidates.reduce((best, row) => {
    const a = priority[row.safetyCode] || 0;
    const b = priority[best.safetyCode] || 0;
    if (a !== b) return a > b ? row : best;
    const av = typeof row.apparentTemperature === "number" ? row.apparentTemperature : -999;
    const bv = typeof best.apparentTemperature === "number" ? best.apparentTemperature : -999;
    return av > bv ? row : best;
  }, candidates[0]);

  const h = buildHealthManagement(target);

  starsEl.textContent = h.stars;
  levelEl.textContent = h.level;
  envEl.textContent = `기온 ${formatNumber(target.temperature, 1)}℃ · 체감 ${formatNumber(target.apparentTemperature, 1)}℃ · 습도 ${formatNumber(target.humidity, 0)}% · 풍속 ${formatNumber(target.windSpeed, 1)}m/s`;
  feelEl.textContent = h.feel;
  actionsEl.innerHTML = h.actions.map((item) => `<li>${item}</li>`).join("");
  symptomsEl.innerHTML = h.symptoms.map((item) => `<li>${item}</li>`).join("");
  firstAidEl.innerHTML = h.firstAid.map((item) => `<li>${item}</li>`).join("");
  if (cardEl) cardEl.className = `health-level-card health-${h.code}`;

  const focus = buildSafetyFocusSummary(workRows, validRows);
  if (focusEl) focusEl.innerHTML = renderSafetyFocusBox(focus);
  if (workRiskEl) workRiskEl.innerHTML = renderTodayWorkRisk(focus);
  if (aiEl) aiEl.innerHTML = renderHealthAiDecision(focus);
}

function buildSafetyFocusSummary(workRows, allRows) {
  const rows = workRows && workRows.length ? workRows : (allRows || []).slice(0, 18);
  const priority = { none: 0, normal: 1, caution: 2, warning: 3, danger: 4, stop: 5, coldcaution: 2, cold: 4, coldstop: 5 };
  const risky = rows.filter((row) => (priority[row.safetyCode] || 0) >= 2);
  const high = rows.filter((row) => (priority[row.safetyCode] || 0) >= 4);
  const stop = rows.filter((row) => (priority[row.safetyCode] || 0) >= 5);
  const maxHeat = maxBy(rows, "apparentTemperature");
  const maxWind = maxBy(rows, "windSpeed");
  const maxHumidity = maxBy(rows, "humidity");
  return {
    rows,
    riskyRange: rangeText(risky),
    highRange: rangeText(high),
    stopRange: rangeText(stop),
    maxHeat,
    maxWind,
    maxHumidity,
    worst: rows.reduce((best, row) => (priority[row.safetyCode] || 0) > (priority[best?.safetyCode] || 0) ? row : best, rows[0] || null)
  };
}

function renderSafetyFocusBox(focus) {
  const maxHeat = focus.maxHeat;
  const maxWind = focus.maxWind;
  const maxHumidity = focus.maxHumidity;
  const manageRange = focus.highRange !== "없음" ? focus.highRange : focus.riskyRange;
  return `
    <div class="focus-time-main">
      <span class="focus-label">집중관리 시간</span>
      <strong>${manageRange}</strong>
      <small>${focus.stopRange !== "없음" ? "작업중단 검토 시간: " + focus.stopRange : "주의 이상 시간대 기준"}</small>
    </div>
    <div class="focus-mini-grid">
      <div><b>체감 최고</b><span>${maxHeat ? formatNumber(maxHeat.apparentTemperature,1)+"℃ · "+maxHeat.hour : "-"}</span></div>
      <div><b>풍속 최고</b><span>${maxWind ? formatNumber(maxWind.windSpeed,1)+"m/s · "+maxWind.hour : "-"}</span></div>
      <div><b>습도 최고</b><span>${maxHumidity ? formatNumber(maxHumidity.humidity,0)+"% · "+maxHumidity.hour : "-"}</span></div>
    </div>`;
}

function renderHealthAiDecision(focus) {
  const heat = focus.highRange !== "없음" || focus.stopRange !== "없음";
  const wind = focus.maxWind && focus.maxWind.windSpeed >= 7;
  const humid = focus.maxHumidity && focus.maxHumidity.humidity >= 75;
  const bestTime = heat ? "07:00~10:00" : "07:00~12:00";
  const notes = [];
  notes.push(`<li><b>오늘 가장 작업하기 좋은 시간:</b> ${bestTime}</li>`);
  if (heat) notes.push(`<li><b>${focus.highRange}</b> 체감온도 위험이 높아 옥외 고강도 작업은 축소하고 휴식·수분관리를 강화하세요.</li>`);
  else notes.push(`<li>폭염 위험은 상대적으로 낮지만, 물·그늘·휴식 준비는 기본 유지하세요.</li>`);
  if (wind) notes.push(`<li><b>${focus.maxWind.hour}</b> 전후 풍속 상승 가능성이 있어 양중·크레인·고소작업 전 점검이 필요합니다.</li>`);
  if (humid) notes.push(`<li>습도가 높아 땀이 잘 마르지 않을 수 있으므로 체온과 피로도 확인을 강화하세요.</li>`);
  notes.push(`<li>관리감독자는 ${focus.riskyRange !== "없음" ? focus.riskyRange : "10:00~15:00"} 사이 순회점검을 우선 배치하는 것을 권장합니다.</li>`);
  return `<ul class="ai-decision-list">${notes.join("")}</ul>`;
}

function renderTodayWorkRisk(focus) {
  const heatLevel = focus.stopRange !== "없음" ? 4 : (focus.highRange !== "없음" ? 3 : (focus.riskyRange !== "없음" ? 2 : 1));
  const windLevel = focus.maxWind && focus.maxWind.windSpeed >= 10 ? 4 : (focus.maxWind && focus.maxWind.windSpeed >= 7 ? 3 : (focus.maxWind && focus.maxWind.windSpeed >= 5 ? 2 : 1));
  const humidLevel = focus.maxHumidity && focus.maxHumidity.humidity >= 80 ? 3 : (focus.maxHumidity && focus.maxHumidity.humidity >= 70 ? 2 : 1);
  const work = [
    ["콘크리트 타설", Math.max(heatLevel, humidLevel)],
    ["철근 조립", heatLevel],
    ["거푸집 설치", Math.max(heatLevel, windLevel)],
    ["옥상·고소작업", Math.max(heatLevel, windLevel)],
    ["크레인작업", windLevel],
    ["지게차 하역", Math.max(2, windLevel)],
    ["굴착·덤프 운반", Math.max(heatLevel, windLevel)],
    ["견출·면갈이 분진", Math.max(heatLevel, humidLevel, 3)]
  ];
  return work.map(([name, level]) => {
    const info = workRiskInfo(level);
    return `<div class="work-risk-card work-risk-${info.code}"><span>${name}</span><strong>${info.icon}</strong><small>${info.label}</small></div>`;
  }).join("");
}

function workRiskInfo(level) {
  if (level >= 4) return { code: "stop", icon: "🔴", label: "작업중지 검토" };
  if (level >= 3) return { code: "danger", icon: "🟠", label: "집중관리" };
  if (level >= 2) return { code: "caution", icon: "🟡", label: "주의" };
  return { code: "normal", icon: "🟢", label: "보통" };
}


function buildHealthManagement(row) {
  const apparent = typeof row.apparentTemperature === "number" ? row.apparentTemperature : row.temperature;
  const temp = typeof row.temperature === "number" ? row.temperature : apparent;
  const humidity = typeof row.humidity === "number" ? row.humidity : 50;
  const wind = typeof row.windSpeed === "number" ? row.windSpeed : 1;

  const isCold = apparent <= 5 || temp <= 5;

  if (isCold) {
    if (apparent <= -10 || (apparent <= -5 && wind >= 3)) {
      return {
        code: "coldstop",
        stars: "★★★★★",
        level: "🔵 한랭 매우위험",
        feel: "스키장 정상에서 얇은 옷으로 찬바람을 계속 맞는 느낌입니다. 손끝과 귀가 빠르게 시리고 판단력이 둔해질 수 있습니다.",
        actions: ["옥외 고위험 작업 중지 검토", "방한복·방한장갑·귀마개 착용 확인", "30분 작업 / 30분 온열휴식 검토", "젖은 장갑·양말 즉시 교체", "2인 1조 작업과 관리자 순회점검"],
        symptoms: ["저체온증", "동상", "손끝 저림", "판단력 저하", "근육 경직"],
        firstAid: ["젖은 옷을 제거하고 보온", "의식이 있으면 따뜻한 음료 제공", "동상 부위 문지르지 않기", "심한 떨림·의식저하 시 119 또는 의료기관 이송"]
      };
    }
    if (apparent <= -5 || wind >= 3) {
      return {
        code: "cold",
        stars: "★★★★☆",
        level: "🔵 한랭 위험",
        feel: "젖은 장갑을 끼고 찬바람을 계속 맞는 느낌입니다. 손끝·귀·발끝이 빠르게 시리고 움직임이 둔해질 수 있습니다.",
        actions: ["40분 작업 / 20분 온열휴식", "방한장갑·방한화·넥워머 착용", "따뜻한 물 제공", "젖은 복장 즉시 교체", "동상·저체온 증상 확인"],
        symptoms: ["동상 초기 증상", "저체온 위험", "손발 저림", "작업 집중력 저하"],
        firstAid: ["따뜻한 장소로 이동", "담요·핫팩으로 보온", "미지근한 물로 서서히 가온", "수포를 터뜨리지 않고 의료기관 진료"]
      };
    }
    return {
      code: "coldcaution",
      stars: "★★★☆☆",
      level: "🟦 한랭 주의",
      feel: "겨울 아침 철근을 맨손으로 만질 때처럼 손끝이 차갑고 오래 서 있으면 몸이 굳는 느낌입니다.",
      actions: ["방한복 착용", "따뜻한 음료 제공", "휴게시설 난방 확인", "1시간마다 상태 확인"],
      symptoms: ["손끝 시림", "근육 경직", "피로 증가"],
      firstAid: ["노출부위 보온", "젖은 장갑 교체", "휴식 중 체온 회복 확인"]
    };
  }

  if (apparent >= 37 || (temp >= 35 && humidity >= 70 && wind <= 1.5)) {
    return {
      code: "stop",
      stars: "★★★★★",
      level: "🟣 폭염 매우위험",
      feel: "뜨거운 비닐하우스 안에서 숨이 답답한 느낌입니다. 땀이 나도 식지 않고 가만히 있어도 체력이 빠르게 소모됩니다.",
      actions: ["고강도 옥외작업 중지 검토", "30분 작업 / 30분 휴식 또는 작업시간 조정", "냉수·전해질 지속 제공", "체온 측정 후 작업 투입", "단독작업 금지와 응급담당자 지정"],
      symptoms: ["열사병", "열탈진", "탈수", "두통·어지럼", "근육경련", "의식저하"],
      firstAid: ["즉시 그늘·냉방 장소로 이동", "의식저하·고열 시 119 신고", "옷을 느슨하게 하고 적극 냉각", "의식이 없으면 음료를 억지로 먹이지 않기"]
    };
  }

  if (apparent >= 35 || (temp >= 35 && humidity >= 60 && wind <= 2)) {
    return {
      code: "danger",
      stars: "★★★★☆",
      level: "🔴 위험",
      feel: "덜 마른 작업복을 입고 사우나 입구에 들어간 느낌입니다. 땀이 잘 마르지 않고 가만히 있어도 체력이 빠지는 상태입니다.",
      actions: ["40분 작업 / 20분 휴식", "30분마다 300~500mL씩 나누어 수분 섭취", "식염포도당 또는 전해질 음료 제공", "작업 전·후 체온 확인", "냉조끼·쿨토시 사용 권장", "관리감독자 순회 확인"],
      symptoms: ["열탈진", "탈수", "근육경련", "두통", "어지럼증", "집중력 저하"],
      firstAid: ["그늘로 이동", "옷을 느슨하게 풀기", "시원한 물을 조금씩 제공", "증상 지속 시 의료기관 연락"]
    };
  }

  if (apparent >= 33 || (temp >= 33 && humidity >= 60)) {
    return {
      code: "warning",
      stars: "★★★☆☆",
      level: "🟠 경계",
      feel: "젖은 작업복을 입고 더운 창고 안에 있는 느낌입니다. 움직일수록 땀이 늘고 피로가 빨리 쌓입니다.",
      actions: ["50분 작업 / 10분 휴식", "냉수 상시 비치", "식염포도당 지급", "신규·고령 작업자 집중 확인", "중량물 작업 최소화"],
      symptoms: ["탈수", "열경련", "피로 증가", "어지럼"],
      firstAid: ["작업 강도 낮추기", "시원한 장소에서 휴식", "수분·전해질 보충", "증상 발생 시 즉시 보고"]
    };
  }

  if (apparent >= 30 || (temp >= 30 && humidity >= 60)) {
    return {
      code: "caution",
      stars: "★★☆☆☆",
      level: "🟡 주의",
      feel: "햇볕 아래 오래 서 있으면 옷 안이 축축해지고 땀이 서서히 차는 느낌입니다.",
      actions: ["1시간마다 10분 휴식", "30분마다 수분 섭취", "물·그늘·휴식 준비", "작업 전 건강상태 확인"],
      symptoms: ["피로 누적", "가벼운 두통", "갈증", "집중력 저하"],
      firstAid: ["수분 섭취", "그늘 휴식", "무리한 연속작업 피하기"]
    };
  }

  return {
    code: "normal",
    stars: "★☆☆☆☆",
    level: "🟢 보통",
    feel: humidity >= 60 ? "약간 습하지만 일반 작업은 가능한 상태입니다." : "뽀송하고 끈적임이 적어 일반 작업에 무리가 적은 상태입니다.",
    actions: ["일반 작업 가능", "냉수 비치", "작업 전 컨디션 확인"],
    symptoms: ["특이 위험 낮음", "개인 컨디션에 따른 피로"],
    firstAid: ["기본 수분관리 유지", "이상 증상 발생 시 즉시 보고"]
  };
}

function renderSafetySummary(summary) {
  const temp = summary?.tempNow || "-";
  const apparent = summary?.apparentNow || "-";
  const humidity = summary?.humidityNow || "-";
  const wind = summary?.windNow || "-";
  const risk = summary?.riskNow || "-";

  document.getElementById("safeTempNow").textContent = temp;
  document.getElementById("safeApparentNow").textContent = apparent;
  document.getElementById("safeHumidityNow").textContent = humidity;
  document.getElementById("safeWindNow").textContent = wind;
  document.getElementById("safeRiskNow").textContent = risk;
  document.getElementById("safetyRecommendationText").textContent = summary?.recommendation || "온도 안전관리 자료가 부족합니다.";

  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  setText("globalSafeTemp", temp);
  setText("globalSafeApparent", apparent);
  setText("globalSafeHumidity", humidity);
  setText("globalSafeWind", wind);
  setText("globalSafeRisk", risk);
}


function getTemperatureCellClass(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "env-empty";
  if (value <= -5) return "temp-cold-high";
  if (value <= 0) return "temp-cold";
  if (value < 28) return "temp-normal";
  if (value < 31) return "temp-caution";
  if (value < 33) return "temp-warning";
  if (value < 35) return "temp-danger";
  return "temp-stop";
}

function getHumidityCellClass(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "env-empty";
  if (value < 40) return "humidity-dry";
  if (value <= 60) return "humidity-good";
  if (value <= 70) return "humidity-wet";
  if (value <= 80) return "humidity-bad";
  return "humidity-worst";
}

function getWindCellClass(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "env-empty";
  if (value < 2) return "wind-calm";
  if (value < 5) return "wind-normal";
  if (value < 8) return "wind-strong";
  if (value < 10) return "wind-danger";
  return "wind-stop";
}

function isWorkHour(row, start = 7, end = 17) {
  const hour = Number(String(row.hour || "").slice(0, 2));
  return Number.isFinite(hour) && hour >= start && hour <= end;
}

function limitDays(rows, days) {
  const out = [];
  const seen = new Set();
  for (const row of rows || []) {
    seen.add(row.date);
    if (seen.size > days) break;
    out.push(row);
  }
  return out;
}

function renderSafetyTable(rows) {
  const body = document.getElementById("safetyTableBody");
  if (!body) return;
  body.innerHTML = "";

  const displayRows = limitWorkDays(rows || [], 2, 7, 17);
  let prevDate = "";

  displayRows.forEach((row) => {
    if (row.date !== prevDate) {
      const groupTr = document.createElement("tr");
      groupTr.className = "day-group-row safety-day-group";
      groupTr.innerHTML = `<td colspan="9"><span>${formatDayLabel(row)}</span></td>`;
      body.appendChild(groupTr);
      prevDate = row.date;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="date-cell day-empty"></td>
      <td class="time-cell strong-hour">${row.hour}</td>
      <td class="temp-cell ${getTemperatureCellClass(row.temperature)}">${formatNumber(row.temperature, 1)}℃</td>
      <td class="temp-cell apparent ${getTemperatureCellClass(row.apparentTemperature)}">${formatNumber(row.apparentTemperature, 1)}℃</td>
      <td class="humidity-cell ${getHumidityCellClass(row.humidity)}">${formatNumber(row.humidity, 0)}%</td>
      <td class="wind-cell ${getWindCellClass(row.windSpeed)}">${formatNumber(row.windSpeed, 1)} m/s</td>
      <td class="safety-risk-cell"><span class="safety-badge safety-${row.safetyCode}">${row.safetyLabel}</span></td>
      <td class="humidity-feel-cell">${row.humidityFeel}</td>
      <td class="safety-action-cell">${row.action}</td>
    `;
    body.appendChild(tr);
  });
}


let safetyChart = null;
function renderSafetyChart(rows) {
  const canvas = document.getElementById("safetyChart");
  if (!canvas) return;

  const today = getFirstWorkDate(rows || [], 6, 18) || rows?.[0]?.date;
  const todayRows = (rows || []).filter((row) => row.date === today && isWorkHour(row, 6, 18));

  const labels = todayRows.map((row) => row.hour);
  const apparent = todayRows.map((row) => typeof row.apparentTemperature === "number" ? row.apparentTemperature : null);
  const temperature = todayRows.map((row) => typeof row.temperature === "number" ? row.temperature : null);

  const stickerPoints = todayRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => getSafetyPointLabel(row));

  const maxTemp = Math.max(...apparent.filter((v)=>typeof v === "number"), ...temperature.filter((v)=>typeof v === "number"), 35);
  const minTemp = Math.min(...apparent.filter((v)=>typeof v === "number"), ...temperature.filter((v)=>typeof v === "number"), 15);

  const stickerPlugin = {
    id: "todaySafetyStickerPlugin",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      stickerPoints.forEach(({ row, index }, order) => {
        const point = meta.data[index];
        if (!point) return;
        const label = getSafetyPointLabel(row);
        const x = point.x + ((order % 2) ? 18 : -18);
        const y = point.y - 32 - ((order % 3) * 10);
        const fill = getSafetyPointColor(row);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 8);
        const w = Math.max(56, label.length * 13);
        ctx.fillStyle = fill;
        roundRect(ctx, -w / 2, -12, w, 24, 12);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(label, 0, 0);
        ctx.restore();
      });
      ctx.restore();
    }
  };

  if (safetyChart) safetyChart.destroy();

  safetyChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "체감온도",
          data: apparent,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: todayRows.map((row) => getSafetyPointLabel(row) ? 6 : 4),
          pointHoverRadius: 8,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239,68,68,.12)",
          pointBackgroundColor: todayRows.map((row) => getSafetyPointLabel(row) ? getSafetyPointColor(row) : "#ef4444")
        },
        {
          label: "기온",
          data: temperature,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3,
          borderColor: "#f97316",
          backgroundColor: "rgba(249,115,22,.10)",
          pointBackgroundColor: "#f97316"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      layout: { padding: { top: 70, left: 8, right: 8 } },
      plugins: {
        legend: { position: "top" },
        tooltip: { callbacks: { label(context) { return context.raw === null ? `${context.dataset.label}: 정보없음` : `${context.dataset.label}: ${context.raw.toFixed(1)}℃`; } } }
      },
      scales: {
        x: { ticks: { autoSkip: false, maxRotation: 0, font: { size: 13, weight: "bold" } } },
        y: { title: { display: true, text: "온도 (℃)" }, suggestedMin: Math.floor(minTemp - 3), suggestedMax: Math.ceil(maxTemp + 4) }
      }
    },
    plugins: [stickerPlugin]
  });
}


let safetyTrendChart = null;
function renderSafetyTrendChart(rows) {
  const canvas = document.getElementById("safetyTrendChart");
  if (!canvas) return;

  const displayRows = limitDays(rows || [], 6);
  const labels = displayRows.map((row) => `${formatShortDate(row.date)} ${row.hour}`);
  const pick = (v) => typeof v === "number" ? v : null;
  const extremePoints = displayRows.map((row, index) => ({ row, index }))
    .filter(({ row }) => typeof row.apparentTemperature === "number" && (row.apparentTemperature >= 35 || row.apparentTemperature <= -5));

  const extremeStickerPlugin = {
    id: "extremeIconPlugin",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      extremePoints.forEach(({ row, index }, order) => {
        const point = meta.data[index];
        if (!point) return;
        const icon = row.apparentTemperature >= 35 ? "⚠️" : "❄️";
        const x = point.x;
        const y = point.y - 16 - ((order % 2) * 10);
        ctx.fillText(icon, x, y);
      });
      ctx.restore();
    }
  };

  if (safetyTrendChart) safetyTrendChart.destroy();
  safetyTrendChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "체감온도(℃)", data: displayRows.map((row) => pick(row.apparentTemperature)), yAxisID: "yTemp", tension: 0.3, borderWidth: 3, pointRadius: 2, borderColor: "#ef4444", pointBackgroundColor: "#ef4444" },
        { label: "기온(℃)", data: displayRows.map((row) => pick(row.temperature)), yAxisID: "yTemp", tension: 0.3, borderWidth: 2, pointRadius: 1, borderColor: "#f97316", pointBackgroundColor: "#f97316" },
        { label: "습도(%)", data: displayRows.map((row) => pick(row.humidity)), yAxisID: "yEnv", tension: 0.25, borderWidth: 2, pointRadius: 1, borderColor: "#8b5cf6", pointBackgroundColor: "#8b5cf6" },
        { label: "풍속(m/s)", data: displayRows.map((row) => pick(row.windSpeed)), yAxisID: "yWind", tension: 0.25, borderWidth: 2, pointRadius: 1, borderColor: "#84cc16", pointBackgroundColor: "#84cc16" }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      layout: { padding: { top: 42 } },
      plugins: { legend: { position: "top" } },
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 36, maxRotation: 60, minRotation: 60, font: { size: 12, weight: "bold" } } },
        yTemp: { type: "linear", position: "left", title: { display: true, text: "온도(℃)" } },
        yEnv: { type: "linear", position: "right", min: 0, max: 100, grid: { drawOnChartArea: false }, title: { display: true, text: "습도(%)" } },
        yWind: { type: "linear", position: "right", min: 0, max: 20, display: false }
      }
    },
    plugins: [extremeStickerPlugin]
  });
}


function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function formatNumber(value, digits) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}


function getFirstWorkDate(rows, start = 7, end = 17) {
  const workRows = (rows || []).filter((row) => isWorkHour(row, start, end));
  return workRows.length ? workRows[0].date : ((rows || [])[0]?.date || null);
}

function getRowsForWorkDate(rows, date, start = 7, end = 17) {
  return (rows || []).filter((row) => row.date === date && isWorkHour(row, start, end));
}

function limitWorkDays(rows, days = 2, start = 7, end = 17) {
  const out = [];
  const seen = new Set();
  (rows || []).forEach((row) => {
    if (!isWorkHour(row, start, end)) return;
    if (!seen.has(row.date) && seen.size >= days) return;
    seen.add(row.date);
    out.push(row);
  });
  return out;
}

function getSafetyPointLabel(row) {
  const temp = typeof row?.apparentTemperature === "number" ? row.apparentTemperature : null;
  if (temp === null) return "";
  if (temp >= 37) return "작업중단!";
  if (temp >= 35) return "작업단축!";
  if (temp >= 33) return "고위험!";
  if (temp >= 31) return "주의!";
  if (temp <= -5) return "한랭위험!";
  if (temp <= 0) return "한랭주의!";
  return "";
}

function getSafetyPointColor(row) {
  const temp = typeof row?.apparentTemperature === "number" ? row.apparentTemperature : null;
  if (temp === null) return "rgba(37,99,235,.95)";
  if (temp >= 37) return "rgba(124,58,237,.95)";
  if (temp >= 35) return "rgba(220,38,38,.95)";
  if (temp >= 33) return "rgba(249,115,22,.95)";
  if (temp >= 31) return "rgba(245,158,11,.95)";
  if (temp <= -5) return "rgba(37,99,235,.95)";
  if (temp <= 0) return "rgba(14,165,233,.95)";
  return "rgba(37,99,235,.95)";
}

function downloadCsv(rows) {
  if (!rows.length) return alert("다운로드할 데이터가 없습니다.");
  const val = (v) => typeof v === "object" && v?.type === "probability" ? `${v.value}%(${v.region})` : (v ?? "정보없음");
  const header = ["날짜","요일","시간","KMA","ECMWF","GFS","JMA","평균값","위험도","위험도 설명","예보일치도"];
  const body = rows.map((r) => [r.date,r.weekday,r.hour,val(r.kma),val(r.ecmwf),val(r.gfs),val(r.jma),r.avg ?? "-",r.riskLabel,r.riskDesc || "",`${r.agreementLabel} ${r.agreementStars}`]);
  const csv = [header, ...body].map((line) => line.map((x) => `"${String(x).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "guis_weather_hourly_forecast.csv";
  a.click();
  URL.revokeObjectURL(url);
}


function renderFieldGuide(rainRows, safetyRows) {
  const summaryEl = document.getElementById("guideRiskSummary");
  const roleEl = document.getElementById("roleChecklist");
  const processEl = document.getElementById("processChecklist");
  const tbmEl = document.getElementById("tbmText");
  const planEl = document.getElementById("guideWorkPlan");
  const briefingEl = document.getElementById("guideSafetyBriefing");
  if (!summaryEl || !roleEl || !processEl || !tbmEl) return;

  const roles = [...document.querySelectorAll(".guide-role:checked")].map((el) => el.value);
  const processes = [...document.querySelectorAll(".guide-process:checked")].map((el) => el.value);

  const safetyWorkRows = (safetyRows || []).filter((row) => isWorkHour(row, 7, 17));
  const rainWorkRows = (rainRows || []).filter((row) => isWorkHour(row, 7, 17));
  const today = safetyWorkRows?.[0]?.date || rainWorkRows?.[0]?.date || safetyRows?.[0]?.date || rainRows?.[0]?.date;
  const todaySafety = (safetyRows || []).filter((row) => row.date === today && isWorkHour(row, 7, 17));
  const todayRain = (rainRows || []).filter((row) => row.date === today && isWorkHour(row, 7, 17));

  if (!todaySafety.length && !todayRain.length) {
    summaryEl.innerHTML = `<div class="guide-risk-card"><strong>자료 부족</strong><span>예보 조회 후 오늘의 가이드가 생성됩니다.</span></div>`;
    roleEl.innerHTML = `<p class="guide-empty">역할을 선택하세요.</p>`;
    processEl.innerHTML = `<p class="guide-empty">오늘 공정을 선택하세요.</p>`;
    if (planEl) planEl.innerHTML = `<p class="guide-empty">예보 조회 후 07~17시 작업판단이 표시됩니다.</p>`;
    if (briefingEl) briefingEl.innerHTML = `<p class="guide-empty">예보 조회 후 건설안전 브리핑이 표시됩니다.</p>`;
    tbmEl.innerHTML = buildTbmHtml([], [], null);
    return;
  }

  const focus = buildGuideFocus(todaySafety, todayRain);
  summaryEl.innerHTML = renderGuideRiskCards(focus);
  roleEl.innerHTML = buildRoleChecklist(roles, focus).map(renderGuideSection).join("") || `<p class="guide-empty">역할을 선택하면 해야 할 일이 표시됩니다.</p>`;
  processEl.innerHTML = buildProcessChecklist(processes, focus).map(renderGuideSection).join("") || `<p class="guide-empty">오늘 공정을 선택하면 공정별 주의사항이 표시됩니다.</p>`;
  if (planEl) planEl.innerHTML = renderWorkPlan(buildWorkPlan(processes, focus));
  if (briefingEl) briefingEl.innerHTML = renderSafetyBriefing(focus);
  tbmEl.innerHTML = buildTbmHtml(roles, processes, focus);
}

function buildGuideFocus(safetyRows, rainRows) {
  const safetyPriority = { none:0, normal:1, caution:2, warning:3, danger:4, stop:5, cold:4, coldstop:5 };
  const worstSafety = (safetyRows || []).reduce((best,row)=>{
    return (safetyPriority[row.safetyCode]||0) > (safetyPriority[best?.safetyCode]||0) ? row : best;
  }, safetyRows?.[0] || null);
  const riskySafety = (safetyRows || []).filter((row)=>(safetyPriority[row.safetyCode]||0) >= 2);
  const stopSafety = (safetyRows || []).filter((row)=>(safetyPriority[row.safetyCode]||0) >= 4);
  const rainRisk = (rainRows || []).filter((row)=> typeof row.avg === "number" && row.avg > 1);
  const heavyRain = (rainRows || []).filter((row)=> typeof row.avg === "number" && row.avg > 3);
  const windRisk = (safetyRows || []).filter((row)=> typeof row.windSpeed === "number" && row.windSpeed >= 7);

  return {
    date: safetyRows?.[0]?.date || rainRows?.[0]?.date || "오늘",
    worstSafety,
    riskySafetyRange: rangeText(riskySafety),
    stopRange: rangeText(stopSafety),
    rainRange: rangeText(rainRisk),
    heavyRainRange: rangeText(heavyRain),
    windRange: rangeText(windRisk),
    maxApparent: maxBy(safetyRows, "apparentTemperature"),
    maxWind: maxBy(safetyRows, "windSpeed"),
    maxRain: maxBy(rainRows, "avg")
  };
}

function maxBy(rows, key) {
  return (rows || []).filter((row)=>typeof row[key] === "number").reduce((best,row)=> !best || row[key] > best[key] ? row : best, null);
}

function rangeText(rows) {
  if (!rows || !rows.length) return "없음";
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (first.hour === last.hour) return `${first.hour}`;
  return `${first.hour}~${last.hour}`;
}

function renderGuideRiskCards(focus) {
  const temp = focus.maxApparent;
  const rain = focus.maxRain;
  const wind = focus.maxWind;
  return `
    <div class="guide-risk-card guide-risk-hot">
      <span>오늘 집중관리</span>
      <strong>${focus.riskySafetyRange}</strong>
      <small>체감온도 최고 ${temp ? formatNumber(temp.apparentTemperature,1)+"℃ · "+temp.hour : "-"}</small>
    </div>
    <div class="guide-risk-card guide-risk-rain">
      <span>강수</span>
      <strong>${focus.rainRange}</strong>
      <small>${rain ? "최대 "+formatNumber(rain.avg,1)+" mm/hr · "+rain.hour : "강수 위험 낮음"}</small>
    </div>
    <div class="guide-risk-card guide-risk-wind">
      <span>풍속</span>
      <strong>${focus.windRange}</strong>
      <small>${wind ? "최대 "+formatNumber(wind.windSpeed,1)+" m/s · "+wind.hour : "풍속 위험 낮음"}</small>
    </div>
    <div class="guide-risk-card guide-risk-stop">
      <span>관리자 주의요망</span>
      <strong>${focus.stopRange !== "없음" ? focus.stopRange : focus.riskySafetyRange}</strong>
      <small>07~17시 작업시간 기준 집중순회</small>
    </div>`;
}

function renderGuideSection(section) {
  if (section.blocks && section.blocks.length) {
    return `<div class="guide-section"><h3>${section.title}</h3>${section.blocks.map((block)=>`
      <div class="process-role-block">
        <h4>${block.heading}</h4>
        <ul>${[...new Set(block.items || [])].slice(0, 12).map((item)=>`<li><label><input type="checkbox"> ${item}</label></li>`).join("")}</ul>
      </div>`).join("")}</div>`;
  }
  return `<div class="guide-section"><h3>${section.title}</h3><ul>${(section.items || []).map((item)=>`<li><label><input type="checkbox"> ${decorateRiskText(item)}</label></li>`).join("")}</ul></div>`;
}


function buildWorkPlan(processes, focus) {
  const base = [];
  const hasRain = focus.rainRange !== "없음";
  const hasHeat = focus.riskySafetyRange !== "없음";
  const hasWind = focus.windRange !== "없음";
  const proc = processes.length ? processes : ["rebar", "concrete", "earthwork", "interior"];

  const score = (label) => {
    let s = 5;
    if (hasHeat && /옥외|철근|콘크리트|토공|굴착|하역|덤프|천공|크레인|고소/.test(label)) s -= 1;
    if (hasRain && /콘크리트|방수|외부|토공|굴착|포장/.test(label)) s -= 1;
    if (hasWind && /양중|크레인|고소|외부|거푸집|하역/.test(label)) s -= 1;
    return Math.max(2, s);
  };

  const names = proc.map(processName);
  const early = names.slice(0, 2).join(" · ") || "옥외 주요공정";
  const mid = hasHeat ? "그늘·실내·준비작업" : (names[2] || "콘크리트·품질확인");
  const late = hasRain || hasWind ? "보양·정리·점검작업" : (names[3] || "외부마감·정리");

  base.push({ time:"07~10", work: early, stars:"★★★★★", note:"기온 상승 전 옥외 고강도 작업 우선 배치" });
  base.push({ time:"10~13", work: names[0] || "주요 공정", stars:"★★★★☆", note:"수분·휴식 병행, 강수·풍속 재확인" });
  base.push({ time:"13~16", work: mid, stars: hasHeat ? "★★☆☆☆" : "★★★★☆", note: hasHeat ? "폭염 집중관리, 옥외 고강도 작업 축소" : "작업 지속 가능, 관리감독 순회" });
  base.push({ time:"16~17", work: late, stars: hasRain ? "★★★☆☆" : "★★★★☆", note:"마감 전 보양·장비·현장정리 상태 확인" });
  return base.map((item) => ({ ...item, score: score(item.work) }));
}

function renderWorkPlan(plan) {
  return `<div class="work-plan-list">${plan.map((item)=>`
    <div class="work-plan-card score-${item.score}">
      <b>${item.time}</b>
      <strong>${item.work}</strong>
      <span>${item.stars}</span>
      <small>${item.note}</small>
    </div>`).join("")}</div>`;
}

function renderSafetyBriefing(focus) {
  const h = focus.worstSafety ? buildHealthManagement(focus.worstSafety) : null;
  if (!h) return `<p class="guide-empty">건강관리 자료가 부족합니다.</p>`;
  const symptoms = h.symptoms.slice(0, 4).map((x)=>`<label><input type="checkbox"> ${x}</label>`).join("");
  const firstAid = h.firstAid.slice(0, 4).map((x)=>`<li>${x}</li>`).join("");
  return `
    <div class="safety-briefing-card health-${h.code}">
      <div class="briefing-head"><span>${h.level}</span><strong>${h.stars}</strong></div>
      <p class="briefing-feel">${h.feel}</p>
      <h3>주의 증상</h3>
      <div class="briefing-checks">${symptoms}</div>
      <h3>응급조치</h3>
      <ul>${firstAid}</ul>
    </div>`;
}

function buildRoleChecklist(roles, focus) {
  const base = [];
  if (roles.includes("safety")) {
    base.push({ title:"안전관리자", items:[
      `${focus.riskySafetyRange !== "없음" ? focus.riskySafetyRange : "오전"} 작업자 온열·한랭 상태 집중 확인`,
      "냉수·식염포도당·그늘막·휴게시설 상태 점검",
      "어지럼증·두통·근육경련 호소자 즉시 보고 체계 확인",
      "고위험 시간대 관리감독자 현장 순회 기록"
    ]});
  }
  if (roles.includes("construction")) {
    base.push({ title:"공사관리자", items:[
      "오늘 공정별 외부작업 시간 조정 검토",
      `${focus.rainRange !== "없음" ? focus.rainRange+" 강수 예보 반영" : "강수 위험 낮음"} · 타설/방수/외부마감 일정 확인`,
      "고온·강풍 시간대 고강도 작업 및 양중작업 조정",
      "협력업체 작업 순서와 대기시간 공유"
    ]});
  }
  if (roles.includes("quality")) {
    base.push({ title:"품질관리자", items:[
      "콘크리트 타설 시 온도·강수 조건 기록",
      "강우 또는 고온 시 보양·양생 계획 확인",
      "필요 시 추가 공시체 제작 및 품질사진 확보"
    ]});
  }
  if (roles.includes("equipment")) {
    base.push({ title:"장비담당자", items:[
      `${focus.windRange !== "없음" ? focus.windRange+" 풍속 상승 주의" : "풍속 특이사항 낮음"}`,
      "양중장비·와이어·줄걸이·신호수 배치 확인",
      "돌풍 시 작업중지 기준 공유"
    ]});
  }
  if (roles.includes("siteManager")) {
    base.push({ title:"현장소장", items:[
      "오늘 위험시간과 작업계획을 TBM에서 공유",
      "폭염·강수·강풍 중점관리 시간대 담당자 지정",
      "작업중지 또는 시간조정 필요 공정 최종 판단"
    ]});
  }
  return base;
}

function buildProcessChecklist(processes, focus) {
  const list = [];
  const commonRain = focus.rainRange !== "없음";
  const commonWind = focus.windRange !== "없음";
  const hot = focus.riskySafetyRange !== "없음";
  const map = {
    concrete: ["타설 전 강수 예보 재확인", "보양재·비닐·배수로 준비", "강수 3mm/hr 초과 시 타설 중지 검토", "고온 시 양생·살수·표면보호 계획 확인"],
    rebar: ["고온 시간대 철근 작업자 수분관리", "결속 작업자 장갑·그늘 휴식 확인", "강풍 시 자재 전도·낙하 방지 확인"],
    formwork: ["강풍 시 거푸집·동바리 흔들림 확인", "고소부 작업자 안전대 착용 확인", "비 예보 시 미끄럼·전도 위험 관리"],
    earthwork: ["강수 전 사면·배수 상태 확인", "장비 이동로 미끄럼·침하 확인", "고온 시간대 장비기사 휴식관리"],
    waterproof: ["강수 시간대 전후 작업 피하기", "바탕면 건조 상태와 습도 확인", "우천 시 자재 보관·덮개 확인"],
    plaster: ["고온·저습 시 급건조 방지", "강수·습도 상승 시 양생 조건 확인", "실내 환기와 작업자 휴식 병행"],
    lifting: ["풍속 및 돌풍 확인", "신호수·유도자 배치", "줄걸이·와이어·샤클 상태 확인", "강풍 시간대 양중 중지 검토"],
    highwork: ["강풍·우천 시 고소작업 중지 검토", "안전대·난간·작업발판 확인", "고온 시간대 옥상작업 단축"],
    exterior: ["강수·강풍 시간대 외부마감 품질 저하 주의", "자재 날림·낙하 방지", "고온 시 접착재·마감재 시공조건 확인"],
    paving: ["포장 전 강수예보 확인", "고온 시 작업자 열부하 관리", "우천 시 표면 품질 저하 방지"],
    landscape: ["고온 시간대 식재·관수 계획 조정", "강수 전 토사 유실 방지", "장비·작업자 미끄럼 주의"],
    forkliftUnload: ["지게차 동선과 보행자 분리", "하역장 바닥 미끄럼·침하 확인", "후진 경보·유도자 배치", "고온 시간대 운전자 휴식관리"],
    excavation: ["굴착 사면·흙막이·배수 상태 확인", "강수 전 토사 붕괴 위험 점검", "장비 회전반경 출입통제", "굴착부 추락방지 조치"],
    dumpTransport: ["덤프 진출입로 살수·분진 억제", "운반로 미끄럼·침하 확인", "후진 유도자 배치", "과속·과적 금지 공유"],
    pileDrilling: ["천공 장비 수직도·지반상태 확인", "회전부 접근금지와 유도자 배치", "분진·소음 보호구 착용", "강풍 시 장비 안정성 점검"],
    craneWork: ["풍속·돌풍 시간대 작업중지 기준 공유", "줄걸이·샤클·와이어 상태 확인", "신호수·유도자 배치", "인양반경 출입통제"],
    grindingDust: ["방진마스크·보안경 착용 확인", "집진기·습식작업 등 분진저감 조치", "환기 상태와 주변 작업자 노출 확인", "작업 후 호흡기 이상 증상 확인"]
  };
  const titles = { concrete:"콘크리트 타설", rebar:"철근 조립", formwork:"거푸집 설치", earthwork:"토공", waterproof:"방수", plaster:"미장", lifting:"양중작업", highwork:"고소작업", exterior:"외부마감", paving:"포장", landscape:"조경", forkliftUnload:"지게차 하역작업", excavation:"굴착작업", dumpTransport:"덤프 운반작업", pileDrilling:"파일 천공작업", craneWork:"크레인작업", grindingDust:"견출·면갈이 분진작업" };
  processes.forEach((key)=>{
    const items = (map[key] || []).slice();
    if (hot) items.unshift(`${focus.riskySafetyRange} 작업자 휴식·수분관리 강화`);
    if (commonRain) items.unshift(`${focus.rainRange} 강수 영향 확인`);
    if (commonWind && ["lifting","highwork","formwork","exterior"].includes(key)) items.unshift(`${focus.windRange} 풍속 상승 주의`);
    list.push({ title: titles[key] || key, items });
  });
  return list;
}

function buildTbmText(roles, processes, focus) {
  const roleText = roles.length ? roles.map(roleName).join(", ") : "전체 관리자";
  const procText = processes.length ? processes.map(processName).join(", ") : "주요 공정";
  const hotLine = focus.riskySafetyRange !== "없음" ? `${focus.riskySafetyRange}에는 체감온도 상승으로 작업자 건강상태를 집중 확인하십시오.` : "온도 위험은 낮지만 기본 수분관리는 유지하십시오.";
  const rainLine = focus.rainRange !== "없음" ? `${focus.rainRange}에는 강수 영향이 예상되므로 타설·방수·외부작업은 작업 전 재확인하십시오.` : "강수 위험은 낮지만 최신 예보를 확인하십시오.";
  const windLine = focus.windRange !== "없음" ? `${focus.windRange}에는 풍속 상승 가능성이 있어 양중·고소작업 안전조치를 확인하십시오.` : "풍속 특이사항은 낮습니다.";
  return `오늘 TBM 전달사항
작업시간 기준: 07:00~17:00\n\n대상 역할: ${roleText}\n오늘 공정: ${procText}\n\n${hotLine}\n${rainLine}\n${windLine}\n\n작업자는 어지럼증, 두통, 근육경련, 손발 저림 등 이상 증상이 있으면 즉시 보고하십시오.\n관리자는 위험 시간대 순회점검과 휴식·수분·보양 상태를 확인하십시오.`;
}

function roleName(key){ return ({siteManager:"현장소장",safety:"안전관리자",quality:"품질관리자",construction:"공사관리자",equipment:"장비관리자",material:"자재관리자"})[key] || key; }
function processName(key){ return ({concrete:"콘크리트 타설",rebar:"철근",formwork:"거푸집",earthwork:"토공",waterproof:"방수",plaster:"미장",lifting:"양중",highwork:"고소작업",exterior:"외부마감",paving:"포장",landscape:"조경", forkliftUnload:"지게차 하역작업", excavation:"굴착작업", dumpTransport:"덤프 운반작업", pileDrilling:"파일 천공작업", craneWork:"크레인작업", grindingDust:"견출·면갈이 분진작업"})[key] || key; }

/* =========================================================
   v4.6 Field Guide DB rendering
   ========================================================= */
function renderFieldGuide(rainRows, safetyRows) {
  const summaryEl = document.getElementById("guideRiskSummary");
  const roleEl = document.getElementById("roleChecklist");
  const processEl = document.getElementById("processChecklist");
  const tbmEl = document.getElementById("tbmText");
  const planEl = document.getElementById("guideWorkPlan");
  const briefingEl = document.getElementById("guideSafetyBriefing");
  if (!summaryEl || !roleEl || !processEl || !tbmEl) return;

  const roles = [...document.querySelectorAll(".guide-role:checked")].map((el) => el.value);
  const workDetails = typeof getSelectedGuideWorkDetails === "function" ? getSelectedGuideWorkDetails() : [];
  const workIds = typeof getSelectedGuideWorkIds === "function" ? getSelectedGuideWorkIds() : [];
  const legacyProcesses = [...document.querySelectorAll(".guide-process:checked")].map((el) => el.value);
  const focus = buildGuideFocus(safetyRows, rainRows);

  if (!rainRows?.length && !safetyRows?.length) {
    summaryEl.innerHTML = `<div class="guide-risk-card"><strong>자료 부족</strong><span>예보 조회 후 오늘의 가이드가 생성됩니다.</span></div>`;
    roleEl.innerHTML = `<p class="guide-empty">역할을 선택하세요.</p>`;
    processEl.innerHTML = `<p class="guide-empty">공종 DB를 불러온 뒤 오늘 공종을 선택하세요.</p>`;
    if (planEl) planEl.innerHTML = `<p class="guide-empty">예보 조회 후 07~17시 작업판단이 표시됩니다.</p>`;
    if (briefingEl) briefingEl.innerHTML = `<p class="guide-empty">예보 조회 후 건설안전 브리핑이 표시됩니다.</p>`;
    tbmEl.innerHTML = buildTbmHtml([], [], null);
    return;
  }

  summaryEl.innerHTML = renderGuideRiskCards(focus);
  roleEl.innerHTML = buildRoleChecklist(roles, focus).map(renderGuideSection).join("") || `<p class="guide-empty">역할을 선택하면 해야 할 일이 표시됩니다.</p>`;

  if (workDetails.length) {
    processEl.innerHTML = buildDbProcessChecklist(workDetails, roles, focus).map(renderGuideSection).join("");
  } else {
    processEl.innerHTML = buildProcessChecklist(legacyProcesses, focus).map(renderGuideSection).join("") || `<p class="guide-empty">공종을 검색해 추가하면 DB 기반 안전·시공·품질·장비 체크리스트가 표시됩니다.</p>`;
  }

  const selectedLabels = workDetails.length ? workDetails.map((d)=>dbWorkTitle(d)) : legacyProcesses.map(processName);
  if (planEl) planEl.innerHTML = renderWorkPlan(buildWorkPlan(selectedLabels, focus, true));
  if (briefingEl) briefingEl.innerHTML = renderSafetyBriefing(focus);
  tbmEl.innerHTML = buildTbmHtml(roles, selectedLabels, focus, true);
}

function dbWorkTitle(detail){
  const item = detail?.work_item || {};
  return item.세부작업 || item.작업명 || item.작업ID || "선택 공종";
}

function dbWorkPath(detail){
  const item = detail?.work_item || {};
  return [item.대공종, item.중공종, item.주요시기].filter(Boolean).join(" · ");
}

function dbTake(rows, count){
  return (rows || []).slice(0, count);
}

function buildDbProcessChecklist(workDetails, roles, focus) {
  const sections = [];
  const roleSet = new Set(roles || []);
  const showAll = !roles || !roles.length;
  const hot = focus.riskySafetyRange !== "없음";
  const rain = focus.rainRange !== "없음";
  const wind = focus.windRange !== "없음";

  const allowed = (role) => showAll || roleSet.has(role) || roleSet.has("siteManager");

  workDetails.forEach((detail) => {
    const title = dbWorkTitle(detail);
    const path = dbWorkPath(detail);
    const blocks = [];

    const common = [];
    if (hot) common.push(`${focus.riskySafetyRange} 온열·한랭 건강관리 강화: 수분·휴식·작업자 상태 확인`);
    if (rain) common.push(`${focus.rainRange} 강수 영향 확인: 보양·배수·미끄럼·품질저하 방지`);
    if (wind) common.push(`${focus.windRange} 풍속 상승 주의: 자재 날림·양중·고소작업 기준 확인`);
    dbTake(detail.risks, 4).forEach((r)=>{
      common.push(`[위험요소/${r.위험도 || "-"}] ${r.위험요소 || "위험요소"} · ${r.상황설명 || r.사고유형 || "현장 확인"}`);
    });
    if(common.length) blocks.push({ heading:"공통 위험요소", items: common });

    if (allowed("safety")) {
      const items = [];
      dbTake(detail.safety_controls, 5).forEach((x)=>items.push(`${x["공사/안전이 해야할 일"] || "안전조치 확인"} · 증빙: ${x["기록/증빙"] || "사진/일지"}`));
      dbTake(detail.checklists, 3).forEach((x)=>items.push(`${x.체크문항 || "체크문항"} · 증빙: ${x.증빙 || "사진/일지"}`));
      if(items.length) blocks.push({ heading:"안전관리자", items });
    }

    if (allowed("construction")) {
      const items = [];
      dbTake(detail.construction_controls, 6).forEach((x)=>items.push(`${x["공사가 해야할 일"] || "시공관리 확인"} · ${x.확인포인트 || "확인포인트 점검"}`));
      if(items.length) blocks.push({ heading:"공사관리자", items });
    }

    if (allowed("quality")) {
      const items = [];
      dbTake(detail.quality_controls, 6).forEach((x)=>items.push(`${x.관리항목 || "품질항목"} · ${x["관리기준/확인내용"] || "기준 확인"} · ${x.검사시점 || "검사시점 확인"}`));
      if(items.length) blocks.push({ heading:"품질관리자", items });
    }

    if (allowed("equipment")) {
      const items = [];
      dbTake(detail.equipment_materials, 4).forEach((x)=>items.push(`${x["장비/자재/PPE"] || "장비·PPE"} · ${x.관리포인트 || "작업 전 확인"}`));
      if(items.length) blocks.push({ heading:"장비관리자", items });
    }

    if (allowed("material")) {
      const items = [];
      dbTake(detail.equipment_materials, 4).forEach((x)=>items.push(`${x["장비/자재/PPE"] || "자재"} · 반입·보관·덮개·야적장 배수상태 확인`));
      if (rain) items.unshift(`${focus.rainRange} 강수 예보 기준 자재 덮개·야적장 배수·침수방지 우선 확인`);
      if(items.length) blocks.push({ heading:"자재관리자", items });
    }

    sections.push({
      title: `${title}${path ? ` <small class="db-source-note">${path}</small>` : ""}`,
      blocks
    });
  });

  return sections;
}

function buildWorkPlan(processesOrLabels, focus, labelsAlready=false) {
  const selected = (processesOrLabels || []);
  const names = labelsAlready ? selected : selected.map(processName);
  const hasRain = focus.rainRange !== "없음";
  const heavyRain = focus.heavyRainRange !== "없음";
  const hasHeat = focus.riskySafetyRange !== "없음";
  const hasWind = focus.windRange !== "없음";
  const hasConcrete = names.some((n)=>/콘크리트|타설|레미콘|슬래브|벽체/.test(n));
  const hasWaterproof = names.some((n)=>/방수|도막|시트|우레탄/.test(n));
  const hasEquipment = names.some((n)=>/크레인|양중|지게차|덤프|굴착|천공|장비|하역/.test(n));
  const hasDust = names.some((n)=>/견출|면갈이|분진|그라인더/.test(n));

  const cards = [];
  if (hasRain) {
    cards.push({level: heavyRain || hasConcrete || hasWaterproof ? "danger" : "warning", title:"강수 대비 작업조정", note:`${focus.rainRange} 강수 영향이 예상됩니다. 외부작업은 작업 전 예보를 재확인하세요.`, items:[
      "자재 덮개·보양재·비닐·천막 준비",
      "배수로·집수정·양수기 작동상태 확인",
      hasConcrete ? "콘크리트 타설 예정 시 감리/책임기술자 승인, 강우 중지 기준, 추가 공시체 제작 여부를 사전 협의" : "외부마감·방수·도장 공정은 표면 건조상태와 강수 종료 시간을 확인",
      "토사 유실·미끄럼·침하 위험구간 사전 통제"
    ]});
  }
  if (hasHeat) {
    cards.push({level:"warning", title:"온도·습도 집중관리", note:`${focus.riskySafetyRange} 작업자 건강관리 집중 시간이 있습니다.`, items:[
      "07~17시 작업 중 고온 시간대에는 관리감독자 순회 강화",
      "냉수·식염포도당·그늘 휴게시설·체온계 준비",
      "옥외 고강도 작업은 오전 배치 또는 작업강도 조정",
      "어지럼증·두통·근육경련 호소자 즉시 보고 체계 확인"
    ]});
  }
  if (hasWind || hasEquipment) {
    cards.push({level:hasWind ? "danger" : "warning", title:"풍속·중장비 작업관리", note: hasWind ? `${focus.windRange} 풍속 상승 주의가 필요합니다.` : "장비작업은 풍속·동선·신호체계를 확인하세요.", items:[
      "크레인·양중·고소작업은 순간풍속과 작업중지 기준 공유",
      "신호수 배치, 줄걸이·와이어·아웃트리거·작업반경 통제 확인",
      "지게차·덤프·굴착장비 이동동선과 보행자 분리",
      "비산물·자재 날림 위험부 결속상태 확인"
    ]});
  }
  if (hasDust) {
    cards.push({level:"warning", title:"분진작업 건강관리", note:"견출·면갈이 등 분진공정은 호흡기 보호와 집진관리가 핵심입니다.", items:[
      "방진마스크, 보안경, 집진기·살수 상태 확인",
      "작업구역 격리와 주변 작업자 노출 최소화",
      "분진 비산 후 청소·폐기물 처리 기준 확인",
      "밀폐공간 또는 환기불량 장소는 환기계획 수립"
    ]});
  }
  if (!cards.length) {
    cards.push({level:"normal", title:"일반 작업관리", note:"07~17시 기준 큰 기상 위험은 낮습니다.", items:[
      "작업 전 TBM과 위험성평가 공유",
      "선택 공종의 안전·품질 체크리스트 확인",
      "오후 예보 변동 가능성 재확인",
      "작업종료 전 보양·정리·사진기록 실시"
    ]});
  }
  if (names.length) {
    cards.push({level:"normal", title:"선택 공종 공통 확인", note:`오늘 선택 공종: ${names.slice(0, 8).join(" · ")}${names.length>8 ? " 외" : ""}`, items:[
      "공종별 작업허가·위험성평가·작업계획서 필요 여부 확인",
      "선행공정 완료, 작업구역 통제, 자재 반입상태 확인",
      "사진·검측·TBM·순회점검 기록 누락 방지"
    ]});
  }
  return cards;
}

function renderWorkPlan(plan) {
  return `<div class="work-advice-list">${(plan || []).map((item)=>`
    <div class="work-advice-card ${item.level || "normal"}">
      <h3>${item.title}</h3>
      <p>${item.note}</p>
      <ul>${(item.items || []).map((x)=>`<li><label><input type="checkbox"> ${x}</label></li>`).join("")}</ul>
    </div>`).join("")}</div>`;
}

function buildTbmText(roles, processesOrLabels, focus, labelsAlready=false) {
  const roleText = roles.length ? roles.map(roleName).join(", ") : "전체 관리자";
  const procText = processesOrLabels.length ? (labelsAlready ? processesOrLabels : processesOrLabels.map(processName)).join(", ") : "주요 공종";
  const hotLine = focus.riskySafetyRange !== "없음" ? `${focus.riskySafetyRange}에는 체감온도 상승으로 작업자 건강상태를 집중 확인하십시오.` : "온도 위험은 낮지만 기본 수분관리는 유지하십시오.";
  const rainLine = focus.rainRange !== "없음" ? `${focus.rainRange}에는 강수 영향이 예상되므로 타설·방수·외부작업은 작업 전 재확인하십시오.` : "강수 위험은 낮지만 최신 예보를 확인하십시오.";
  const windLine = focus.windRange !== "없음" ? `${focus.windRange}에는 풍속 상승 가능성이 있어 양중·고소작업 안전조치를 확인하십시오.` : "풍속 특이사항은 낮습니다.";
  return `오늘 TBM 전달사항
작업시간 기준: 07:00~17:00\n\n대상 역할: ${roleText}\n오늘 공종: ${procText}\n\n${hotLine}\n${rainLine}\n${windLine}\n\n선택 공종은 DB 기반 위험요소·안전관리·시공관리·품질관리·장비/PPE 체크리스트를 확인하십시오.\n작업자는 이상 증상이 있으면 즉시 보고하고, 관리자는 위험 시간대 순회점검과 증빙기록을 남기십시오.`;
}


/* =========================================================
   v6.0 Stable Plus overrides: department guide + concrete-aware advice
   ========================================================= */
function renderGuideRiskCards(focus) {
  const temp = focus.maxApparent;
  const rain = focus.maxRain;
  const wind = focus.maxWind;
  const hotText = focus.riskySafetyRange !== "없음" ? focus.riskySafetyRange : "낮음";
  const rainText = focus.rainRange !== "없음" ? focus.rainRange : "낮음";
  const windText = focus.windRange !== "없음" ? focus.windRange : "낮음";
  return `
    <div class="guide-risk-card guide-risk-hot">
      <span>오늘 집중관리</span>
      <strong>${hotText}</strong>
      <small>${temp ? "체감온도 최고 "+formatNumber(temp.apparentTemperature,1)+"℃ · "+temp.hour : "체감온도 위험 낮음"}</small>
    </div>
    <div class="guide-risk-card guide-risk-rain">
      <span>강수</span>
      <strong>${rainText}</strong>
      <small>${rain ? "최대 "+formatNumber(rain.avg,1)+" mm/hr · "+rain.hour : "강수 위험 낮음"}</small>
    </div>
    <div class="guide-risk-card guide-risk-wind">
      <span>풍속</span>
      <strong>${windText}</strong>
      <small>${wind ? "최대 "+formatNumber(wind.windSpeed,1)+" m/s · "+wind.hour : "풍속 위험 낮음"}</small>
    </div>
    <div class="guide-risk-card guide-risk-stop">
      <span>관리자 주의요망</span>
      <strong>${focus.stopRange !== "없음" ? focus.stopRange : hotText}</strong>
      <small>07~17시 기준 집중순회 시간</small>
    </div>
    <div class="guide-risk-card dept-card">
      <span>부서별 포인트</span>
      <strong>공통·안전·공사</strong>
      <small>기상위험에 따라 하단 체크리스트 자동 분류</small>
    </div>`;
}

function buildRoleChecklist(roles, focus) {
  const selected = roles && roles.length ? roles : ["siteManager","safety","quality","construction","equipment","material"];
  const rain = focus.rainRange !== "없음";
  const wind = focus.windRange !== "없음";
  const hot = focus.riskySafetyRange !== "없음";
  const blocks = [];
  if (selected.includes("siteManager")) blocks.push({ title:"현장소장 · 공통 관리", items:[
    `${hot ? focus.riskySafetyRange+" 온열·한랭 집중관리" : "기본 건강관리"}를 TBM에서 공지`,
    `${rain ? focus.rainRange+" 강수 대비" : "강수 위험 낮음"} · 외부공정·타설·방수 일정 재확인`,
    `${wind ? focus.windRange+" 풍속상승 주의" : "풍속 특이사항 낮음"} · 양중/고소작업 중지기준 공유`,
    "공정 간섭, 협력업체 대기시간, 작업중지 판단권자 지정"
  ]});
  if (selected.includes("safety")) blocks.push({ title:"안전관리자", items:[
    hot ? `${focus.riskySafetyRange} 작업자 체온·수분·휴식상태 순회 확인` : "작업 전 건강상태·PPE 기본 확인",
    "냉수·식염포도당·그늘막·휴게시설·구급함 상태 확인",
    wind ? "강풍 시간대 자재 날림, 고소·양중 작업 통제상태 확인" : "추락·낙하·협착 등 기본위험 순회점검",
    "이상증상자 보고체계, 응급연락망, 2인1조 작업 필요 여부 확인"
  ]});
  if (selected.includes("construction")) blocks.push({ title:"공사관리자", items:[
    rain ? `${focus.rainRange} 강수 시간대 외부공정·타설·방수 작업계획 조정` : "07~17시 작업순서와 선행공정 완료상태 확인",
    "옥외 고강도 작업은 기온 상승 전 우선 배치 검토",
    wind ? "크레인·양중·고소작업은 풍속 기준과 신호수 배치 확인" : "자재 반입, 작업구역, 장비동선 확보",
    "협력업체별 작업범위·대기시간·마감 전 보양계획 공유"
  ]});
  if (selected.includes("quality")) blocks.push({ title:"품질관리자", items:[
    rain ? "강수 시 콘크리트 타설 승인·추가 공시체·보양계획 검토" : "검측·시험·사진기록 준비",
    hot ? "고온 시 콘크리트 온도, 양생, 급건조 방지대책 확인" : "시공조건과 자재 보관상태 확인",
    "감리 검측 전 후속공정 진행 방지, 검측사진 누락 방지",
    "품질기록: 온도·강수·습도·풍속과 시공상태 함께 기록"
  ]});
  if (selected.includes("equipment")) blocks.push({ title:"장비관리자", items:[
    wind ? "크레인·지게차·덤프·굴착장비 작업반경과 풍속기준 확인" : "장비 일상점검, 후진유도자, 보행자 분리 확인",
    "와이어·샤클·줄걸이·아웃트리거·경광등·후진경보 점검",
    "분진작업 시 집진기·방진마스크·보안경·살수장비 준비",
    "장비 작업계획서·신호수·작업반경 출입통제 확인"
  ]});
  if (selected.includes("material")) blocks.push({ title:"자재관리자", items:[
    rain ? "비닐·천막·덮개·양수기·배수자재 사전 확보" : "자재 반입·보관·야적장 배수상태 확인",
    "팔레트·철근·거푸집·시멘트계 자재 침수·오염 방지",
    "하역장 동선, 지게차 통로, 보행자 분리, 적재높이 확인",
    "익일 반입 자재는 강수·풍속 예보 기준으로 덮개와 고정상태 사전 점검"
  ]});
  return blocks;
}

function renderGuideSection(section) {
  if (section.blocks && section.blocks.length) {
    return `<div class="guide-section"><h3>${section.title}</h3>${section.blocks.map((block)=>`
      <div class="process-role-block">
        <h4>${block.heading}</h4>
        <ul>${[...new Set(block.items || [])].slice(0, 14).map((item)=>`<li><label><input type="checkbox"> ${decorateRiskText(item)}</label></li>`).join("")}</ul>
      </div>`).join("")}</div>`;
  }
  return `<div class="guide-section"><h3>${section.title}</h3><ul>${(section.items || []).map((item)=>`<li><label><input type="checkbox"> ${decorateRiskText(item)}</label></li>`).join("")}</ul></div>`;
}

function buildTbmText(roles, processesOrLabels, focus, labelsAlready=false) {
  const roleText = roles && roles.length ? roles.map(roleName).join(", ") : "전체 관리자";
  const procText = processesOrLabels && processesOrLabels.length ? (labelsAlready ? processesOrLabels : processesOrLabels.map(processName)).join(", ") : "주요 공종";
  const hotLine = focus.riskySafetyRange !== "없음" ? `체감온도 위험 시간은 ${focus.riskySafetyRange}입니다. 이 시간대에는 수분섭취, 휴식, 작업자 건강상태 확인을 강화하십시오.` : "온도 위험은 낮지만 기본 수분관리와 휴식은 유지하십시오.";
  const rainLine = focus.rainRange !== "없음" ? `강수 영향 시간은 ${focus.rainRange}입니다. 콘크리트 타설·방수·외부마감은 작업 전 예보와 보양계획을 재확인하십시오.` : "강수 위험은 낮지만 최신 예보를 계속 확인하십시오.";
  const windLine = focus.windRange !== "없음" ? `풍속 주의 시간은 ${focus.windRange}입니다. 양중·고소·외부작업은 풍속 기준과 신호수 배치를 확인하십시오.` : "풍속 특이사항은 낮습니다.";
  return `오늘 TBM 전달사항
작업시간 기준: 07:00~17:00\n\n대상 역할: ${roleText}\n오늘 공종: ${procText}\n\n${hotLine}\n${rainLine}\n${windLine}\n\n콘크리트 타설이 있는 경우 강우 중지기준, 책임기술자·감리 승인, 추가 공시체 제작 여부, 보양재와 배수로 상태를 반드시 확인하십시오.\n작업자는 어지럼증, 두통, 근육경련, 손발 저림 등 이상 증상이 있으면 즉시 보고하고, 관리자는 순회점검과 사진·일지 증빙을 남기십시오.`;
}


// v6.0.1: 위험요소 문구 강조 렌더링
function decorateRiskText(text) {
  let value = String(text || "");
  value = value.replace(/\[위험요소\/(상|높음|고|위험|매우위험)\]/g, '<span class="risk-chip-high">⚠ HIGH</span>');
  value = value.replace(/\[위험요소\/(중|보통)\]/g, '<span class="risk-chip-mid">주의</span>');
  value = value.replace(/\[위험요소\/(하|낮음)\]/g, '<span class="risk-chip-low">확인</span>');
  value = value.replace(/(추락|낙하|협착|감전|붕괴|전도|질식|화재|폭염|열탈진|강풍|타설 중지|집중호우)/g, '<span class="risk-text-high">$1</span>');
  value = value.replace(/(보양|승인|공시체|감리|검측|품질|배수|덮개)/g, '<span class="risk-text-mid">$1</span>');
  return value;
}


/* =========================================================
   v6.0.1 Final: TBM card HTML generator
   - 글자색 오류 방지
   - 아이콘 + 체크박스 형식 자동 생성
   - 복사버튼은 textContent를 읽으므로 그대로 동작
   ========================================================= */
function buildTbmHtml(roles=[], processesOrLabels=[], focus=null, labelsAlready=false) {
  if (!focus) {
    return `<div class="tbm-card-html tbm-empty">
      <div class="tbm-header-line"><span>📣</span><strong>오늘 TBM 전달문</strong></div>
      <p>예보를 조회하고 역할·공종을 선택하면 TBM 문구가 자동 생성됩니다.</p>
    </div>`;
  }

  const roleText = roles && roles.length ? roles.map(roleName).join(", ") : "전체 관리자";
  const procLabels = processesOrLabels && processesOrLabels.length
    ? (labelsAlready ? processesOrLabels : processesOrLabels.map(processName))
    : ["주요 공종"];

  const hotItems = focus.riskySafetyRange !== "없음"
    ? [
        `${focus.riskySafetyRange} 체감온도 상승 시간대 작업자 건강상태 집중 확인`,
        "냉수·식염포도당·그늘 휴게시설·체온계 준비", 
        "어지럼증·두통·근육경련 호소자 즉시 보고"
      ]
    : ["온도 위험은 낮지만 기본 수분관리와 휴식 유지"];

  const rainItems = focus.rainRange !== "없음"
    ? [
        `${focus.rainRange} 강수 영향 시간대 외부작업·타설·방수 재확인`,
        "자재 덮개·보양재·비닐·천막 준비", 
        "배수로·집수정·양수기 작동상태 확인"
      ]
    : ["강수 위험은 낮지만 최신 예보 확인"];

  const windItems = focus.windRange !== "없음"
    ? [
        `${focus.windRange} 풍속 주의 시간대 양중·고소·외부작업 기준 확인`,
        "신호수 배치, 줄걸이·와이어·아웃트리거 확인", 
        "자재 날림·낙하 위험부 결속상태 확인"
      ]
    : ["풍속 특이사항은 낮음"];

  const processText = procLabels.slice(0, 10).join(" · ") + (procLabels.length > 10 ? " 외" : "");
  const hasConcrete = procLabels.some((x) => /콘크리트|타설|레미콘|슬래브|벽체/.test(String(x)));
  const concreteItems = hasConcrete ? [
    "콘크리트 타설 시 강우 중지기준 공유",
    "책임기술자·감리 승인, 추가 공시체 제작 여부 확인",
    "타설 전 보양재·배수로·표면 우수 유입 방지 대책 확인"
  ] : ["선택 공종별 위험요소·품질·시공 체크리스트 확인"];

  const section = (icon, title, items, cls="") => `
    <div class="tbm-section ${cls}">
      <h3><span>${icon}</span>${title}</h3>
      <ul>${items.map((x)=>`<li><label><input type="checkbox"> ${decorateRiskText(x)}</label></li>`).join("")}</ul>
    </div>`;

  return `<div class="tbm-card-html">
    <div class="tbm-header-line">
      <span>📣</span>
      <div><strong>오늘 TBM 전달문</strong><small>작업시간 기준 07:00~17:00 · ${focus.date || "오늘"}</small></div>
    </div>
    <div class="tbm-meta-grid">
      <div><b>대상 역할</b><p>${roleText}</p></div>
      <div><b>오늘 공종</b><p>${processText}</p></div>
    </div>
    <div class="tbm-sections">
      ${section("🌡", "온도·건강관리", hotItems, focus.riskySafetyRange !== "없음" ? "tbm-warn" : "")}
      ${section("🌧", "강수·보양관리", rainItems, focus.rainRange !== "없음" ? "tbm-danger" : "")}
      ${section("💨", "풍속·장비관리", windItems, focus.windRange !== "없음" ? "tbm-warn" : "")}
      ${section("🏗", "공정·품질관리", concreteItems, hasConcrete ? "tbm-danger" : "")}
    </div>
    <div class="tbm-footer-note">관리자는 위험 시간대 순회점검과 사진·일지 증빙을 남기고, 작업자는 이상 증상이 있으면 즉시 보고하십시오.</div>
  </div>`;
}

/* =========================================================
   v6.1 Standards Library + AI Site Assistant
   - KCS / 산업안전보건기준 / 관련 법령 연결형 DB
   - 사고위험 TOP5 / 품질문제 TOP3 / 감리지적 가능성 TOP3
   - TBM 카드 재정의
   ========================================================= */
const V61_STANDARD_RULES = [
  {
    id: "concrete",
    match: /콘크리트|타설|레미콘|슬래브|벽체|기둥|보|양생/,
    title: "콘크리트 타설",
    kcs: ["KCS 14 20 10 콘크리트공사 일반", "KCS 14 20 40 콘크리트 시공", "KCS 14 20 계열: 타설·다짐·양생 기준 확인"],
    safety: ["펌프카·레미콘 차량 동선 통제", "호스 반동·협착·전도 위험 관리", "강우 시 표면 우수 유입 방지 및 미끄럼 관리"],
    law: ["산업안전보건기준: 차량계 건설기계, 작업장 통로, 추락·낙하 방지 관련 기준 확인", "콘크리트 타설 전 위험성평가·작업계획·TBM 실시"],
    accident: ["펌프카 호스 반동", "레미콘 차량 협착", "슬래브 단부 추락", "강우 중 미끄럼", "폭염 시간대 열탈진"],
    quality: ["강우 중 타설로 표면 품질 저하", "다짐 부족·재료분리", "공시체·슬럼프 기록 누락"],
    inspection: ["타설 전 감리 검측 누락", "강우 보양계획 미흡", "공시체 추가 제작 검토 누락"],
    checklist: ["타설 전 보양재·비닐·천막 준비", "배수로·집수정·양수기 작동 확인", "슬럼프·공시체·온도 기록", "책임기술자·감리 승인 여부 확인"]
  },
  {
    id: "rebar",
    match: /철근|배근|결속|이음|정착|피복/,
    title: "철근 조립",
    kcs: ["KCS 14 20 11 철근공사", "철근 이음·정착·피복두께·간격 기준 확인", "구조도면 및 배근상세도와 일치 여부 확인"],
    safety: ["철근 돌출부 찔림 방지캡 설치", "고소부 작업발판·안전대 확인", "자재 낙하·결속선 찔림·손 베임 관리"],
    law: ["산업안전보건기준: 추락방지, 낙하물방지, 작업발판 관련 기준 확인"],
    accident: ["철근 돌출부 찔림", "작업발판 추락", "철근 다발 낙하", "결속 중 손 베임", "폭염 시간대 집중력 저하"],
    quality: ["피복두께 부족", "정착길이 부족", "철근 간격 불량"],
    inspection: ["배근 사진 누락", "감리 검측 전 후속공정 진행", "이음·정착길이 확인 미흡"],
    checklist: ["피복두께 스페이서 확인", "정착·이음길이 확인", "배근 전경·상세 사진 확보", "감리 검측 후 후속공정 진행"]
  },
  {
    id: "formwork",
    match: /거푸집|동바리|서포트|비계|해체|슬래브 거푸집/,
    title: "거푸집·동바리",
    kcs: ["KCS 14 20 12 거푸집 및 동바리", "동바리 설치간격·수직도·해체시기 기준 확인"],
    safety: ["동바리 전도·붕괴 방지", "상부 작업 중 낙하물 통제", "해체작업 순서와 출입통제 확인"],
    law: ["산업안전보건기준: 거푸집동바리 조립·해체, 추락·낙하물 방지 관련 기준 확인"],
    accident: ["동바리 붕괴", "거푸집 해체 중 낙하", "작업발판 추락", "자재 협착", "강풍 시 자재 날림"],
    quality: ["수직도·평탄도 불량", "누수·벌어짐", "해체시기 부적정"],
    inspection: ["동바리 설치검사 누락", "해체 전 강도 확인 미흡", "거푸집 청소상태 불량"],
    checklist: ["동바리 수직도·간격 확인", "해체작업 순서 공유", "작업구역 출입통제", "타설 전 거푸집 벌어짐·누수 확인"]
  },
  {
    id: "earthwork",
    match: /굴착|토공|터파기|되메우기|흙막이|덤프|운반|토사/,
    title: "토공·굴착·운반",
    kcs: ["KCS 11 계열 토공사 기준 확인", "흙막이·굴착면 안정·되메우기 다짐 기준 확인"],
    safety: ["굴착면 붕괴·매몰 위험 관리", "덤프·굴삭기 회전반경 출입통제", "우천 시 사면·배수로 상태 확인"],
    law: ["산업안전보건기준: 굴착작업, 차량계 건설기계, 유도자 배치 관련 기준 확인"],
    accident: ["굴착면 붕괴", "덤프 후진 협착", "굴삭기 회전반경 접촉", "우천 시 사면 미끄럼", "지하매설물 손상"],
    quality: ["되메우기 다짐 부족", "지지층 확인 미흡", "배수 불량"],
    inspection: ["굴착심도·지반상태 기록 누락", "다짐시험·사진 누락", "흙막이 변위 확인 미흡"],
    checklist: ["굴착면 균열·용수 확인", "장비 유도자 배치", "우천 전 배수로 정비", "덤프 동선과 보행자 동선 분리"]
  },
  {
    id: "lifting",
    match: /크레인|양중|지게차|하역|팔레트|장비|고소|스카이|리프트/,
    title: "장비·양중·하역",
    kcs: ["공종별 장비 작업계획서 및 시공계획 기준 확인", "양중하중·작업반경·지반지지력 확인"],
    safety: ["풍속 상승 시 양중작업 중지기준 공유", "신호수·유도자 배치", "줄걸이·와이어·아웃트리거 확인"],
    law: ["산업안전보건기준: 차량계 하역운반기계, 양중기, 크레인, 작업계획서 관련 기준 확인"],
    accident: ["인양물 낙하", "지게차 전도", "크레인 아웃트리거 침하", "작업반경 내 협착", "강풍 중 흔들림"],
    quality: ["자재 파손", "반입수량 확인 미흡", "보관상태 불량"],
    inspection: ["장비점검표 누락", "반입검수 기록 누락", "신호수 배치 미흡"],
    checklist: ["장비작업계획서 확인", "신호수·유도자 배치", "하역구역 출입통제", "풍속 7m/s 이상 시 작업 기준 재확인"]
  },
  {
    id: "waterproof_finish",
    match: /방수|도장|미장|견출|면갈이|타일|석공|외부마감|분진|그라인더/,
    title: "방수·마감·분진작업",
    kcs: ["KCS 41 계열 건축마감공사 기준 확인", "방수 바탕면 함수율·건조상태·시공온도 조건 확인"],
    safety: ["분진·비산물 보안경·방진마스크 착용", "고소부 추락방지", "강수·습도 상승 시 방수·도장 작업 재검토"],
    law: ["산업안전보건기준: 분진, 보호구, 고소작업, 유해위험물질 관련 기준 확인"],
    accident: ["분진 흡입", "그라인더 비산물 눈 손상", "고소부 추락", "습윤 바닥 미끄럼", "유기용제 흡입"],
    quality: ["바탕면 건조 부족", "접착불량·들뜸", "강우 후 하자 발생"],
    inspection: ["바탕면 함수율 기록 누락", "시공 전 사진 누락", "양생·보양 미흡"],
    checklist: ["방진마스크·보안경 착용", "집진기·살수 등 분진저감 확인", "강우·습도 조건 확인", "바탕면 건조·청소상태 확인"]
  }
];

function v61SelectedWorkDetails() {
  if (typeof getSelectedGuideWorkDetails === "function") {
    const details = getSelectedGuideWorkDetails();
    if (Array.isArray(details) && details.length) return details;
  }
  return [...document.querySelectorAll(".guide-process:checked")].map((el) => ({ work_item: { 세부작업: processName(el.value), 대공종: "기본공정", 중공종: "선택공정" } }));
}

function v61WorkLabel(detail) {
  if (typeof dbWorkTitle === "function") return dbWorkTitle(detail);
  const item = detail?.work_item || detail || {};
  return item.세부작업 || item.작업명 || item.name || String(detail || "선택 공종");
}

function v61WorkPath(detail) {
  const item = detail?.work_item || detail || {};
  return [item.대공종, item.중공종, item.세부공종].filter(Boolean).join(" › ") || "공종 DB";
}

function v61MatchStandard(label) {
  const text = String(label || "");
  return V61_STANDARD_RULES.filter((rule) => rule.match.test(text));
}

function v61DefaultStandard(label) {
  return {
    id: "general",
    title: label || "선택 공종",
    kcs: ["해당 공종의 KCS·시방서·도면·승인도서를 확인", "시공계획서와 작업순서 일치 여부 확인"],
    safety: ["위험성평가·TBM 실시", "작업구역 통제·PPE 착용상태 확인", "기상조건에 따른 작업중지 기준 공유"],
    law: ["산업안전보건기준 관련 조항은 최신 원문으로 확인", "작업계획서·교육·점검기록 등 증빙 확보"],
    accident: ["추락", "낙하물", "협착", "미끄럼", "폭염·한랭 질환"],
    quality: ["시공순서 불량", "사진·검측 누락", "자재 보관상태 불량"],
    inspection: ["검측 전 후속공정 진행", "품질사진 누락", "작업계획과 실제 시공 불일치"],
    checklist: ["작업 전 TBM", "위험성평가 확인", "사진·검측·일지 기록", "기상조건 재확인"]
  };
}

function renderStandardsLibrary(workDetails, focus) {
  const el = document.getElementById("standardsLibrary");
  if (!el) return;
  if (!workDetails.length) {
    el.innerHTML = `<p class="guide-empty">공종을 선택하면 관련 KCS·산업안전보건기준·체크리스트가 표시됩니다.</p>`;
    return;
  }
  el.innerHTML = workDetails.slice(0, 12).map((detail) => {
    const label = v61WorkLabel(detail);
    const path = v61WorkPath(detail);
    const rules = v61MatchStandard(label);
    const rule = rules[0] || v61DefaultStandard(label);
    return `<article class="standard-work-card">
      <div class="standard-work-head">
        <div><h3>📚 ${label}</h3><div class="standard-path">${path}</div></div>
        <div class="standard-pill-row">
          <span class="standard-pill">KCS</span>
          <span class="standard-pill">산안기준</span>
          <span class="standard-pill">체크리스트</span>
        </div>
      </div>
      <div class="standard-grid">
        ${v61StandardBlock("📘", "KCS·시방 기준", rule.kcs)}
        ${v61StandardBlock("🛡", "산업안전·법령 연결", [...rule.safety, ...rule.law].slice(0,5))}
        ${v61StandardBlock("✅", "오늘 체크리스트", rule.checklist)}
      </div>
      <p class="standard-note">※ 기준명은 현장 검토용 연결 정보입니다. 실제 적용 시 최신 KCS·관계 법령·현장 시방서를 원문으로 재확인하세요.</p>
    </article>`;
  }).join("");
}

function v61StandardBlock(icon, title, items) {
  return `<div class="standard-block"><h4>${icon} ${title}</h4><ul>${(items||[]).map((x)=>`<li>${decorateRiskText(String(x))}</li>`).join("")}</ul></div>`;
}

function buildV61RiskData(workDetails, focus) {
  const acc = { accident: [], quality: [], inspection: [], actions: [] };
  const labels = workDetails.map(v61WorkLabel);
  const rules = labels.flatMap((label) => v61MatchStandard(label).length ? v61MatchStandard(label) : [v61DefaultStandard(label)]);
  rules.forEach((rule) => {
    rule.accident?.forEach((x) => acc.accident.push({ text:x, score:v61ScoreRisk(x, focus) }));
    rule.quality?.forEach((x) => acc.quality.push({ text:x, score:v61ScoreQuality(x, focus) }));
    rule.inspection?.forEach((x) => acc.inspection.push({ text:x, score:v61ScoreInspection(x, focus) }));
  });
  if (focus?.riskySafetyRange && focus.riskySafetyRange !== "없음") {
    acc.accident.push({ text:`${focus.riskySafetyRange} 폭염·온열질환`, score:5 });
    acc.actions.push({ title:"폭염 집중관리", text:`${focus.riskySafetyRange} 작업자 수분·휴식·체온 관리를 강화하세요.` });
  }
  if (focus?.rainRange && focus.rainRange !== "없음") {
    acc.quality.push({ text:`${focus.rainRange} 강수에 따른 보양·품질저하`, score:5 });
    acc.inspection.push({ text:"강우 시 감리 승인·보양계획·공시체 검토 누락", score:5 });
    acc.actions.push({ title:"강수 대비", text:`${focus.rainRange} 외부작업·타설·방수 공정은 보양재와 배수 상태를 먼저 확인하세요.` });
  }
  if (focus?.windRange && focus.windRange !== "없음") {
    acc.accident.push({ text:`${focus.windRange} 강풍에 따른 양중·고소작업 위험`, score:4 });
    acc.actions.push({ title:"풍속 대비", text:`${focus.windRange} 크레인·지게차·고소작업은 신호수와 작업중지 기준을 공유하세요.` });
  }
  return {
    accident: v61TopUnique(acc.accident, 5),
    quality: v61TopUnique(acc.quality, 3),
    inspection: v61TopUnique(acc.inspection, 3),
    actions: acc.actions.length ? acc.actions : [{title:"기본 관리", text:"선택 공종의 위험성평가, 작업허가, 사진·일지 증빙을 확인하세요."}]
  };
}

function v61TopUnique(items, n) {
  const map = new Map();
  items.forEach((item) => {
    const key = String(item.text).replace(/\s+/g," ").trim();
    if (!key) return;
    if (!map.has(key) || map.get(key).score < item.score) map.set(key, item);
  });
  return [...map.values()].sort((a,b)=>b.score-a.score).slice(0,n);
}
function v61ScoreRisk(text, focus) {
  let s = 3;
  if (/추락|붕괴|협착|낙하|전도|열탈진|강풍|호스|매몰/.test(text)) s += 1;
  if (focus?.riskySafetyRange !== "없음" && /열|폭염|탈진|집중력/.test(text)) s += 1;
  if (focus?.windRange !== "없음" && /강풍|양중|낙하|전도|흔들림/.test(text)) s += 1;
  if (focus?.rainRange !== "없음" && /미끄럼|강우|사면|붕괴/.test(text)) s += 1;
  return Math.min(5,s);
}
function v61ScoreQuality(text, focus) {
  let s = 3;
  if (/강우|보양|공시체|다짐|피복|정착|방수|건조/.test(text)) s += 1;
  if (focus?.rainRange !== "없음" && /강우|보양|방수|건조|품질/.test(text)) s += 1;
  return Math.min(5,s);
}
function v61ScoreInspection(text, focus) {
  let s = 3;
  if (/감리|검측|사진|승인|기록|공시체/.test(text)) s += 1;
  if (focus?.rainRange !== "없음" && /강우|보양|공시체|승인/.test(text)) s += 1;
  return Math.min(5,s);
}

function renderAiSiteAssistant(workDetails, focus) {
  const el = document.getElementById("aiSiteAssistant");
  if (!el) return;
  if (!workDetails.length && !focus) {
    el.innerHTML = `<p class="guide-empty">예보 조회와 공종 선택 후 AI 현장비서 분석이 표시됩니다.</p>`;
    return;
  }
  const data = buildV61RiskData(workDetails, focus || {});
  const headline = v61DecisionSentence(workDetails, focus, data);
  el.innerHTML = `<div class="ai-assistant-panel">
    <div class="ai-decision-box"><h3>🤖 오늘 AI 현장비서 판단</h3><p>${headline}</p></div>
    <div class="risk-top-grid">
      ${v61TopCard("🚨 사고위험 TOP5", data.accident)}
      ${v61TopCard("📐 품질문제 TOP3", data.quality)}
      ${v61TopCard("🔎 감리지적 가능성 TOP3", data.inspection)}
    </div>
    <div class="ai-action-list">
      ${data.actions.slice(0,6).map((a)=>`<div class="ai-action-item"><b>${a.title}</b>${a.text}</div>`).join("")}
    </div>
  </div>`;
}

function v61DecisionSentence(workDetails, focus, data) {
  const count = workDetails.length;
  const works = workDetails.map(v61WorkLabel).slice(0,5).join(" · ") || "선택 공종";
  const bits = [];
  if (focus?.riskySafetyRange && focus.riskySafetyRange !== "없음") bits.push(`${focus.riskySafetyRange} 온열질환 집중관리`);
  if (focus?.rainRange && focus.rainRange !== "없음") bits.push(`${focus.rainRange} 강수·보양관리`);
  if (focus?.windRange && focus.windRange !== "없음") bits.push(`${focus.windRange} 풍속·장비관리`);
  const condition = bits.length ? bits.join(" / ") : "07~17시 기준 큰 기상 위험은 낮음";
  return `오늘 선택 공종 ${count ? count + "개" : "없음"}(${works})에 대해 ${condition}가 핵심입니다. 사고위험은 ${data.accident[0]?.text || "기본 안전관리"}, 품질은 ${data.quality[0]?.text || "검측·사진 기록"}, 감리지적은 ${data.inspection[0]?.text || "승인·기록 누락"}을 우선 확인하세요.`;
}

function v61TopCard(title, rows) {
  const safe = rows && rows.length ? rows : [{text:"선택 공종 또는 예보 자료 부족", score:1}];
  return `<div class="risk-top-card"><h4>${title}</h4><ol>${safe.map((r)=>`<li class="risk-rank-item"><strong>${r.text}</strong><span class="stars">${"★".repeat(r.score)}${"☆".repeat(Math.max(0,5-r.score))}</span></li>`).join("")}</ol></div>`;
}

/* v6.1 final render override */
function renderFieldGuide(rainRows, safetyRows) {
  const summaryEl = document.getElementById("guideRiskSummary");
  const roleEl = document.getElementById("roleChecklist");
  const processEl = document.getElementById("processChecklist");
  const tbmEl = document.getElementById("tbmText");
  const planEl = document.getElementById("guideWorkPlan");
  const briefingEl = document.getElementById("guideSafetyBriefing");
  if (!summaryEl || !roleEl || !processEl || !tbmEl) return;

  const roles = [...document.querySelectorAll(".guide-role:checked")].map((el) => el.value);
  const workDetails = v61SelectedWorkDetails();
  const workIds = typeof getSelectedGuideWorkIds === "function" ? getSelectedGuideWorkIds() : [];
  const legacyProcesses = [...document.querySelectorAll(".guide-process:checked")].map((el) => el.value);

  const safetyWorkRows = (safetyRows || []).filter((row) => isWorkHour(row, 7, 17));
  const rainWorkRows = (rainRows || []).filter((row) => isWorkHour(row, 7, 17));
  const today = safetyWorkRows?.[0]?.date || rainWorkRows?.[0]?.date || safetyRows?.[0]?.date || rainRows?.[0]?.date;
  const todaySafety = (safetyRows || []).filter((row) => row.date === today && isWorkHour(row, 7, 17));
  const todayRain = (rainRows || []).filter((row) => row.date === today && isWorkHour(row, 7, 17));
  const focus = buildGuideFocus(todaySafety.length ? todaySafety : safetyWorkRows, todayRain.length ? todayRain : rainWorkRows);

  if (!rainRows?.length && !safetyRows?.length) {
    summaryEl.innerHTML = `<div class="guide-risk-card"><strong>자료 부족</strong><span>예보 조회 후 오늘의 가이드가 생성됩니다.</span></div>`;
    roleEl.innerHTML = `<p class="guide-empty">역할을 선택하세요.</p>`;
    processEl.innerHTML = `<p class="guide-empty">공종 DB를 불러온 뒤 오늘 공종을 선택하세요.</p>`;
    if (planEl) planEl.innerHTML = `<p class="guide-empty">예보 조회 후 07~17시 작업판단이 표시됩니다.</p>`;
    if (briefingEl) briefingEl.innerHTML = `<p class="guide-empty">예보 조회 후 건설안전 브리핑이 표시됩니다.</p>`;
    renderStandardsLibrary(workDetails, null);
    renderAiSiteAssistant(workDetails, null);
    tbmEl.innerHTML = buildTbmHtml([], [], null);
    return;
  }

  summaryEl.innerHTML = renderGuideRiskCards(focus);
  roleEl.innerHTML = buildRoleChecklist(roles, focus).map(renderGuideSection).join("") || `<p class="guide-empty">역할을 선택하면 해야 할 일이 표시됩니다.</p>`;

  if (workDetails.length && typeof buildDbProcessChecklist === "function") {
    processEl.innerHTML = buildDbProcessChecklist(workDetails, roles, focus).map(renderGuideSection).join("");
  } else {
    processEl.innerHTML = buildProcessChecklist(legacyProcesses, focus).map(renderGuideSection).join("") || `<p class="guide-empty">공종을 검색해 추가하면 DB 기반 안전·시공·품질·장비 체크리스트가 표시됩니다.</p>`;
  }

  const selectedLabels = workDetails.length ? workDetails.map(v61WorkLabel) : legacyProcesses.map(processName);
  if (planEl) planEl.innerHTML = renderWorkPlan(buildWorkPlan(selectedLabels, focus, true));
  if (briefingEl) briefingEl.innerHTML = renderSafetyBriefing(focus);
  renderStandardsLibrary(workDetails, focus);
  renderAiSiteAssistant(workDetails, focus);
  tbmEl.innerHTML = buildTbmHtml(roles, selectedLabels, focus, true);
}

/* v6.1 TBM override - visible, structured, checkbox based */
function buildTbmHtml(roles=[], processesOrLabels=[], focus=null, labelsAlready=false) {
  if (!focus) {
    return `<div class="tbm-card-html tbm-empty">
      <div class="tbm-header-line"><span>📣</span><div><strong>오늘 TBM 전달문</strong><small>예보 조회 후 자동 생성</small></div></div>
      <p>예보를 조회하고 역할·공종을 선택하면 TBM 문구가 자동 생성됩니다.</p>
    </div>`;
  }
  const roleText = roles && roles.length ? roles.map(roleName).join(", ") : "전체 관리자";
  const procLabels = processesOrLabels && processesOrLabels.length ? (labelsAlready ? processesOrLabels : processesOrLabels.map(processName)) : ["주요 공정"];
  const hasConcrete = procLabels.some((x)=>/콘크리트|타설|레미콘|슬래브|벽체/.test(String(x)));
  const hasLifting = procLabels.some((x)=>/크레인|양중|지게차|하역|장비|고소/.test(String(x)));
  const hasDust = procLabels.some((x)=>/견출|면갈이|분진|그라인더|석공|도장/.test(String(x)));
  const sections = [
    { icon:"🌡", title:"온도·건강관리", cls: focus.riskySafetyRange !== "없음" ? "tbm-warn" : "", items: focus.riskySafetyRange !== "없음" ? [`${focus.riskySafetyRange} 체감온도 상승 시간대 집중관리`, "30분 간격 수분섭취와 휴식 지도", "어지럼증·두통·근육경련 즉시 보고"] : ["작업 전 건강상태 확인", "냉수·휴게시설 상태 확인"] },
    { icon:"🌧", title:"강수·보양관리", cls: focus.rainRange !== "없음" ? "tbm-danger" : "", items: focus.rainRange !== "없음" ? [`${focus.rainRange} 강수 영향 시간대 작업 재검토`, "자재 덮개·보양재·배수로 확인", hasConcrete ? "콘크리트 타설은 책임기술자·감리 승인 및 추가 공시체 검토" : "외부작업은 보양계획 재확인"] : ["강수 위험 낮음, 최신 예보 재확인"] },
    { icon:"💨", title:"풍속·장비관리", cls: focus.windRange !== "없음" ? "tbm-warn" : "", items: focus.windRange !== "없음" || hasLifting ? [`${focus.windRange !== "없음" ? focus.windRange : "작업 전"} 풍속과 장비작업 기준 확인`, "신호수·유도자·출입통제 구역 확인", "줄걸이·와이어·아웃트리거·지반상태 확인"] : ["풍속 특이사항 낮음, 장비 일상점검 유지"] },
    { icon:"🏗", title:"공정·품질관리", cls: hasConcrete ? "tbm-danger" : "", items: [procLabels.slice(0,8).join(" · ") + (procLabels.length>8 ? " 외" : ""), "공정별 위험성평가·작업허가·검측 필요 여부 확인", "사진·일지·검측서류 증빙 누락 방지"] },
    { icon:"😷", title:"분진·보호구", cls: hasDust ? "tbm-warn" : "", items: hasDust ? ["견출·면갈이·절단 작업 방진마스크·보안경 착용", "집진·살수·환기 등 분진저감 조치", "비산물 위험구역 출입통제"] : ["작업별 PPE 착용 상태 확인"] }
  ];
  const sectionHtml = sections.map((s)=>`<div class="tbm-section ${s.cls}"><h3><span>${s.icon}</span>${s.title}</h3><ul>${s.items.map((x)=>`<li><label><input type="checkbox"> ${decorateRiskText(String(x))}</label></li>`).join("")}</ul></div>`).join("");
  return `<div class="tbm-card-html">
    <div class="tbm-header-line"><span>📣</span><div><strong>오늘 TBM 전달문</strong><small>작업시간 기준 07:00~17:00 · ${focus.date || "오늘"}</small></div></div>
    <div class="tbm-meta-grid"><div><b>대상 역할</b><p>${roleText}</p></div><div><b>오늘 공종</b><p>${procLabels.slice(0,10).join(" · ")}${procLabels.length>10?" 외":""}</p></div></div>
    <div class="tbm-sections">${sectionHtml}</div>
    <div class="tbm-footer-note">관리자는 위험 시간대 순회점검과 사진·일지 증빙을 남기고, 작업자는 이상 증상이 있으면 즉시 보고하십시오.</div>
  </div>`;
}
