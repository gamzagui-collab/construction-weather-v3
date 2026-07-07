const VERSION = "4.2.0";
const BRAND = {
  name: "GUI's Arc",
  title: "Construction Field Guide",
  subtitle: "Developed for Construction Site Decision Support",
  version: `v${VERSION}`
};

const ALLOWED_ORIGINS = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://construction-weather-v3.pages.dev"
];
const CACHE_SECONDS = 300;
const GEOCODE_CACHE_SECONDS = 86400;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request) });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/forecast") return await handleForecast(request, env);
      if (url.pathname === "/geocode") return await handleGeocode(request);
      if (url.pathname === "/reverse") return await handleReverse(request);
      if (url.pathname === "/accidents") return await handleAccidentsV631(request, env);
      if (url.pathname === "/ai-assistant") return await handleAiAssistant(request, env);
      if (url.pathname === "/health") return jsonResponse(request, { ok: true, brand: BRAND, time: new Date().toISOString() });
      return jsonResponse(request, { ok: false, message: "지원하지 않는 경로입니다.", available: ["/forecast","/geocode","/reverse","/accidents","/ai-assistant","/health"], brand: BRAND }, 404);
    } catch (error) {
      return jsonResponse(request, { ok: false, message: error.message, brand: BRAND }, 500);
    }
  }
};

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
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
    return jsonResponse(request, { ok: false, message: "lat, lon 값이 필요합니다.", brand: BRAND }, 400);
  }

  const cacheKey = new Request(`${url.origin}/cache/forecast-safety-v330/${lat.toFixed(4)},${lon.toFixed(4)},${encodeURIComponent(name)}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const json = await cached.json();
    json.meta.cached = true;
    return jsonResponse(request, json, 200, CACHE_SECONDS);
  }

  const slots = generateTimeSlots();
  const [kma, kmaMid, ecmwf, gfs, jma, safety] = await Promise.all([
    safeSource("kma", "KMA", "한국기상청 단기예보", () => fetchKma(env, lat, lon, slots)),
    safeSource("kmaMid", "KMA 중기", "한국기상청 중기예보", () => fetchKmaMidForecast(env, lat, lon, name, slots)),
    safeSource("ecmwf", "ECMWF", "유럽중기예보센터", () => fetchOpenMeteoRain(lat, lon, "ecmwf_ifs025")),
    safeSource("gfs", "GFS", "미국 전지구 예보모델", () => fetchOpenMeteoRain(lat, lon, "gfs_global")),
    safeSource("jma", "JMA", "일본기상청", () => fetchOpenMeteoRain(lat, lon, "jma_gsm")),
    safeSource("safety", "Safety", "Open-Meteo 온도·습도·풍속", () => fetchOpenMeteoSafety(lat, lon))
  ]);

  const kmaMap = kma.ok ? kma.data : {};
  const kmaMidMap = kmaMid.ok ? kmaMid.data : {};
  const ecmwfMap = ecmwf.ok ? rainRowsToMap(ecmwf.data) : {};
  const gfsMap = gfs.ok ? rainRowsToMap(gfs.data) : {};
  const jmaMap = jma.ok ? rainRowsToMap(jma.data) : {};
  const safetyMap = safety.ok ? safetyRowsToMap(safety.data) : {};

  const rows = slots.map((slot) => calculateRainRow({
    ...slot,
    kma: kmaMap[slot.time] ?? kmaMidMap[slot.time] ?? null,
    ecmwf: ecmwfMap[slot.time] ?? null,
    gfs: gfsMap[slot.time] ?? null,
    jma: jmaMap[slot.time] ?? null
  }));

  const safetyRows = slots.map((slot) => calculateSafetyRow({
    ...slot,
    ...(safetyMap[slot.time] || {})
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
      kmaMid: sourceStatus(kmaMid),
      ecmwf: sourceStatus(ecmwf),
      gfs: sourceStatus(gfs),
      jma: sourceStatus(jma),
      safety: sourceStatus(safety)
    },
    summary: calculateSummary(rows),
    safetySummary: calculateSafetySummary(safetyRows),
    rows,
    safetyRows
  };

  await cache.put(cacheKey, new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${CACHE_SECONDS}` }
  }));
  return jsonResponse(request, data, 200, CACHE_SECONDS);
}

async function safeSource(key, label, description, fn) {
  try { return { key, label, description, ok: true, data: await fn(), error: null }; }
  catch (error) { return { key, label, description, ok: false, data: null, error: error.message }; }
}
function sourceStatus(r) { return { ok: r.ok, label: r.label, description: r.description, message: r.ok ? "정상" : r.error }; }

async function fetchOpenMeteoRain(lat, lon, model) {
  const target = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&hourly=precipitation&forecast_days=7&timezone=Asia%2FSeoul&models=${encodeURIComponent(model)}&cell_selection=nearest`;
  const res = await fetch(target);
  if (!res.ok) throw new Error(`${model} HTTP ${res.status}`);
  const json = await res.json();
  if (!json.hourly?.time || !json.hourly?.precipitation) throw new Error(`${model} 강수 데이터 없음`);
  return { time: json.hourly.time, precipitation: json.hourly.precipitation };
}

async function fetchOpenMeteoSafety(lat, lon) {
  const hourly = "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m";
  const target = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&hourly=${hourly}&forecast_days=7&timezone=Asia%2FSeoul&cell_selection=nearest`;
  const res = await fetch(target);
  if (!res.ok) throw new Error(`Safety weather HTTP ${res.status}`);
  const json = await res.json();
  if (!json.hourly?.time) throw new Error("온도 안전관리 데이터 없음");
  return {
    time: json.hourly.time,
    temperature: json.hourly.temperature_2m || [],
    humidity: json.hourly.relative_humidity_2m || [],
    apparentTemperature: json.hourly.apparent_temperature || [],
    windSpeed: json.hourly.wind_speed_10m || []
  };
}

function rainRowsToMap(data) {
  const map = {};
  for (let i = 0; i < data.time.length; i++) {
    const key = String(data.time[i]).replace("T", " ");
    map[key] = Number((data.precipitation[i] ?? 0).toFixed(1));
  }
  return map;
}

function safetyRowsToMap(data) {
  const map = {};
  for (let i = 0; i < data.time.length; i++) {
    const key = String(data.time[i]).replace("T", " ");
    map[key] = {
      temperature: toRoundedNumber(data.temperature[i], 1),
      humidity: toRoundedNumber(data.humidity[i], 0),
      apparentTemperature: toRoundedNumber(data.apparentTemperature[i], 1),
      windSpeed: toRoundedNumber(data.windSpeed[i], 1)
    };
  }
  return map;
}
function toRoundedNumber(v, digits) { const n = Number(v); return Number.isFinite(n) ? Number(n.toFixed(digits)) : null; }

async function fetchKma(env, lat, lon, slots) {
  if (!env.KMA_API_KEY) throw new Error("KMA_API_KEY Secret이 없습니다.");
  const { nx, ny } = convertLatLonToGrid(lat, lon);
  const { baseDate, baseTime } = getKmaBaseDateTime();
  const target = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${env.KMA_API_KEY}&pageNo=1&numOfRows=2000&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;
  const res = await fetch(target);
  if (!res.ok) throw new Error(`KMA HTTP ${res.status}`);
  const json = await res.json();
  const code = json?.response?.header?.resultCode;
  const msg = json?.response?.header?.resultMsg;
  if (code !== "00") throw new Error(`KMA 응답 오류: ${code} / ${msg}`);
  const items = json?.response?.body?.items?.item || [];
  const hourly = {};
  items.filter((item) => item.category === "PCP").forEach((item) => {
    const yyyy = item.fcstDate.slice(0, 4);
    const mm = item.fcstDate.slice(4, 6);
    const dd = item.fcstDate.slice(6, 8);
    const hh = item.fcstTime.slice(0, 2);
    hourly[`${yyyy}-${mm}-${dd} ${hh}:00`] = parseKmaRain(item.fcstValue);
  });
  const result = {};
  slots.forEach((slot) => { result[slot.time] = typeof hourly[slot.time] === "number" ? hourly[slot.time] : null; });
  return result;
}

async function fetchKmaMidForecast(env, lat, lon, name, slots) {
  if (!env.KMA_API_KEY) throw new Error("KMA_API_KEY Secret이 없습니다.");
  const reg = getKmaMidLandRegion(name, lat, lon);
  const tmFc = getKmaMidBaseTime();
  const target = `https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst?serviceKey=${env.KMA_API_KEY}&pageNo=1&numOfRows=10&dataType=JSON&regId=${reg.regId}&tmFc=${tmFc}`;
  const res = await fetch(target);
  if (!res.ok) throw new Error(`KMA 중기예보 HTTP ${res.status}`);
  const json = await res.json();
  const code = json?.response?.header?.resultCode;
  const msg = json?.response?.header?.resultMsg;
  if (code !== "00") throw new Error(`KMA 중기예보 오류: ${code} / ${msg}`);
  const item = json?.response?.body?.items?.item?.[0];
  if (!item) throw new Error("KMA 중기예보 데이터 없음");
  const today = getKstDateOnly(new Date());
  const result = {};
  slots.forEach((slot) => {
    const dayDiff = Math.round((parseKstDateOnly(slot.date) - today) / 86400000);
    if (dayDiff < 4 || dayDiff > 7) return;
    const hour = Number(slot.hour.slice(0, 2));
    const key = `rnSt${dayDiff}${hour < 12 ? "Am" : "Pm"}`;
    const probability = Number(item[key]);
    if (Number.isFinite(probability)) result[slot.time] = { type: "probability", value: probability, unit: "%", source: "KMA 중기예보", region: reg.label };
  });
  return result;
}

function parseKmaRain(value) {
  if (!value || value === "강수없음") return 0;
  if (String(value).includes("1mm 미만")) return 0.5;
  if (String(value).includes("30.0~50.0")) return 40;
  if (String(value).includes("50.0mm 이상")) return 50;
  const n = parseFloat(String(value).replace("mm", ""));
  return Number.isNaN(n) ? 0 : n;
}

function generateTimeSlots() {
  const slots = [];
  const now = new Date(Date.now() + 9 * 3600000);
  now.setUTCMinutes(0, 0, 0);
  for (let i = 0; i < 168; i++) {
    const d = new Date(now.getTime() + i * 3600000);
    slots.push(formatKstPseudoDate(d));
  }
  return slots;
}

function formatKstPseudoDate(date) {
  const w = ["일", "월", "화", "수", "목", "금", "토"];
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, weekday: w[date.getUTCDay()], hour: `${hh}:00`, time: `${yyyy}-${mm}-${dd} ${hh}:00` };
}

function isValidRain(v) { return typeof v === "number" && !Number.isNaN(v); }

function calculateRainRow(row) {
  const values = [row.kma, row.ecmwf, row.gfs, row.jma].filter(isValidRain);
  const avg = values.length ? Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)) : null;
  const risk = getRisk(avg);
  const agreement = getAgreement(values);
  return { ...row, avg, riskCode: risk.code, riskLabel: risk.label, riskDesc: risk.desc, agreementCode: agreement.code, agreementLabel: agreement.label, agreementStars: agreement.stars };
}

function getRisk(avg) {
  if (!isValidRain(avg)) return { code: "none", label: "조회 실패", desc: "자료 없음" };
  if (avg === 0) return { code: "green", label: "✅ 가능", desc: "일반 시공" };
  if (avg <= 1) return { code: "green", label: "✅ 가능(주의)", desc: "표면 보호 준비 권장" };
  if (avg <= 2) return { code: "yellow", label: "⚠️ 조건부 가능", desc: "보호조치 + 책임기술자 승인" };
  if (avg <= 3) return { code: "orange", label: "⚠️ 조건부 가능", desc: "보호조치 + 책임기술자 승인 + 추가 공시체 제작" };
  if (avg >= 10) return { code: "red", label: "❌ 집중호우", desc: "타설 불가" };
  if (avg >= 5) return { code: "red", label: "❌ 절대 금지 수준", desc: "작업 중단" };
  return { code: "red", label: "❌ 원칙적으로 금지", desc: "타설 중지" };
}

function getAgreement(values) {
  if (values.length < 2) return { code: "none", label: "자료 부족", stars: "☆☆☆☆☆" };
  const spread = Math.max(...values) - Math.min(...values);
  if (spread <= 1) return { code: "high", label: "높음", stars: "★★★★★" };
  if (spread <= 3) return { code: "mid", label: "보통", stars: "★★★☆☆" };
  return { code: "low", label: "낮음", stars: "★☆☆☆☆" };
}

function calculateSummary(rows) {
  const valid = rows.filter((r) => isValidRain(r.avg));
  const rainy = valid.filter((r) => r.avg > 1);
  const workable = valid.filter((r) => r.avg <= 1);
  if (!valid.length) return { rainStart: "정보없음", rainEnd: "정보없음", totalRain: "-", workableHours: "-", agreementSummary: "자료 부족", recommendation: "예보 자료가 부족해 판단할 수 없습니다." };
  const total = valid.reduce((s, r) => s + r.avg, 0);
  return {
    rainStart: rainy.length ? rainy[0].time : "비 예보 없음",
    rainEnd: rainy.length ? rainy[rainy.length - 1].time : "비 예보 없음",
    totalRain: `${total.toFixed(1)} mm`,
    workableHours: `${workable.length} 시간`,
    agreementSummary: getAgreementSummary(valid),
    recommendation: buildRecommendation(valid)
  };
}
function getAgreementSummary(rows) {
  const scores = rows.map((r) => r.agreementCode === "high" ? 3 : r.agreementCode === "mid" ? 2 : r.agreementCode === "low" ? 1 : 0).filter(Boolean);
  if (!scores.length) return "자료 부족";
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  if (avg >= 2.5) return "높음";
  if (avg >= 1.5) return "보통";
  return "낮음";
}
function buildRecommendation(rows) {
  const next24 = rows.slice(0, 24);
  const danger = next24.filter((r) => r.avg > 3);
  const caution = next24.filter((r) => r.avg > 1 && r.avg <= 3);
  if (danger.length) return "향후 24시간 내 타설 중지 또는 금지 수준의 강수 가능 시간이 있습니다. 표의 시간대와 Windy 레이더를 함께 확인하세요.";
  if (caution.length) return "향후 24시간 내 조건부 가능 수준의 약한 비가 있습니다. 보호조치와 책임기술자 승인 여부를 검토하세요.";
  return "향후 24시간 기준 평균 강수 위험이 낮습니다. 다만 실제 타설 전 최신 예보와 현장 레이더를 함께 확인하세요.";
}

function calculateSafetyRow(row) {
  const safety = getSafetyRisk(row.apparentTemperature, row.temperature, row.windSpeed);
  return {
    ...row,
    safetyCode: safety.code,
    safetyLabel: safety.label,
    action: safety.action,
    humidityFeel: getHumidityFeel(row.humidity),
    windFeel: getWindFeel(row.windSpeed)
  };
}

function getSafetyRisk(apparent, temp, wind) {
  const t = Number.isFinite(apparent) ? apparent : temp;
  if (!Number.isFinite(t)) return { code: "none", label: "자료 부족", action: "온도 자료 없음" };
  if (t <= -5) return { code: "cold", label: "🥶 한랭 주의", action: "방한장구 착용, 노출부위 보호, 휴식 병행" };
  if (t < 28) return { code: "normal", label: "✅ 보통", action: "일반 작업 가능" };
  if (t < 31) return { code: "caution", label: "🟡 주의", action: "물·그늘·휴식 준비, 작업자 상태 확인" };
  if (t < 33) return { code: "warning", label: "🟠 폭염 주의", action: "주기적 휴식, 고령·신규 작업자 집중 확인" };
  if (t < 35) return { code: "danger", label: "🔴 고위험", action: "작업시간 조정, 2시간 이내 20분 이상 휴식 권장" };
  return { code: "stop", label: "⛔ 매우 위험", action: "옥외작업 단축 또는 중지 검토, 응급조치 체계 확인" };
}

function getHumidityFeel(h) {
  if (!Number.isFinite(h)) return "습도 자료 없음";
  if (h < 30) return "입술이 마르고 피부가 당기는 느낌";
  if (h < 45) return "뽀송뽀송하고 끈적임이 적은 상태";
  if (h < 55) return "생활하기 비교적 좋은 습도";
  if (h < 65) return "덜 마른 빨래를 입은 듯한 느낌";
  if (h < 75) return "끈적이고 땀이 잘 마르지 않음";
  if (h < 85) return "사우나 입구처럼 답답함";
  return "젖은 옷을 입고 있는 듯한 느낌";
}

function getWindFeel(w) {
  if (!Number.isFinite(w)) return "풍속 자료 없음";
  if (w < 1) return "거의 바람 없음";
  if (w < 4) return "살랑이는 바람";
  if (w < 7) return "가벼운 자재 흔들림 가능";
  if (w < 10) return "가설물·비산물 점검 권장";
  return "강풍 수준, 고소작업 및 가설물 주의";
}

function calculateSafetySummary(rows) {
  const valid = rows.filter((r) => Number.isFinite(r.temperature) || Number.isFinite(r.apparentTemperature));
  if (!valid.length) return { tempNow: "-", apparentNow: "-", humidityNow: "-", windNow: "-", riskNow: "자료 부족", recommendation: "온도 안전관리 자료가 부족합니다." };
  const now = valid[0];
  const next24 = valid.slice(0, 24);
  const maxApp = Math.max(...next24.map((r) => Number.isFinite(r.apparentTemperature) ? r.apparentTemperature : -999));
  const high = next24.find((r) => ["danger", "stop"].includes(r.safetyCode));
  let recommendation = "향후 24시간 기준 온도 위험은 비교적 낮습니다. 물·그늘·휴식 준비는 기본으로 유지하세요.";
  if (high) recommendation = `향후 24시간 내 ${high.hour} 전후 체감온도 위험이 높습니다. 작업시간 조정과 휴식계획을 먼저 확인하세요.`;
  else if (maxApp >= 31) recommendation = "향후 24시간 내 폭염 주의 시간대가 있습니다. 주기적 휴식과 작업자 상태 확인이 필요합니다.";
  return {
    tempNow: `${fmt(now.temperature, 1)}℃`,
    apparentNow: `${fmt(now.apparentTemperature, 1)}℃`,
    humidityNow: `${fmt(now.humidity, 0)}%`,
    windNow: `${fmt(now.windSpeed, 1)} m/s`,
    riskNow: now.safetyLabel,
    recommendation
  };
}
function fmt(v, d) { return Number.isFinite(v) ? v.toFixed(d) : "-"; }

function convertLatLonToGrid(lat, lon) {
  const RE=6371.00877, GRID=5.0, SLAT1=30.0, SLAT2=60.0, OLON=126.0, OLAT=38.0, XO=43, YO=136;
  const DEGRAD=Math.PI/180.0, re=RE/GRID;
  const slat1=SLAT1*DEGRAD, slat2=SLAT2*DEGRAD, olon=OLON*DEGRAD, olat=OLAT*DEGRAD;
  let sn=Math.tan(Math.PI*0.25+slat2*0.5)/Math.tan(Math.PI*0.25+slat1*0.5);
  sn=Math.log(Math.cos(slat1)/Math.cos(slat2))/Math.log(sn);
  let sf=Math.tan(Math.PI*0.25+slat1*0.5);
  sf=Math.pow(sf,sn)*Math.cos(slat1)/sn;
  let ro=Math.tan(Math.PI*0.25+olat*0.5);
  ro=re*sf/Math.pow(ro,sn);
  let ra=Math.tan(Math.PI*0.25+lat*DEGRAD*0.5);
  ra=re*sf/Math.pow(ra,sn);
  let theta=lon*DEGRAD-olon;
  if(theta>Math.PI) theta-=2.0*Math.PI;
  if(theta<-Math.PI) theta+=2.0*Math.PI;
  theta*=sn;
  return {nx:Math.floor(ra*Math.sin(theta)+XO+0.5),ny:Math.floor(ro-ra*Math.cos(theta)+YO+0.5)};
}
function getKmaBaseDateTime(){ const now=new Date(Date.now()+9*3600000); now.setUTCHours(now.getUTCHours()-1); const baseTimes=[2,5,8,11,14,17,20,23]; let selectedHour=23; for(const h of baseTimes) if(now.getUTCHours()>=h) selectedHour=h; if(now.getUTCHours()<2){ now.setUTCDate(now.getUTCDate()-1); selectedHour=23; } const yyyy=now.getUTCFullYear(); const mm=String(now.getUTCMonth()+1).padStart(2,"0"); const dd=String(now.getUTCDate()).padStart(2,"0"); return {baseDate:`${yyyy}${mm}${dd}`,baseTime:`${String(selectedHour).padStart(2,"0")}00`}; }
function getKmaMidBaseTime(){ const now=new Date(Date.now()+9*3600000); let hour=now.getUTCHours(); let baseHour="1800"; if(hour>=8&&hour<20) baseHour="0600"; else if(hour<8){ now.setUTCDate(now.getUTCDate()-1); baseHour="1800"; } const yyyy=now.getUTCFullYear(); const mm=String(now.getUTCMonth()+1).padStart(2,"0"); const dd=String(now.getUTCDate()).padStart(2,"0"); return `${yyyy}${mm}${dd}${baseHour}`; }
function getKmaMidLandRegion(name,lat,lon){ const t=String(name||""); if(t.includes("서울")||t.includes("인천")||t.includes("경기")) return {regId:"11B00000",label:"수도권"}; if(t.includes("강원")) return lon>=128.2?{regId:"11D20000",label:"강원영동"}:{regId:"11D10000",label:"강원영서"}; if(t.includes("충북")) return {regId:"11C10000",label:"충북권"}; if(t.includes("충남")||t.includes("대전")||t.includes("세종")) return {regId:"11C20000",label:"충남권"}; if(t.includes("전북")||t.includes("김제")||t.includes("전주")||t.includes("익산")||t.includes("군산")||t.includes("정읍")||t.includes("완주")) return {regId:"11F10000",label:"전북권"}; if(t.includes("전남")||t.includes("광주")) return {regId:"11F20000",label:"전남권"}; if(t.includes("경북")||t.includes("대구")) return {regId:"11H10000",label:"경북권"}; if(t.includes("경남")||t.includes("부산")||t.includes("울산")) return {regId:"11H20000",label:"경남권"}; if(t.includes("제주")) return {regId:"11G00000",label:"제주권"}; if(lat>=35.3&&lat<36.2&&lon<127.7) return {regId:"11F10000",label:"전북권"}; return {regId:"11F10000",label:"전북권"}; }
function getKstDateOnly(date){ const kst=new Date(date.getTime()+9*3600000); return new Date(Date.UTC(kst.getUTCFullYear(),kst.getUTCMonth(),kst.getUTCDate())); }
function parseKstDateOnly(dateText){ const [y,m,d]=dateText.split("-").map(Number); return new Date(Date.UTC(y,m-1,d)); }

async function handleGeocode(request){ const url=new URL(request.url); const q=(url.searchParams.get("q")||"").trim(); if(!q) return jsonResponse(request,{ok:false,results:[]},400); const cacheKey=new Request(`${url.origin}/cache/geocode/${encodeURIComponent(q)}`); const cache=caches.default; const cached=await cache.match(cacheKey); if(cached) return new Response(cached.body,{status:200,headers:{...corsHeaders(request),"Content-Type":"application/json; charset=utf-8","Cache-Control":`public, max-age=${GEOCODE_CACHE_SECONDS}`}}); const target=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q+" 대한민국")}&countrycodes=kr&format=jsonv2&limit=10&accept-language=ko`; const res=await fetch(target,{headers:{"User-Agent":"GUI's Arc Construction Field Guide v4.2"}}); if(!res.ok) throw new Error(`지역 검색 실패: ${res.status}`); const json=await res.json(); const data={ok:true,query:q,results:json.map((item)=>({name:item.display_name,lat:Number(item.lat),lon:Number(item.lon)})).filter((i)=>Number.isFinite(i.lat)&&Number.isFinite(i.lon))}; await cache.put(cacheKey,new Response(JSON.stringify(data),{headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":`public, max-age=${GEOCODE_CACHE_SECONDS}`}})); return jsonResponse(request,data,200,GEOCODE_CACHE_SECONDS); }
async function handleReverse(request){ const url=new URL(request.url); const lat=Number(url.searchParams.get("lat")); const lon=Number(url.searchParams.get("lon")); if(!Number.isFinite(lat)||!Number.isFinite(lon)) return jsonResponse(request,{ok:false,message:"lat, lon 값이 필요합니다."},400); const target=`https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=jsonv2&accept-language=ko`; const res=await fetch(target,{headers:{"User-Agent":"GUI's Arc Construction Field Guide v4.2"}}); if(!res.ok) throw new Error(`역지오코딩 실패: ${res.status}`); const json=await res.json(); const a=json.address||{}; const detail=[a.state,a.county,a.city,a.town,a.village,a.suburb,a.neighbourhood].filter(Boolean).filter((v,i,arr)=>arr.indexOf(v)===i).join(" "); return jsonResponse(request,{ok:true,name:detail||json.display_name||"지도 선택 좌표",lat,lon}); }



/* =========================================================
   GUI's Arc v6.2.1 KOSHA Accident API - FINAL FIX
   ========================================================= */

async function handleAccidents(request, env) {
  const url = new URL(request.url);
  const business = url.searchParams.get("business") || "건설업";
  const keyword = url.searchParams.get("keyword") || "";
  const pageNo = url.searchParams.get("pageNo") || "1";
  const numOfRows = Math.min(Number(url.searchParams.get("numOfRows") || 10), 10);

  const apiKey = env.KOSHA_API_KEY || env.KMA_API_KEY;
  if (!apiKey) {
    return jsonResponse(request, {
      ok: false,
      message: "KOSHA_API_KEY 또는 KMA_API_KEY Secret이 없습니다.",
      rows: [],
      brand: BRAND
    }, 500);
  }

  const cacheKey = new Request(`${url.origin}/cache/kosha-accidents-v621/${encodeURIComponent(business)}/${encodeURIComponent(keyword)}/${pageNo}/${numOfRows}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const json = await cached.json();
    if (json.meta) json.meta.cached = true;
    return jsonResponse(request, json, 200, 300);
  }

  const apiUrl = new URL("https://apis.data.go.kr/B552468/disaster_api01");
  apiUrl.searchParams.set("ServiceKey", apiKey);
  apiUrl.searchParams.set("serviceKey", apiKey);
  apiUrl.searchParams.set("business", business);
  apiUrl.searchParams.set("keyword", keyword);
  apiUrl.searchParams.set("pageNo", String(pageNo));
  apiUrl.searchParams.set("numOfRows", String(numOfRows));
  apiUrl.searchParams.set("callApiId", "국내재해사례 게시판 조회");

  const res = await fetch(apiUrl.toString(), {
    headers: { "Accept": "application/json, text/plain, */*" }
  });
  const text = await res.text();

  if (!res.ok) {
    return jsonResponse(request, {
      ok: false,
      message: `KOSHA API HTTP ${res.status}`,
      raw: text.slice(0, 1000),
      rows: [],
      brand: BRAND
    }, 502);
  }

  const parsed = parseKoshaMaybeJson(text);
  const items = extractKoshaItems(parsed);
  const rows = [];

  for (const item of items.slice(0, numOfRows)) {
    const row = normalizeKoshaAccident(item);
    if (row.boardNo) {
      row.attachments = await fetchKoshaAttachments(apiKey, row.boardNo);
    } else {
      row.attachments = [];
    }
    rows.push(row);
  }

  const result = {
    ok: true,
    brand: BRAND,
    meta: {
      source: "KOSHA 국내재해사례 게시판 정보 조회서비스",
      cached: false,
      generatedAt: new Date().toISOString(),
      business,
      keyword,
      pageNo,
      numOfRows,
      rawItemCount: items.length
    },
    rows
  };

  await cache.put(cacheKey, new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  }));

  return jsonResponse(request, result, 200, 300);
}

function parseKoshaMaybeJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return { rawText: text };
  }
}

function extractKoshaItems(parsed) {
  if (!parsed) return [];

  const candidates = [
    parsed?.response?.body?.items?.item,
    parsed?.response?.body?.items,
    parsed?.body?.items?.item,
    parsed?.body?.items,
    parsed?.items?.item,
    parsed?.items,
    parsed?.item,
    parsed?.data,
    parsed?.list
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
    if (c && typeof c === "object") return [c];
  }

  // XML/text fallback: API may return XML in some cases.
  if (parsed.rawText) {
    const blocks = [...String(parsed.rawText).matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
    return blocks.map(block => {
      const obj = {};
      [...block.matchAll(/<([^\/][^>]*)>([\s\S]*?)<\/\1>/g)].forEach(m => {
        obj[m[1]] = stripKoshaHtml(m[2]);
      });
      return obj;
    });
  }

  return [];
}

function pickKosha(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") {
      return String(obj[k]).trim();
    }
  }
  return "";
}

function normalizeKoshaAccident(item) {
  const title = pickKosha(item, ["title", "ttl", "subject", "sj", "bbsSj", "nttSj", "boardTitle"]);
  const content = stripKoshaHtml(pickKosha(item, ["content", "contents", "cn", "bbsCn", "nttCn", "summary", "detail"]));
  const boardNo = pickKosha(item, ["boardno", "boardNo", "bbsNo", "nttId", "nttNo", "seq", "id", "no"]);
  const publishedAt = normalizeKoshaDate(pickKosha(item, ["regDate", "regDt", "rgsde", "writngDe", "createDate", "createdAt", "date"]));
  const fullText = `${title}\n${content}`;

  const occurredAt = extractKoshaOccurredAt(fullText) || "";
  const region = extractKoshaRegion(fullText) || "공식 원문 확인";
  const accidentType = inferKoshaAccidentType(fullText);
  const trade = inferKoshaTrade(fullText);
  const cause = extractKoshaCause(fullText) || "공식 원문 확인";

  return {
    boardNo,
    title: title || "국내재해사례",
    occurredAt: occurredAt || "공식 원문 확인",
    publishedAt: publishedAt || "공식 원문 확인",
    region,
    trade,
    accidentType,
    cause,
    checks: buildKoshaAccidentChecks(accidentType),
    sourceUrl: "https://portal.kosha.or.kr/archive/disaster-case/accident-case/acccase-industry/construc-industry",
    raw: item
  };
}

async function fetchKoshaAttachments(apiKey, boardNo) {
  try {
    const url = new URL("https://apis.data.go.kr/B552468/disaster_api02");
    url.searchParams.set("ServiceKey", apiKey);
    url.searchParams.set("serviceKey", apiKey);
    url.searchParams.set("boardno", boardNo);
    url.searchParams.set("boardNo", boardNo);
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("numOfRows", "10");
    url.searchParams.set("callApiId", "국내재해사례 게시판 첨부파일 조회");

    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json, text/plain, */*" }
    });
    const text = await res.text();
    if (!res.ok) return [];

    const parsed = parseKoshaMaybeJson(text);
    const items = extractKoshaItems(parsed);
    return items.map((x) => ({
      boardNo: pickKosha(x, ["boardno", "boardNo"]) || boardNo,
      fileName: pickKosha(x, ["filenm", "fileNm", "filename", "fileName", "atchFileNm"]),
      filePath: pickKosha(x, ["filepath", "filePath", "path", "url", "atchFileUrl", "downloadUrl"])
    })).filter(x => x.fileName || x.filePath);
  } catch (e) {
    return [];
  }
}

function stripKoshaHtml(text) {
  return String(text || "")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKoshaDate(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  const m = s.match(/(20\d{2})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})(?:[일\s]*(\d{1,2})[:시](\d{1,2})?)?/);
  if (!m) return s;
  const y = m[1];
  const mo = String(m[2]).padStart(2, "0");
  const d = String(m[3]).padStart(2, "0");
  const h = m[4] ? String(m[4]).padStart(2, "0") : "";
  const mi = m[5] ? String(m[5]).padStart(2, "0") : "";
  return h ? `${y}-${mo}-${d} ${h}:${mi || "00"}` : `${y}-${mo}-${d}`;
}

function extractKoshaOccurredAt(text) {
  const s = String(text || "");
  const patterns = [
    /(?:발생일시|재해발생일시|사고일시|재해일시|발생일|사고일)\s*[:：]?\s*(20\d{2}[.\-/년\s]*\d{1,2}[.\-/월\s]*\d{1,2}(?:[일\s]*(?:\d{1,2})[:시](?:\d{1,2})?)?)/,
    /(20\d{2}[.\-/년\s]*\d{1,2}[.\-/월\s]*\d{1,2}[일\s]*(?:\d{1,2})[:시](?:\d{1,2})?)/
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return normalizeKoshaDate(m[1]);
  }
  return "";
}

function extractKoshaRegion(text) {
  const s = String(text || "");
  const regions = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
  for (const r of regions) {
    const m = s.match(new RegExp(`${r}[가-힣\\s]{0,12}(?:시|군|구)?`));
    if (m) return m[0].trim();
  }
  return "";
}

function inferKoshaAccidentType(text) {
  const s = String(text || "");
  const rules = [
    ["추락", /추락|떨어|개구부|비계|지붕|고소/],
    ["끼임·협착", /끼임|협착|깔림|장비|후진|지게차|굴착기/],
    ["붕괴", /붕괴|무너|굴착면|흙막이|동바리/],
    ["낙하·맞음", /낙하|맞음|인양물|자재.*떨어|비래/],
    ["전도·전복", /전도|전복|크레인|고소작업대/],
    ["감전", /감전|전기|누전/],
    ["화재·폭발", /화재|폭발|용접|불티/],
    ["질식·중독", /질식|중독|밀폐|유기용제/],
    ["분진·비산", /분진|면갈이|견출|절단/]
  ];
  const found = rules.find(([_, re]) => re.test(s));
  return found ? found[0] : "공식 원문 확인";
}

function inferKoshaTrade(text) {
  const s = String(text || "");
  const rules = [
    ["철근공사", /철근/],
    ["거푸집·동바리", /거푸집|동바리/],
    ["콘크리트 타설", /콘크리트|타설|레미콘/],
    ["굴착·토공", /굴착|토공|흙막이/],
    ["크레인·양중", /크레인|양중|인양/],
    ["지게차하역", /지게차|하역|팔레트/],
    ["비계·가설", /비계|가설|작업발판/],
    ["철골공사", /철골|H형강/],
    ["방수·도장", /방수|도장|유기용제/],
    ["견출·면갈이", /견출|면갈이|분진/]
  ];
  const found = rules.find(([_, re]) => re.test(s));
  return found ? found[0] : "건설업";
}

function extractKoshaCause(text) {
  const s = String(text || "");
  const m = s.match(/(?:원인|주요 원인|발생 원인)\s*[:：]?\s*([^。.\n]{8,80})/);
  return m ? m[1].trim() : "";
}

function buildKoshaAccidentChecks(type) {
  const base = {
    "추락": ["개구부·단부 난간 확인", "안전대 체결 확인", "작업발판 고정상태 확인", "상하동시작업 통제", "추락위험 TBM 실시"],
    "끼임·협착": ["장비 작업반경 출입통제", "신호수 배치", "후진동선 분리", "회전체 방호덮개 확인", "협착위험 구간 접근금지"],
    "붕괴": ["굴착면·동바리 변형 확인", "우수 유입 차단", "해체·설치 순서 준수", "작업 전 지반상태 확인", "이상징후 즉시 작업중지"],
    "낙하·맞음": ["인양물 하부 출입금지", "낙하물 방지조치 확인", "자재 적재상태 확인", "줄걸이·샤클 점검", "작업반경 통제"],
    "전도·전복": ["아웃트리거·받침판 확인", "지반 지지력 확인", "풍속 기준 확인", "과적 금지", "장비 전도위험 TBM"],
    "감전": ["누전차단기 확인", "임시전선 피복상태 확인", "접지 확인", "우천 시 전기공구 사용 제한", "분전반 잠금관리"],
    "화재·폭발": ["화기작업 허가", "소화기 배치", "가연물 제거", "불티 비산방지포 설치", "작업 후 잔불 확인"],
    "질식·중독": ["환기 실시", "가스농도 측정", "보호구 착용", "감시인 배치", "밀폐공간 출입허가 확인"],
    "분진·비산": ["집진기·습식작업 적용", "방진마스크 착용", "보안경 착용", "작업구역 격리", "작업 후 청소"]
  };
  return base[type] || ["공식 원문 확인", "작업 전 위험성평가", "TBM 실시", "관리감독자 확인", "유사사고 예방대책 공유"];
}


/* =========================================================
   GUI's Arc v6.3 AI Field Assistant API
   ========================================================= */
async function handleAiAssistant(request, env) {
  const url = new URL(request.url);
  const trades = (url.searchParams.get("trades") || "").split(",").map(x => x.trim()).filter(Boolean);
  const weatherRisk = url.searchParams.get("weatherRisk") || "normal";

  const accidentTop5 = buildAiAccidentTop5(trades, weatherRisk);
  const qualityTop3 = buildAiQualityTop3(trades);
  const inspectionTop3 = buildAiInspectionTop3(trades);

  return jsonResponse(request, {
    ok: true,
    brand: BRAND,
    meta: { generatedAt: new Date().toISOString(), trades, weatherRisk },
    assistant: {
      summary: trades.length ? `선택 공종(${trades.join(", ")}) 기준으로 사고위험, 품질문제, 감리지적 가능성을 확인하세요.` : "공종을 선택하면 AI 현장비서 판단이 표시됩니다.",
      accidentTop5,
      qualityTop3,
      inspectionTop3,
      tbm: buildAiTbm(accidentTop5, qualityTop3, inspectionTop3)
    }
  });
}

function buildAiAccidentTop5(trades, weatherRisk) {
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

function buildAiQualityTop3(trades) {
  const text = trades.join(" ");
  const list = [];
  if (/콘크리트|타설|레미콘/.test(text)) list.push("콘크리트 품질: 슬럼프·공기량·공시체·강우 보양 확인");
  if (/철근/.test(text)) list.push("철근 품질: 피복두께·정착길이·이음길이·간격 확인");
  if (/방수/.test(text)) list.push("방수 품질: 바탕면 건조·습도·로트·두께 확인");
  if (/도장/.test(text)) list.push("도장 품질: 습도·표면처리·도막두께 확인");
  if (/철골/.test(text)) list.push("철골 품질: 부재번호·볼트·용접부·도장손상 확인");
  return [...new Set(list.length ? list : ["선택 공종의 시방서·검측·사진기록 확인"])].slice(0, 3);
}

function buildAiInspectionTop3(trades) {
  const text = trades.join(" ");
  const list = ["검측 전 후속공정 진행 금지", "시공 전·중·후 사진 누락 방지"];
  if (/콘크리트|타설/.test(text)) list.push("강우 시 감리 승인·보양계획·추가 공시체 기록");
  if (/철근/.test(text)) list.push("철근 배근 검측 전 타설 금지");
  if (/방수/.test(text)) list.push("방수 바탕면 건조 확인 및 담수시험 기록");
  return [...new Set(list)].slice(0, 3);
}

function buildAiTbm(accidentTop5, qualityTop3, inspectionTop3) {
  return [
    "📋 AI 현장비서 TBM", "",
    "사고위험 TOP", ...accidentTop5.map(x => `□ ${x}`), "",
    "품질 중점관리", ...qualityTop3.map(x => `□ ${x}`), "",
    "감리지적 예방", ...inspectionTop3.map(x => `□ ${x}`)
  ].join("\n");
}
