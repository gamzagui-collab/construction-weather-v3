function formatRain(value) {
  if (typeof value === "object" && value !== null && value.type === "probability") {
    return `
      <span class="probability-value">
        ${value.value}%
        <small>중기 · ${value.region}</small>
      </span>
    `;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    return `<span class="no-data">정보없음</span>`;
  }

  return `${value.toFixed(1)} mm`;
}

function formatAvg(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return `<span class="no-data">-</span>`;
  }

  return `<strong>${value.toFixed(1)} mm</strong>`;
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
  if (value <= 4) return "rain-lv2";
  if (value <= 7) return "rain-lv3";
  if (value <= 10) return "rain-lv4";
  if (value <= 13) return "rain-lv5";
  if (value <= 16) return "rain-lv6";

  return "rain-lv7";
}

function renderLocationInfo(location) {
  document.getElementById("currentLocationName").textContent =
    location?.name || "선택 위치";

  document.getElementById("currentLocationCoord").textContent =
    `${Number(location.lat).toFixed(6)}, ${Number(location.lon).toFixed(6)}`;
}

function getDateRowSpanMap(rows) {
  const map = {};

  rows.forEach((row) => {
    map[row.date] = (map[row.date] || 0) + 1;
  });

  return map;
}

function renderSummary(summary) {
  document.getElementById("rainStart").textContent = summary.rainStart || "-";
  document.getElementById("rainEnd").textContent = summary.rainEnd || "-";
  document.getElementById("totalRain").textContent = summary.totalRain || "-";
  document.getElementById("workableHours").textContent = summary.workableHours || "-";
  document.getElementById("agreementSummary").textContent = summary.agreementSummary || "-";
  document.getElementById("recommendationText").textContent =
    summary.recommendation || "예보 판단 자료가 부족합니다.";
}

function renderStatusBadges(status) {
  if (!status) return "";

  const items = [
    ["KMA", status.kma],
    ["ECMWF", status.ecmwf],
    ["GFS", status.gfs],
    ["JMA", status.jma]
  ];

  return items
    .map(([name, item]) => {
      const ok = item?.ok;
      const label = ok ? "정상" : "장애";
      const cls = ok ? "source-ok" : "source-fail";

      return `<span class="source-badge ${cls}" title="${item?.message || ""}">${name} ${label}</span>`;
    })
    .join(" ");
}

function renderTable(rows) {
  const tableBody = document.getElementById("forecastTableBody");
  tableBody.innerHTML = "";

  const dateRowSpanMap = getDateRowSpanMap(rows);
  const renderedDates = new Set();

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    let dateCell = "";

    if (!renderedDates.has(row.date)) {
      dateCell = `
        <td rowspan="${dateRowSpanMap[row.date]}" class="date-cell">
          ${row.date}
          <br>
          <small>(${row.weekday})</small>
        </td>
      `;

      renderedDates.add(row.date);
    }

    tr.innerHTML = `
      ${dateCell}
      <td>${row.hour}</td>
      <td class="${getRainCellClass(row.kma)}">${formatRain(row.kma)}</td>
      <td class="${getRainCellClass(row.ecmwf)}">${formatRain(row.ecmwf)}</td>
      <td class="${getRainCellClass(row.gfs)}">${formatRain(row.gfs)}</td>
      <td class="${getRainCellClass(row.jma)}">${formatRain(row.jma)}</td>
      <td class="${getRainCellClass(row.avg)}">${formatAvg(row.avg)}</td>
      <td>
        <span class="risk-badge risk-${row.riskCode}">
          ${row.riskLabel}
        </span>
      </td>
      <td>
        <span class="risk-badge agreement-${row.agreementCode}">
          ${row.agreementLabel} ${row.agreementStars}
        </span>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

let rainChart = null;

function renderChart(rows) {
  const ctx = document.getElementById("rainChart");

  const labels = rows.map((row) => `${row.date} ${row.hour}`);

  const data = {
    labels,
    datasets: [
      {
        label: "KMA 한국기상청",
        data: rows.map((row) => row.kma)
      },
      {
        label: "ECMWF 유럽중기예보센터",
        data: rows.map((row) => row.ecmwf)
      },
      {
        label: "GFS 미국 전지구 모델",
        data: rows.map((row) => row.gfs)
      },
      {
        label: "JMA 일본기상청",
        data: rows.map((row) => row.jma)
      },
      {
        label: "평균값",
        data: rows.map((row) => row.avg),
        borderWidth: 3
      }
    ]
  };

  if (rainChart) {
    rainChart.destroy();
  }

  rainChart = new Chart(ctx, {
    type: "line",
    data,
    options: {
      responsive: true,
      spanGaps: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          position: "top"
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              if (context.raw === null) {
                return `${context.dataset.label}: 정보없음`;
              }

              return `${context.dataset.label}: ${context.raw} mm`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 60,
            minRotation: 60
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "강수량 mm"
          }
        }
      }
    }
  });
}

function renderBrandInfo(brand, meta) {
  const footer = document.querySelector(".brand-footer");

  if (!footer) return;

  const name = brand?.name || "GAMZAGUI";
  const title = brand?.title || "Construction Weather";
  const version = brand?.version || meta?.version || "v3.0.0";
  const cached = meta?.cached ? "Cached" : "Live";

  footer.innerHTML = `
    <strong>${name}</strong>
    <span>${title}</span>
    <em>${version} · ${cached}</em>
  `;
}

function updateWindyMap(lat, lon) {
  const windyFrame = document.getElementById("windyFrame");

  if (!windyFrame) return;

  windyFrame.src =
    `https://embed.windy.com/embed2.html` +
    `?lat=${encodeURIComponent(lat)}` +
    `&lon=${encodeURIComponent(lon)}` +
    `&detailLat=${encodeURIComponent(lat)}` +
    `&detailLon=${encodeURIComponent(lon)}` +
    `&width=650` +
    `&height=500` +
    `&zoom=8` +
    `&level=surface` +
    `&overlay=rain` +
    `&product=ecmwf` +
    `&menu=` +
    `&message=true` +
    `&marker=true` +
    `&calendar=now` +
    `&pressure=` +
    `&type=map` +
    `&location=coordinates` +
    `&detail=` +
    `&metricWind=m%2Fs` +
    `&metricTemp=%C2%B0C` +
    `&radarRange=-1`;
}

function downloadCsv(rows) {
  if (!rows.length) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  const header = [
    "날짜",
    "요일",
    "시간",
    "KMA",
    "ECMWF",
    "GFS",
    "JMA",
    "평균값",
    "위험도",
    "예보일치도"
  ];

  const body = rows.map((row) => [
    row.date,
    row.weekday,
    row.hour,
    row.kma ?? "정보없음",
    row.ecmwf ?? "정보없음",
    row.gfs ?? "정보없음",
    row.jma ?? "정보없음",
    row.avg ?? "-",
    row.riskLabel,
    `${row.agreementLabel} ${row.agreementStars}`
  ]);

  const csv = [header, ...body]
    .map((line) => line.join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "gamzagui_construction_weather.csv";
  a.click();

  URL.revokeObjectURL(url);
}