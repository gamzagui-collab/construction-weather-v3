const WORKER_BASE_URL = "https://weather-proxy.gamzagui.workers.dev";
async function searchRegionByWorker(keyword) {
  const response = await fetch(`${WORKER_BASE_URL}/geocode?q=${encodeURIComponent(keyword)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`지역 검색 실패: ${response.status}`);
  return await response.json();
}
async function reverseGeocodeByWorker(lat, lon) {
  const url = `${WORKER_BASE_URL}/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`위치명 조회 실패: ${response.status}`);
  return await response.json();
}
async function fetchForecastFromWorker({ lat, lon, name }) {
  const url = `${WORKER_BASE_URL}/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&name=${encodeURIComponent(name || "선택 위치")}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`예보 조회 실패: ${response.status} ${await response.text()}`);
  const json = await response.json();
  if (!json.ok) throw new Error(json.message || "Worker 예보 응답 오류");
  return json;
}
function parseCoordInput(input) {
  const value = input.trim();
  if (!value) return null;
  const match = value.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
  if (!match) return null;
  return { name: "직접 입력 좌표", lat: Number(match[1]), lon: Number(match[3]) };
}
function getRegionFromLocalKeyword(keyword) {
  const local = findLocalRegionByKeyword(keyword);
  return local ? { name: local.name, lat: local.lat, lon: local.lon, key: local.key, source: "local" } : null;
}
function normalizeGeocodeResult(item) {
  return { name: item.name, lat: item.lat, lon: item.lon, key: `geo_${item.lat}_${item.lon}`, source: "geocode" };
}


async function fetchAccidentsFromWorker({ business = "건설업", keyword = "", pageNo = 1, numOfRows = 10 } = {}) {
  const url = `${WORKER_BASE_URL}/accidents?business=${encodeURIComponent(business)}&keyword=${encodeURIComponent(keyword)}&pageNo=${encodeURIComponent(pageNo)}&numOfRows=${encodeURIComponent(numOfRows)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`사고사례 조회 실패: ${response.status} ${await response.text()}`);
  const json = await response.json();
  if (!json.ok) throw new Error(json.message || "사고사례 응답 오류");
  return json;
}


async function fetchAiAssistantFromWorker({ trades = [], weatherRisk = "normal" } = {}) {
  const tradeParam = Array.isArray(trades) ? trades.join(",") : String(trades || "");
  const url = `${WORKER_BASE_URL}/ai-assistant?trades=${encodeURIComponent(tradeParam)}&weatherRisk=${encodeURIComponent(weatherRisk)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`AI 현장비서 조회 실패: ${response.status} ${await response.text()}`);
  const json = await response.json();
  if (!json.ok) throw new Error(json.message || "AI 현장비서 응답 오류");
  return json;
}
