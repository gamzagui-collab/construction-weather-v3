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

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="date-cell">${row.date}<br><small>(${row.weekday})</small></td>
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
  const name = brand?.name || "GUI's Weather";
  const title = brand?.title || "Construction Weather Safety";
  const version = brand?.version || meta?.version || "v3.3";
  const cached = meta?.cached ? "Cached" : "Live";
  footer.innerHTML = `<strong>${name}</strong><span>${title}</span><em>${version} · ${cached} · Developed for Construction Site Decision Support</em>`;
}

function updateWindyMap(lat, lon) {
  const frame = document.getElementById("windyFrame");
  if (!frame) return;
  frame.src = `https://embed.windy.com/embed2.html?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&detailLat=${encodeURIComponent(lat)}&detailLon=${encodeURIComponent(lon)}&width=650&height=500&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=m%2Fs&metricTemp=%C2%B0C&radarRange=-1`;
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

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="date-cell">${row.date}<br><small>(${row.weekday})</small></td>
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
