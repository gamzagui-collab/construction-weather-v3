let currentRows = [];
let currentSafetyRows = [];
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
  initDarkMode(); initClock(); initRegionSelect(); initTabs(); initMap(); applySharedParams();
  regionSearch.addEventListener("input", handleRegionInput);
  regionResult.addEventListener("change", handleRegionSelect);
  searchBtn.addEventListener("click", handleSearch);
  csvBtn.addEventListener("click", () => downloadCsv(currentRows));
  printBtn.addEventListener("click", () => window.print());
  darkModeBtn.addEventListener("click", toggleDarkMode);
  shareBtn.addEventListener("click", copyShareLink);
  handleSearch();
}
function initClock(){ updateCurrentTime(); setInterval(updateCurrentTime,1000); }
function initTabs(){
  document.querySelectorAll(".tab-btn").forEach((btn)=>{
    btn.addEventListener("click",()=>{
      const target=btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach((b)=>b.classList.toggle("active",b===btn));
      document.querySelectorAll(".tab-panel").forEach((panel)=>panel.classList.toggle("active",panel.id===target));
      if(target==="rainPanel" && rainChart) setTimeout(()=>rainChart.resize(),50);
    });
  });
}
function updateCurrentTime(){ const el=document.getElementById("currentTime"); if(el) el.textContent=`현재 시각: ${new Date().toLocaleString("ko-KR")}`; }
function initDarkMode(){ const saved=localStorage.getItem("darkMode"); document.body.classList.toggle("dark", saved==="on"); darkModeBtn.textContent=saved==="on"?"라이트모드":"다크모드"; }
function toggleDarkMode(){ const isDark=!document.body.classList.contains("dark"); document.body.classList.toggle("dark",isDark); localStorage.setItem("darkMode",isDark?"on":"off"); darkModeBtn.textContent=isDark?"라이트모드":"다크모드"; }
function initRegionSelect(){
  regionResult.innerHTML="";
  REGION_LIST.forEach((region)=>{ const loc={name:region.name,lat:region.lat,lon:region.lon,key:region.key,source:"local"}; const option=document.createElement("option"); option.value=JSON.stringify(loc); option.textContent=region.name; regionResult.appendChild(option); });
  const d=REGION_MAP[DEFAULT_REGION_KEY]; currentLocation={name:d.name,lat:d.lat,lon:d.lon,key:d.key,source:"local"}; regionSearch.value=d.name; setRegionResultSingle(currentLocation); renderLocationInfo(currentLocation);
}
function applySharedParams(){
  const p=new URLSearchParams(window.location.search); const lat=p.get("lat"), lon=p.get("lon"), name=p.get("name"), region=p.get("region");
  if(lat&&lon){ currentLocation={name:name||"공유 좌표",lat:Number(lat),lon:Number(lon),key:"shared",source:"shared"}; customCoord.value=`${currentLocation.lat},${currentLocation.lon}`; regionSearch.value=currentLocation.name; setRegionResultSingle(currentLocation); renderLocationInfo(currentLocation); return; }
  if(region&&REGION_MAP[region]){ const r=REGION_MAP[region]; currentLocation={name:r.name,lat:r.lat,lon:r.lon,key:r.key,source:"local"}; regionSearch.value=r.name; customCoord.value=""; setRegionResultSingle(currentLocation); renderLocationInfo(currentLocation); }
}
function setRegionResultSingle(location){ regionResult.innerHTML=""; const option=document.createElement("option"); option.value=JSON.stringify(location); option.textContent=location.name; regionResult.appendChild(option); regionResult.value=option.value; }
function setRegionResultList(list){ regionResult.innerHTML=""; list.forEach((item)=>{ const option=document.createElement("option"); option.value=JSON.stringify(item); option.textContent=item.name; regionResult.appendChild(option); }); if(list.length){ regionResult.selectedIndex=0; currentLocation=list[0]; } }
function handleRegionInput(){
  customCoord.value=""; clearTimeout(debounceTimer);
  debounceTimer=setTimeout(async()=>{ const keyword=regionSearch.value.trim(); if(!keyword) return; const local=getRegionFromLocalKeyword(keyword); if(local){ setRegionResultList([local]); return; } try{ const geo=await searchRegionByWorker(keyword); if(geo.ok&&geo.results?.length) setRegionResultList(geo.results.map(normalizeGeocodeResult)); }catch(e){ console.warn("지역 검색 실패:",e); } },500);
}
function handleRegionSelect(){
  if(!regionResult.value) return;
  try{ currentLocation=JSON.parse(regionResult.value); customCoord.value=""; regionSearch.value=currentLocation.name; moveMapTo(currentLocation.lat,currentLocation.lon); updateWindyMap(currentLocation.lat,currentLocation.lon); renderLocationInfo(currentLocation); }catch(e){ console.warn("지역 선택 파싱 실패:",e); }
}
async function handleSearch(){
  searchBtn.disabled=true; searchBtn.textContent="조회 중...";
  try{
    const coord=parseCoordInput(customCoord.value);
    if(coord){ currentLocation={...coord,key:"custom",source:"coordinate"}; regionSearch.value=currentLocation.name; setRegionResultSingle(currentLocation); }
    if(!currentLocation){ const d=REGION_MAP[DEFAULT_REGION_KEY]; currentLocation={name:d.name,lat:d.lat,lon:d.lon,key:d.key,source:"local"}; regionSearch.value=currentLocation.name; setRegionResultSingle(currentLocation); }
    regionSearch.value=currentLocation.name; renderLocationInfo(currentLocation); moveMapTo(currentLocation.lat,currentLocation.lon); updateWindyMap(currentLocation.lat,currentLocation.lon);
    const forecast=await fetchForecastFromWorker(currentLocation); currentRows=forecast.rows||[]; currentSafetyRows=forecast.safetyRows||[];
    renderSummary(forecast.summary||{}); renderTable(currentRows); renderChart(currentRows); renderSafetySummary(forecast.safetySummary||{}); renderSafetyTable(currentSafetyRows); renderBrandInfo(forecast.brand,forecast.meta);
    console.log("API 상태:", forecast.status);
  }catch(e){ console.error("예보 조회 실패:",e); alert(e.message||"예보 조회에 실패했습니다."); }
  finally{ searchBtn.disabled=false; searchBtn.textContent="예보 조회"; }
}
function initMap(){
  const d=REGION_MAP[DEFAULT_REGION_KEY]; selectMap=L.map("selectMap").setView([d.lat,d.lon],10); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"&copy; OpenStreetMap"}).addTo(selectMap); selectMarker=L.marker([d.lat,d.lon]).addTo(selectMap);
  selectMap.on("click", async (event)=>{ const lat=Number(event.latlng.lat.toFixed(6)); const lon=Number(event.latlng.lng.toFixed(6)); let placeName="지도 선택 좌표"; try{ const reverse=await reverseGeocodeByWorker(lat,lon); if(reverse.ok&&reverse.name) placeName=reverse.name; }catch(e){ console.warn("역지오코딩 실패:",e); }
    currentLocation={name:placeName,lat,lon,key:"map",source:"map"}; customCoord.value=`${lat},${lon}`; regionSearch.value=placeName; setRegionResultSingle(currentLocation); moveMapTo(lat,lon); updateWindyMap(lat,lon); renderLocationInfo(currentLocation);
  });
  updateWindyMap(d.lat,d.lon);
}
function moveMapTo(lat,lon){ if(!selectMap||!selectMarker) return; selectMap.setView([lat,lon],10); selectMarker.setLatLng([lat,lon]); }
function copyShareLink(){ if(!currentLocation) return alert("공유할 위치가 없습니다."); const url=new URL(window.location.href); url.search=""; if(currentLocation.source==="local"&&currentLocation.key){ url.searchParams.set("region",currentLocation.key); } else { url.searchParams.set("lat",currentLocation.lat); url.searchParams.set("lon",currentLocation.lon); url.searchParams.set("name",currentLocation.name); } navigator.clipboard.writeText(url.toString()).then(()=>alert("공유 링크가 복사되었습니다.")).catch(()=>prompt("아래 링크를 복사하세요.",url.toString())); }
document.addEventListener("DOMContentLoaded", init);
