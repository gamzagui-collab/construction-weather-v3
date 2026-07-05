const WORKER_BASE_URL = "https://weather-proxy.gamzagui.workers.dev";

async function searchRegionByWorker(keyword) {
  const url = `${WORKER_BASE_URL}/geocode?q=${encodeURIComponent(keyword)}`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`지역 검색 실패: ${response.status}`);
  }

  return await response.json();
}

async function fetchForecastFromWorker({ lat, lon, name }) {
  const url =
    `${WORKER_BASE_URL}/forecast` +
    `?lat=${encodeURIComponent(lat)}` +
    `&lon=${encodeURIComponent(lon)}` +
    `&name=${encodeURIComponent(name || "선택 위치")}`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`예보 조회 실패: ${response.status} ${text}`);
  }

  const json = await response.json();

  if (!json.ok) {
    throw new Error(json.message || "Worker 예보 응답 오류");
  }

  return json;
}

function parseCoordInput(input) {
  const value = input.trim();

  if (!value) return null;

  const match = value.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);

  if (!match) {
    return null;
  }

  return {
    name: "직접 입력 좌표",
    lat: Number(match[1]),
    lon: Number(match[3])
  };
}

function getRegionFromLocalKeyword(keyword) {
  const local = findLocalRegionByKeyword(keyword);

  if (!local) return null;

  return {
    name: local.name,
    lat: local.lat,
    lon: local.lon,
    key: local.key,
    source: "local"
  };
}

function normalizeGeocodeResult(item) {
  return {
    name: item.name,
    lat: item.lat,
    lon: item.lon,
    key: `geo_${item.lat}_${item.lon}`,
    source: "geocode"
  };
}

async function resolveRegion(keyword, coordInput) {
  const coord = parseCoordInput(coordInput);

  if (coord) {
    return {
      ...coord,
      source: "coordinate"
    };
  }

  const local = getRegionFromLocalKeyword(keyword);

  if (local) {
    return local;
  }

  const geo = await searchRegionByWorker(keyword);

  if (!geo.ok || !geo.results || !geo.results.length) {
    throw new Error(`"${keyword}" 지역을 찾지 못했습니다.`);
  }

  return normalizeGeocodeResult(geo.results[0]);
}

async function reverseGeocodeByWorker(lat, lon) {
  const url =
    `${WORKER_BASE_URL}/reverse` +
    `?lat=${encodeURIComponent(lat)}` +
    `&lon=${encodeURIComponent(lon)}`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`위치명 조회 실패: ${response.status}`);
  }

  return await response.json();
}