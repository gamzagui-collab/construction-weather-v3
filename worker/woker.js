const VERSION = "3.0.0";

const BRAND = {
  name: "GAMZAGUI",
  title: "Construction Weather",
  subtitle: "Built for construction field decisions",
  version: `v${VERSION}`
};

const ALLOWED_ORIGINS = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://construction-weather.pages.dev"
];

const CACHE_SECONDS = 300;
const GEOCODE_CACHE_SECONDS = 86400;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/forecast") return await handleForecast(request, env);
      if (url.pathname === "/geocode") return await handleGeocode(request);
      if (url.pathname === "/reverse") return await handleReverse(request);

      if (url.pathname === "/health") {
        return jsonResponse(request, {
          ok: true,
          brand: BRAND,
          time: new Date().toISOString()
        });
      }

      return jsonResponse(request, {
        ok: false,
        message: "지원하지 않는 경로입니다.",
        available: ["/forecast", "/geocode", "/reverse", "/health"],
        brand: BRAND
      }, 404);
    } catch (error) {
      return jsonResponse(request, {
        ok: false,
        message: error.message,
        brand: BRAND
      }, 500);
    }
  }
};

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function jsonResponse(request, data, status = 200, cacheSeconds = 0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : "no-store"
    }
  });
}

async function handleForecast(request, env) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const name = url.searchParams.get("name") || "선택 위치";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return jsonResponse(request, {
      ok: false,
      message: "lat, lon 값이 필요합니다.",
      brand: BRAND
    }, 400);
  }

  const cacheKey = new Request(`${url.origin}/cache/forecast/${lat.toFixed(4)},${lon.toFixed(4)}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);

  if (cached) {
    const cachedJson = await cached.json();
    cachedJson.meta.cached = true;
    return jsonResponse(request, cachedJson, 200, CACHE_SECONDS);
  }

  const slots = generateTimeSlots();

  const [kma, ecmwf, gfs, jma] = await Promise.all([
    safeSource("kma", "KMA", "한국기상청", () => fetchKma(env, lat, lon, slots)),
    safeSource("ecmwf", "ECMWF", "유럽중기예보센터", () => fetchOpenMeteo(lat, lon, "ecmwf_ifs025")),
    safeSource("gfs", "GFS", "미국 전지구 예보모델", () => fetchOpenMeteo(lat, lon, "gfs_global")),
    safeSource("jma", "JMA", "일본기상청", () => fetchOpenMeteo(lat, lon, "jma_gsm"))
  ]);

  const kmaMap = kma.ok ? kma.data : {};
  const ecmwfMap = ecmwf.ok ? rowsToMap(aggregateTo3Hours(ecmwf.data)) : {};
  const gfsMap = gfs.ok ? rowsToMap(aggregateTo3Hours(gfs.data)) : {};
  const jmaMap = jma.ok ? rowsToMap(aggregateTo3Hours(jma.data)) : {};

  const rows = slots.map((slot) => calculateRow({
    ...slot,
    kma: kmaMap[slot.time] ?? null,
    ecmwf: ecmwfMap[slot.time] ?? null,
    gfs: gfsMap[slot.time] ?? null,
    jma: jmaMap[slot.time] ?? null
  }));

  const data = {
    ok: true,
    brand: BRAND,
    meta: {
      version: BRAND.version,
      cached: false,
      cacheSeconds: CACHE_SECONDS,
      generatedAt: new Date().toISOString(),
      location: { name, lat, lon }
    },
    status: {
      kma: sourceStatus(kma),
      ecmwf: sourceStatus(ecmwf),
      gfs: sourceStatus(gfs),
      jma: sourceStatus(jma)
    },
    summary: calculateSummary(rows),
    rows
  };

  await cache.put(cacheKey, new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`
    }
  }));

  return jsonResponse(request, data, 200, CACHE_SECONDS);
}

async function safeSource(key, label, description, fn) {
  try {
    return { key, label, description, ok: true, data: await fn(), error: null };
  } catch (error) {
    return { key, label, description, ok: false, data: null, error: error.message };
  }
}

function sourceStatus(result) {
  return {
    ok: result.ok,
    label: result.label,
    description: result.description,
    message: result.ok ? "정상" : result.error
  };
}

async function fetchOpenMeteo(lat, lon, model) {
  const target =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&hourly=precipitation` +
    `&forecast_days=7` +
    `&timezone=Asia%2FSeoul` +
    `&models=${encodeURIComponent(model)}` +
    `&cell_selection=nearest`;

  const response = await fetch(target);
  if (!response.ok) throw new Error(`${model} HTTP ${response.status}`);

  const json = await response.json();
  if (!json.hourly?.time || !json.hourly?.precipitation) {
    throw new Error(`${model} 강수 데이터 없음`);
  }

  return {
    time: json.hourly.time,
    precipitation: json.hourly.precipitation
  };
}

async function fetchKma(env, lat, lon, slots) {
  if (!env.KMA_API_KEY) throw new Error("KMA_API_KEY Secret이 없습니다.");

  const { nx, ny } = convertLatLonToGrid(lat, lon);
  const { baseDate, baseTime } = getKmaBaseDateTime();

  const target =
    `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst` +
    `?serviceKey=${env.KMA_API_KEY}` +
    `&pageNo=1` +
    `&numOfRows=2000` +
    `&dataType=JSON` +
    `&base_date=${baseDate}` +
    `&base_time=${baseTime}` +
    `&nx=${nx}` +
    `&ny=${ny}`;

  const response = await fetch(target);
  if (!response.ok) throw new Error(`KMA HTTP ${response.status}`);

  const json = await response.json();
  const code = json?.response?.header?.resultCode;
  const msg = json?.response?.header?.resultMsg;

  if (code !== "00") throw new Error(`KMA 응답 오류: ${code} / ${msg}`);

  const items = json?.response?.body?.items?.item || [];
  const pcpItems = items.filter((item) => item.category === "PCP");

  const hourly = {};

  pcpItems.forEach((item) => {
    const yyyy = item.fcstDate.slice(0, 4);
    const mm = item.fcstDate.slice(4, 6);
    const dd = item.fcstDate.slice(6, 8);
    const hh = item.fcstTime.slice(0, 2);
    hourly[`${yyyy}-${mm}-${dd} ${hh}:00`] = parseKmaRain(item.fcstValue);
  });

  const grouped = {};

  slots.forEach((slot) => {
    const start = parseKstPseudoDate(slot.time);
    let sum = 0;
    let hasData = false;

    for (let i = 0; i < 3; i++) {
      const t = new Date(start.getTime() + i * 3600000);
      const key = formatKstPseudoDate(t).time;

      if (typeof hourly[key] === "number") {
        sum += hourly[key];
        hasData = true;
      }
    }

    grouped[slot.time] = hasData ? Number(sum.toFixed(1)) : null;
  });

  return grouped;
}

function parseKmaRain(value) {
  if (!value || value === "강수없음") return 0;
  if (value.includes("1mm 미만")) return 0.5;
  if (value.includes("30.0~50.0")) return 40;
  if (value.includes("50.0mm 이상")) return 50;

  const n = parseFloat(String(value).replace("mm", ""));
  return Number.isNaN(n) ? 0 : n;
}

function aggregateTo3Hours(modelData) {
  const result = [];

  for (let i = 0; i < modelData.time.length; i += 3) {
    const rain1 = modelData.precipitation[i] ?? 0;
    const rain2 = modelData.precipitation[i + 1] ?? 0;
    const rain3 = modelData.precipitation[i + 2] ?? 0;

    result.push({
      time: modelData.time[i],
      rain: Number((rain1 + rain2 + rain3).toFixed(1))
    });
  }

  return result.slice(0, 56);
}

function rowsToMap(rows) {
  const map = {};

  rows.forEach((row) => {
    const key = String(row.time).replace("T", " ");
    map[key] = row.rain;
  });

  return map;
}

function generateTimeSlots() {
  const slots = [];
  const now = new Date(Date.now() + 9 * 3600000);

  now.setUTCMinutes(0, 0, 0);
  now.setUTCHours(Math.floor(now.getUTCHours() / 3) * 3);

  for (let i = 0; i < 56; i++) {
    const d = new Date(now.getTime() + i * 3 * 3600000);
    slots.push(formatKstPseudoDate(d));
  }

  return slots;
}

function formatKstPseudoDate(date) {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");

  return {
    date: `${yyyy}-${mm}-${dd}`,
    weekday: weekdays[date.getUTCDay()],
    hour: `${hh}:00`,
    time: `${yyyy}-${mm}-${dd} ${hh}:00`
  };
}

function parseKstPseudoDate(timeText) {
  const [datePart, hourPart] = timeText.split(" ");
  const [y, m, d] = datePart.split("-").map(Number);
  const h = Number(hourPart.slice(0, 2));
  return new Date(Date.UTC(y, m - 1, d, h));
}

function isValidRain(value) {
  return typeof value === "number" && !Number.isNaN(value);
}

function calculateRow(row) {
  const values = [row.kma, row.ecmwf, row.gfs, row.jma].filter(isValidRain);

  const avg = values.length
    ? Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1))
    : null;

  const risk = getRisk(avg);
  const agreement = getAgreement(values);

  return {
    ...row,
    avg,
    riskCode: risk.code,
    riskLabel: risk.label,
    agreementCode: agreement.code,
    agreementLabel: agreement.label,
    agreementStars: agreement.stars
  };
}

function getRisk(avg) {
  if (!isValidRain(avg)) return { code: "none", label: "조회 실패" };
  if (avg <= 1) return { code: "green", label: "🟢 작업 가능" };
  if (avg <= 5) return { code: "yellow", label: "🟡 보양 철저" };
  if (avg <= 10) return { code: "orange", label: "🟠 타설 주의" };
  return { code: "red", label: "🔴 타설 금지" };
}

function getAgreement(values) {
  if (values.length < 2) {
    return { code: "none", label: "자료 부족", stars: "☆☆☆☆☆" };
  }

  const spread = Math.max(...values) - Math.min(...values);

  if (spread <= 1) return { code: "high", label: "높음", stars: "★★★★★" };
  if (spread <= 3) return { code: "mid", label: "보통", stars: "★★★☆☆" };
  return { code: "low", label: "낮음", stars: "★☆☆☆☆" };
}

function calculateSummary(rows) {
  const validRows = rows.filter((row) => isValidRain(row.avg));
  const rainyRows = validRows.filter((row) => row.avg > 1);
  const workableRows = validRows.filter((row) => row.avg <= 1);

  if (!validRows.length) {
    return {
      rainStart: "정보없음",
      rainEnd: "정보없음",
      totalRain: "-",
      workableHours: "-",
      agreementSummary: "자료 부족",
      recommendation: "예보 자료가 부족해 판단할 수 없습니다."
    };
  }

  const totalRain = validRows.reduce((sum, row) => sum + row.avg, 0);

  return {
    rainStart: rainyRows.length ? rainyRows[0].time : "비 예보 없음",
    rainEnd: rainyRows.length ? rainyRows[rainyRows.length - 1].time : "비 예보 없음",
    totalRain: `${totalRain.toFixed(1)} mm`,
    workableHours: `${workableRows.length * 3} 시간`,
    agreementSummary: getAgreementSummary(validRows),
    recommendation: buildRecommendation(validRows)
  };
}

function getAgreementSummary(rows) {
  const scores = rows.map((row) => {
    if (row.agreementCode === "high") return 3;
    if (row.agreementCode === "mid") return 2;
    if (row.agreementCode === "low") return 1;
    return 0;
  }).filter(Boolean);

  if (!scores.length) return "자료 부족";

  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;

  if (avg >= 2.5) return "높음";
  if (avg >= 1.5) return "보통";
  return "낮음";
}

function buildRecommendation(rows) {
  const next24 = rows.slice(0, 8);
  const danger = next24.filter((row) => row.avg > 5);
  const caution = next24.filter((row) => row.avg > 1 && row.avg <= 5);

  if (danger.length) {
    return "향후 24시간 내 강수 위험이 있는 시간대가 있습니다. 콘크리트 타설은 보수적으로 검토하고, 표의 위험도와 시간대를 확인하세요.";
  }

  if (caution.length) {
    return "향후 24시간 내 약한 비 가능성이 있습니다. 타설 시 보양 계획과 배수 상태를 함께 확인하는 것이 좋습니다.";
  }

  return "향후 24시간 기준 평균 강수 위험이 낮습니다. 다만 현장 판단 시 레이더와 최신 예보를 함께 확인하세요.";
}

function convertLatLonToGrid(lat, lon) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;

  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1 * 0.5);

  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;

  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);

  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)
  };
}

function getKmaBaseDateTime() {
  const now = new Date(Date.now() + 9 * 3600000);
  now.setUTCHours(now.getUTCHours() - 1);

  const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];
  let selectedHour = 23;

  for (const hour of baseTimes) {
    if (now.getUTCHours() >= hour) selectedHour = hour;
  }

  if (now.getUTCHours() < 2) {
    now.setUTCDate(now.getUTCDate() - 1);
    selectedHour = 23;
  }

  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");

  return {
    baseDate: `${yyyy}${mm}${dd}`,
    baseTime: `${String(selectedHour).padStart(2, "0")}00`
  };
}

async function handleGeocode(request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();

  if (!q) {
    return jsonResponse(request, { ok: false, results: [] }, 400);
  }

  const cacheKey = new Request(`${url.origin}/cache/geocode/${encodeURIComponent(q)}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);

  if (cached) return new Response(cached.body, {
    status: 200,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${GEOCODE_CACHE_SECONDS}`
    }
  });

  const target =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(q + " 대한민국")}` +
    `&countrycodes=kr` +
    `&format=jsonv2` +
    `&limit=10` +
    `&accept-language=ko`;

  const response = await fetch(target, {
    headers: {
      "User-Agent": "GAMZAGUI Construction Weather v3.0"
    }
  });

  if (!response.ok) throw new Error(`지역 검색 실패: ${response.status}`);

  const json = await response.json();

  const data = {
    ok: true,
    query: q,
    results: json.map((item) => ({
      name: item.display_name,
      lat: Number(item.lat),
      lon: Number(item.lon)
    })).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon))
  };

  await cache.put(cacheKey, new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${GEOCODE_CACHE_SECONDS}`
    }
  }));

  return jsonResponse(request, data, 200, GEOCODE_CACHE_SECONDS);
}
async function handleReverse(request) {
  const url = new URL(request.url);

  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return jsonResponse(request, {
      ok: false,
      message: "lat, lon 값이 필요합니다."
    }, 400);
  }

  const target =
    `https://nominatim.openstreetmap.org/reverse` +
    `?lat=${encodeURIComponent(lat)}` +
    `&lon=${encodeURIComponent(lon)}` +
    `&format=jsonv2` +
    `&accept-language=ko`;

  const response = await fetch(target, {
    headers: {
      "User-Agent": "GAMZAGUI Construction Weather v3.0"
    }
  });

  if (!response.ok) {
    throw new Error(`역지오코딩 실패: ${response.status}`);
  }

  const json = await response.json();
  const address = json.address || {};

  const name =
    address.city ||
    address.county ||
    address.town ||
    address.village ||
    address.suburb ||
    address.neighbourhood ||
    json.display_name ||
    "지도 선택 좌표";

  const detail =
    [
      address.state,
      address.county,
      address.city,
      address.town,
      address.village,
      address.suburb
    ]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .join(" ");

  return jsonResponse(request, {
    ok: true,
    name: detail || name,
    lat,
    lon
  });
}