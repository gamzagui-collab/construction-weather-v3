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

  let prevDate = "";

  rows.forEach((row) => {
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
  const labels = rows.map((row) => `${row.date} ${row.hour}`);
  const pick = (v) => typeof v === "number" ? v : null;
  const data = {
    labels,
    datasets: [
      { label: "KMA 한국기상청", data: rows.map((row) => pick(row.kma)), tension: 0.35 },
      { label: "ECMWF 유럽중기예보센터", data: rows.map((row) => pick(row.ecmwf)), tension: 0.35 },
      { label: "GFS 미국 전지구모델", data: rows.map((row) => pick(row.gfs)), tension: 0.35 },
      { label: "JMA 일본기상청", data: rows.map((row) => pick(row.jma)), tension: 0.35 },
      { label: "평균값", data: rows.map((row) => pick(row.avg)), tension: 0.35, borderWidth: 3 }
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
  const version = brand?.version || meta?.version || "v4.2";
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
    return;
  }

  const now = validRows[0];
  const candidates = validRows.slice(0, 24);
  const priority = { none: 0, normal: 1, caution: 2, warning: 3, danger: 4, stop: 5, cold: 4, coldstop: 5 };
  const target = candidates.reduce((best, row) => {
    const a = priority[row.safetyCode] || 0;
    const b = priority[best.safetyCode] || 0;
    return a > b ? row : best;
  }, now);

  const h = buildHealthManagement(target);

  starsEl.textContent = h.stars;
  levelEl.textContent = h.level;
  envEl.textContent = `기온 ${formatNumber(target.temperature, 1)}℃ · 체감 ${formatNumber(target.apparentTemperature, 1)}℃ · 습도 ${formatNumber(target.humidity, 0)}% · 풍속 ${formatNumber(target.windSpeed, 1)}m/s`;
  feelEl.textContent = h.feel;
  actionsEl.innerHTML = h.actions.map((item) => `<li>${item}</li>`).join("");
  symptomsEl.innerHTML = h.symptoms.map((item) => `<li>${item}</li>`).join("");
  firstAidEl.innerHTML = h.firstAid.map((item) => `<li>${item}</li>`).join("");
  if (cardEl) cardEl.className = `health-level-card health-${h.code}`;
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
  document.getElementById("safeTempNow").textContent = summary?.tempNow || "-";
  document.getElementById("safeApparentNow").textContent = summary?.apparentNow || "-";
  document.getElementById("safeHumidityNow").textContent = summary?.humidityNow || "-";
  document.getElementById("safeWindNow").textContent = summary?.windNow || "-";
  document.getElementById("safeRiskNow").textContent = summary?.riskNow || "-";
  document.getElementById("safetyRecommendationText").textContent = summary?.recommendation || "온도 안전관리 자료가 부족합니다.";
}

function renderSafetyTable(rows) {
  const body = document.getElementById("safetyTableBody");
  if (!body) return;
  body.innerHTML = "";

  let prevDate = "";

  rows.forEach((row) => {
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
      <td class="time-cell">${row.hour}</td>
      <td class="temp-cell">${formatNumber(row.temperature, 1)}℃</td>
      <td class="temp-cell apparent">${formatNumber(row.apparentTemperature, 1)}℃</td>
      <td class="humidity-cell">${formatNumber(row.humidity, 0)}%</td>
      <td class="wind-cell">${formatNumber(row.windSpeed, 1)} m/s</td>
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

  const today = rows[0]?.date;
  const todayRows = rows.filter((row) => row.date === today).slice(0, 24);

  const labels = todayRows.map((row) => row.hour);
  const apparent = todayRows.map((row) => typeof row.apparentTemperature === "number" ? row.apparentTemperature : null);
  const temperature = todayRows.map((row) => typeof row.temperature === "number" ? row.temperature : null);

  const dangerPoints = todayRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => typeof row.apparentTemperature === "number" && row.apparentTemperature >= 33);

  const dangerStickerPlugin = {
    id: "dangerStickerPlugin",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      dangerPoints.forEach(({ row, index }) => {
        const point = meta.data[index];
        if (!point) return;
        const x = point.x;
        const y = point.y - 22;
        const label = row.apparentTemperature >= 35 ? "위험" : "주의";
        const w = label === "위험" ? 44 : 42;
        ctx.fillStyle = row.apparentTemperature >= 35 ? "rgba(239, 68, 68, 0.92)" : "rgba(249, 115, 22, 0.92)";
        roundRect(ctx, x - w / 2, y - 12, w, 24, 12);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(label, x, y);
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
        { label: "체감온도", data: apparent, tension: 0.35, borderWidth: 3 },
        { label: "기온", data: temperature, tension: 0.35, borderWidth: 2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label(context) {
              if (context.raw === null) return `${context.dataset.label}: 정보없음`;
              return `${context.dataset.label}: ${context.raw.toFixed(1)}℃`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 12 } },
        y: {
          title: { display: true, text: "온도 (℃)" },
          suggestedMin: 15,
          suggestedMax: 40
        }
      }
    },
    plugins: [dangerStickerPlugin]
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
  if (!summaryEl || !roleEl || !processEl || !tbmEl) return;

  const roles = [...document.querySelectorAll(".guide-role:checked")].map((el) => el.value);
  const processes = [...document.querySelectorAll(".guide-process:checked")].map((el) => el.value);

  const today = safetyRows?.[0]?.date || rainRows?.[0]?.date;
  const todaySafety = (safetyRows || []).filter((row) => row.date === today).slice(0, 24);
  const todayRain = (rainRows || []).filter((row) => row.date === today).slice(0, 24);

  if (!todaySafety.length && !todayRain.length) {
    summaryEl.innerHTML = `<div class="guide-risk-card"><strong>자료 부족</strong><span>예보 조회 후 오늘의 가이드가 생성됩니다.</span></div>`;
    roleEl.innerHTML = `<p class="guide-empty">역할을 선택하세요.</p>`;
    processEl.innerHTML = `<p class="guide-empty">오늘 공정을 선택하세요.</p>`;
    tbmEl.textContent = "예보를 조회하면 TBM 문구가 자동 생성됩니다.";
    return;
  }

  const focus = buildGuideFocus(todaySafety, todayRain);
  summaryEl.innerHTML = renderGuideRiskCards(focus);
  roleEl.innerHTML = buildRoleChecklist(roles, focus).map(renderGuideSection).join("") || `<p class="guide-empty">역할을 선택하면 해야 할 일이 표시됩니다.</p>`;
  processEl.innerHTML = buildProcessChecklist(processes, focus).map(renderGuideSection).join("") || `<p class="guide-empty">오늘 공정을 선택하면 공정별 주의사항이 표시됩니다.</p>`;
  tbmEl.textContent = buildTbmText(roles, processes, focus);
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
      <span>온도 집중관리</span>
      <strong>${focus.riskySafetyRange}</strong>
      <small>최고 체감 ${temp ? formatNumber(temp.apparentTemperature,1)+"℃ ("+temp.hour+")" : "-"}</small>
    </div>
    <div class="guide-risk-card guide-risk-rain">
      <span>강수 주의</span>
      <strong>${focus.rainRange}</strong>
      <small>최대 평균 ${rain ? formatNumber(rain.avg,1)+" mm/hr ("+rain.hour+")" : "-"}</small>
    </div>
    <div class="guide-risk-card guide-risk-wind">
      <span>풍속 주의</span>
      <strong>${focus.windRange}</strong>
      <small>최대 ${wind ? formatNumber(wind.windSpeed,1)+" m/s ("+wind.hour+")" : "-"}</small>
    </div>
    <div class="guide-risk-card guide-risk-stop">
      <span>작업중지 검토</span>
      <strong>${focus.stopRange}</strong>
      <small>위험 이상 시간대 집중순회</small>
    </div>`;
}

function renderGuideSection(section) {
  return `<div class="guide-section"><h3>${section.title}</h3><ul>${section.items.map((item)=>`<li><label><input type="checkbox"> ${item}</label></li>`).join("")}</ul></div>`;
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
    landscape: ["고온 시간대 식재·관수 계획 조정", "강수 전 토사 유실 방지", "장비·작업자 미끄럼 주의"]
  };
  const titles = { concrete:"콘크리트 타설", rebar:"철근 조립", formwork:"거푸집 설치", earthwork:"토공", waterproof:"방수", plaster:"미장", lifting:"양중작업", highwork:"고소작업", exterior:"외부마감", paving:"포장", landscape:"조경" };
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
  return `오늘 TBM 전달사항\n\n대상 역할: ${roleText}\n오늘 공정: ${procText}\n\n${hotLine}\n${rainLine}\n${windLine}\n\n작업자는 어지럼증, 두통, 근육경련, 손발 저림 등 이상 증상이 있으면 즉시 보고하십시오.\n관리자는 위험 시간대 순회점검과 휴식·수분·보양 상태를 확인하십시오.`;
}

function roleName(key){ return ({safety:"안전관리자",construction:"공사관리자",quality:"품질관리자",equipment:"장비담당자",siteManager:"현장소장"})[key] || key; }
function processName(key){ return ({concrete:"콘크리트 타설",rebar:"철근",formwork:"거푸집",earthwork:"토공",waterproof:"방수",plaster:"미장",lifting:"양중",highwork:"고소작업",exterior:"외부마감",paving:"포장",landscape:"조경"})[key] || key; }
