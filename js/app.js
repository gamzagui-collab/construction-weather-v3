let currentRows = [];
let currentLocation = null;
let selectMap = null;
let selectMarker = null;
let debounceTimer = null;

const regionSearch = document.getElementById("regionSearch");
const regionResult = document.getElementById("regionResult");
const customCoord = document.getElementById("customCoord");
const searchBtn = document.getElementById("searchBtn");
const csvBtn = document.getElementById("csvBtn");
const printBtn = document.getElementById("printBtn");
const darkModeBtn = document.getElementById("darkModeBtn");
const shareBtn = document.getElementById("shareBtn");

function init() {
  initDarkMode();
  initClock();
  initRegionSelect();
  initMap();
  applySharedParams();

  regionSearch.addEventListener("input", handleRegionInput);
  regionResult.addEventListener("change", handleRegionSelect);
  searchBtn.addEventListener("click", handleSearch);
  csvBtn.addEventListener("click", () => downloadCsv(currentRows));
  printBtn.addEventListener("click", () => window.print());
  darkModeBtn.addEventListener("click", toggleDarkMode);
  shareBtn.addEventListener("click", copyShareLink);

  handleSearch();
}

function initClock() {
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);
}

function updateCurrentTime() {
  const now = new Date();
  const el = document.getElementById("currentTime");

  if (el) {
    el.textContent = `현재 시각: ${now.toLocaleString("ko-KR")}`;
  }
}

function initDarkMode() {
  const saved = localStorage.getItem("darkMode");

  if (saved === "on") {
    document.body.classList.add("dark");
    darkModeBtn.textContent = "라이트모드";
  } else {
    document.body.classList.remove("dark");
    darkModeBtn.textContent = "다크모드";
  }
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");

  localStorage.setItem("darkMode", isDark ? "on" : "off");
  darkModeBtn.textContent = isDark ? "라이트모드" : "다크모드";
}

function initRegionSelect() {
  regionResult.innerHTML = "";

  REGION_LIST.forEach((region) => {
    const option = document.createElement("option");

    option.value = JSON.stringify({
      name: region.name,
      lat: region.lat,
      lon: region.lon,
      key: region.key,
      source: "local"
    });

    option.textContent = region.name;

    regionResult.appendChild(option);
  });

  const defaultRegion = REGION_MAP[DEFAULT_REGION_KEY];

  regionSearch.value = defaultRegion.name;
  regionResult.value = JSON.stringify({
    name: defaultRegion.name,
    lat: defaultRegion.lat,
    lon: defaultRegion.lon,
    key: defaultRegion.key,
    source: "local"
  });

  currentLocation = {
    name: defaultRegion.name,
    lat: defaultRegion.lat,
    lon: defaultRegion.lon,
    key: defaultRegion.key,
    source: "local"
  };
}

function applySharedParams() {
  const params = new URLSearchParams(window.location.search);

  const lat = params.get("lat");
  const lon = params.get("lon");
  const name = params.get("name");
  const region = params.get("region");

  if (lat && lon) {
    const location = {
      name: name || "공유 좌표",
      lat: Number(lat),
      lon: Number(lon),
      key: "shared",
      source: "shared"
    };

    currentLocation = location;
    customCoord.value = `${location.lat},${location.lon}`;
    regionSearch.value = location.name;
    setRegionResultSingle(location);
    return;
  }

  if (region && REGION_MAP[region]) {
    const local = REGION_MAP[region];

    const location = {
      name: local.name,
      lat: local.lat,
      lon: local.lon,
      key: local.key,
      source: "local"
    };

    currentLocation = location;
    regionSearch.value = local.name;
    setRegionResultSingle(location);
  }
}

function setRegionResultSingle(location) {
  regionResult.innerHTML = "";

  const option = document.createElement("option");

  option.value = JSON.stringify(location);
  option.textContent = location.name;

  regionResult.appendChild(option);
  regionResult.value = option.value;
}

function handleRegionInput() {
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    const keyword = regionSearch.value.trim();

    if (!keyword) return;

    const local = getRegionFromLocalKeyword(keyword);

    if (local) {
      setRegionResultList([local]);
      return;
    }

    try {
      const geo = await searchRegionByWorker(keyword);

      if (geo.ok && geo.results.length) {
        const normalized = geo.results.map(normalizeGeocodeResult);
        setRegionResultList(normalized);
      }
    } catch (error) {
      console.warn("지역 검색 실패:", error);
    }
  }, 500);
}

function setRegionResultList(list) {
  regionResult.innerHTML = "";

  list.forEach((item) => {
    const option = document.createElement("option");

    option.value = JSON.stringify(item);
    option.textContent = item.name;

    regionResult.appendChild(option);
  });

  if (list.length) {
    regionResult.selectedIndex = 0;
    currentLocation = list[0];
  }
}

function handleRegionSelect() {
  if (!regionResult.value) return;

  try {
    currentLocation = JSON.parse(regionResult.value);
    regionSearch.value = currentLocation.name;
    customCoord.value = "";

    moveMapTo(currentLocation.lat, currentLocation.lon);
    updateWindyMap(currentLocation.lat, currentLocation.lon);
  } catch (error) {
    console.warn("지역 선택 파싱 실패:", error);
  }
}

async function handleSearch() {
  searchBtn.disabled = true;
  searchBtn.textContent = "조회 중...";

  try {
    const coord = parseCoordInput(customCoord.value);

    if (coord) {
      currentLocation = {
        ...coord,
        key: "custom",
        source: "coordinate"
      };
      regionSearch.value = currentLocation.name;
      setRegionResultSingle(currentLocation);
    }

    if (!currentLocation) {
      const defaultRegion = REGION_MAP[DEFAULT_REGION_KEY];

      currentLocation = {
        name: defaultRegion.name,
        lat: defaultRegion.lat,
        lon: defaultRegion.lon,
        key: defaultRegion.key,
        source: "local"
      };
    }

    moveMapTo(currentLocation.lat, currentLocation.lon);
    updateWindyMap(currentLocation.lat, currentLocation.lon);

    const forecast = await fetchForecastFromWorker(currentLocation);

    currentRows = forecast.rows || [];

    renderSummary(forecast.summary || {});
    renderTable(currentRows);
    renderChart(currentRows);
    renderBrandInfo(forecast.brand, forecast.meta);

    console.log("API 상태:", forecast.status);
  } catch (error) {
    console.error("예보 조회 실패:", error);
    alert(error.message || "예보 조회에 실패했습니다.");
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "예보 조회";
  }
}

function initMap() {
  const defaultRegion = REGION_MAP[DEFAULT_REGION_KEY];

  selectMap = L.map("selectMap").setView(
    [defaultRegion.lat, defaultRegion.lon],
    10
  );

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap"
  }).addTo(selectMap);

  selectMarker = L.marker([defaultRegion.lat, defaultRegion.lon]).addTo(selectMap);

  selectMap.on("click", async (event) => {
    const lat = Number(event.latlng.lat.toFixed(6));
    const lon = Number(event.latlng.lng.toFixed(6));

    currentLocation = {
      name: "지도 선택 좌표",
      lat,
      lon,
      key: "map",
      source: "map"
    };

    customCoord.value = `${lat},${lon}`;
    regionSearch.value = currentLocation.name;
    setRegionResultSingle(currentLocation);

    moveMapTo(lat, lon);
    updateWindyMap(lat, lon);
  });

  updateWindyMap(defaultRegion.lat, defaultRegion.lon);
}

function moveMapTo(lat, lon) {
  if (!selectMap || !selectMarker) return;

  selectMap.setView([lat, lon], 10);
  selectMarker.setLatLng([lat, lon]);
}

function copyShareLink() {
  if (!currentLocation) {
    alert("공유할 위치가 없습니다.");
    return;
  }

  const url = new URL(window.location.href);

  url.search = "";

  if (currentLocation.source === "local" && currentLocation.key) {
    url.searchParams.set("region", currentLocation.key);
  } else {
    url.searchParams.set("lat", currentLocation.lat);
    url.searchParams.set("lon", currentLocation.lon);
    url.searchParams.set("name", currentLocation.name);
  }

  navigator.clipboard.writeText(url.toString())
    .then(() => {
      alert("공유 링크가 복사되었습니다.");
    })
    .catch(() => {
      prompt("아래 링크를 복사하세요.", url.toString());
    });
}

document.addEventListener("DOMContentLoaded", init);