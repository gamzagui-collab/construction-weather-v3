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
  initDarkMode(); initClock(); initRegionSelect(); initTabs(); initMap(); initFieldGuideInputs(); applySharedParams();
  regionSearch.addEventListener("input", handleRegionInput);
  regionResult.addEventListener("change", handleRegionSelect);
  searchBtn.addEventListener("click", handleSearch);
  csvBtn.addEventListener("click", () => downloadCsv(currentRows));
  printBtn.addEventListener("click", () => window.print());
  darkModeBtn.addEventListener("click", toggleDarkMode);
  shareBtn.addEventListener("click", copyShareLink);
  handleSearch();
}



function setGuideGroupChecked(selector, checked) {
  document.querySelectorAll(selector).forEach((el) => { el.checked = checked; });
  saveGuideSelections();
  renderFieldGuide(currentRows, currentSafetyRows);
}

function initFieldGuideInputs(){
  restoreGuideSelections();
  document.querySelectorAll(".guide-role,.guide-process").forEach((el)=>{
    el.addEventListener("change",()=>{
      saveGuideSelections();
      renderFieldGuide(currentRows,currentSafetyRows);
    });
  });
  const selectRoles = document.getElementById("selectAllRolesBtn");
  const clearRoles = document.getElementById("clearRolesBtn");
  const selectProcesses = document.getElementById("selectAllProcessesBtn");
  const clearProcesses = document.getElementById("clearProcessesBtn");
  if (selectRoles) selectRoles.addEventListener("click", () => setGuideGroupChecked(".guide-role", true));
  if (clearRoles) clearRoles.addEventListener("click", () => setGuideGroupChecked(".guide-role", false));
  if (selectProcesses) selectProcesses.addEventListener("click", () => setGuideGroupChecked(".guide-process", true));
  if (clearProcesses) clearProcesses.addEventListener("click", () => setGuideGroupChecked(".guide-process", false));

  const copyBtn=document.getElementById("copyTbmBtn");
  if(copyBtn){
    copyBtn.addEventListener("click",()=>{
      const text=document.getElementById("tbmText")?.textContent || "";
      navigator.clipboard.writeText(text).then(()=>alert("TBM 문구가 복사되었습니다.")).catch(()=>prompt("아래 문구를 복사하세요.", text));
    });
  }
}
function saveGuideSelections(){
  const roles=[...document.querySelectorAll(".guide-role:checked")].map((el)=>el.value);
  const processes=[...document.querySelectorAll(".guide-process:checked")].map((el)=>el.value);
  localStorage.setItem("guideRoles", JSON.stringify(roles));
  localStorage.setItem("guideProcesses", JSON.stringify(processes));
}
function restoreGuideSelections(){
  const roles=JSON.parse(localStorage.getItem("guideRoles")||"[]");
  const processes=JSON.parse(localStorage.getItem("guideProcesses")||"[]");
  document.querySelectorAll(".guide-role").forEach((el)=>{ el.checked=roles.includes(el.value); });
  document.querySelectorAll(".guide-process").forEach((el)=>{ el.checked=processes.includes(el.value); });
}

function initClock(){ updateCurrentTime(); setInterval(updateCurrentTime,1000); }
function initTabs(){
  document.querySelectorAll(".tab-btn").forEach((btn)=>{
    btn.addEventListener("click",()=>{
      const target=btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach((b)=>b.classList.toggle("active",b===btn));
      document.querySelectorAll(".tab-panel").forEach((panel)=>panel.classList.toggle("active",panel.id===target));
      if(target==="rainPanel" && rainChart) setTimeout(()=>rainChart.resize(),50);
      if(target==="safetyPanel") setTimeout(()=>{ if(safetyChart) safetyChart.resize(); if(typeof safetyTrendChart !== "undefined" && safetyTrendChart) safetyTrendChart.resize(); },50);
      if(target==="guidePanel") setTimeout(()=>{ renderFieldGuide(currentRows, currentSafetyRows); if(window.GUI_ARC_refreshSplitGuides) window.GUI_ARC_refreshSplitGuides(); },80);
      if(target==="safetyGuidePanel") setTimeout(()=>{ if(window.GUI_ARC_refreshSplitGuides) window.GUI_ARC_refreshSplitGuides(); },120);
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
    renderSummary(forecast.summary||{}); renderTable(currentRows); renderChart(currentRows); renderSafetySummary(forecast.safetySummary||{}); renderSafetyTable(currentSafetyRows); renderSafetyChart(currentSafetyRows); renderSafetyTrendChart(currentSafetyRows); renderHealthManagement(currentSafetyRows); renderFieldGuide(currentRows, currentSafetyRows); renderBrandInfo(forecast.brand,forecast.meta);
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

/* =========================================================
   v4.6 Field Guide DB integration
   - 공종 DB 검색
   - 자주 찾는 공종 상단 표시
   - 선택 공종 localStorage 저장
   ========================================================= */
var FIELD_WORK_DB = null;
var FIELD_WORK_ITEMS = [];
var FIELD_WORK_DETAILS = {};
var FIELD_SELECTED_WORK_IDS = new Set();
var FIELD_LAST_SEARCH_IDS = [];

async function initFieldGuideInputs(){
  restoreGuideSelections();
  await loadFieldWorkDb();
  initWorkDbSelector();

  document.querySelectorAll(".guide-role").forEach((el)=>{
    el.addEventListener("change",()=>{
      saveGuideSelections();
      renderFieldGuide(currentRows,currentSafetyRows);
    });
  });

  const selectRoles = document.getElementById("selectAllRolesBtn");
  const clearRoles = document.getElementById("clearRolesBtn");
  if (selectRoles) selectRoles.addEventListener("click", () => setGuideGroupChecked(".guide-role", true));
  if (clearRoles) clearRoles.addEventListener("click", () => setGuideGroupChecked(".guide-role", false));

  const copyBtn=document.getElementById("copyTbmBtn");
  if(copyBtn){
    copyBtn.addEventListener("click",()=>{
      const text=document.getElementById("tbmText")?.textContent || "";
      navigator.clipboard.writeText(text).then(()=>alert("TBM 문구가 복사되었습니다.")).catch(()=>prompt("아래 문구를 복사하세요.", text));
    });
  }

  renderFieldGuide(currentRows,currentSafetyRows);
}

function setGuideGroupChecked(selector, checked) {
  document.querySelectorAll(selector).forEach((el) => { el.checked = checked; });
  saveGuideSelections();
  renderFieldGuide(currentRows, currentSafetyRows);
}

function saveGuideSelections(){
  const roles=[...document.querySelectorAll(".guide-role:checked")].map((el)=>el.value);
  localStorage.setItem("guideRoles", JSON.stringify(roles));
  localStorage.setItem("guideWorkIds", JSON.stringify([...FIELD_SELECTED_WORK_IDS]));
}

function restoreGuideSelections(){
  const roles=JSON.parse(localStorage.getItem("guideRoles")||"[]");
  const ids=JSON.parse(localStorage.getItem("guideWorkIds")||"[]");
  document.querySelectorAll(".guide-role").forEach((el)=>{ el.checked=roles.includes(el.value); });
  FIELD_SELECTED_WORK_IDS = new Set(ids);
}

async function loadFieldWorkDb(){
  if (FIELD_WORK_DB) return FIELD_WORK_DB;
  try{
    const response = await fetch("data/work_db.json", { cache:"no-store" });
    if(!response.ok) throw new Error(`공종 DB 로드 실패: ${response.status}`);
    FIELD_WORK_DB = await response.json();
    FIELD_WORK_ITEMS = FIELD_WORK_DB.work_items || [];
    FIELD_WORK_DETAILS = FIELD_WORK_DB.work_item_details || {};
  }catch(error){
    console.warn("공종 DB 로드 실패:", error);
    FIELD_WORK_DB = { work_items:[], work_item_details:{} };
    FIELD_WORK_ITEMS = [];
    FIELD_WORK_DETAILS = {};
  }
  return FIELD_WORK_DB;
}

function initWorkDbSelector(){
  renderFavoriteWorkItems();
  renderSelectedWorkItems();
  renderWorkSearchResults(FIELD_WORK_ITEMS.slice(0, 12));

  const input = document.getElementById("workSearchInput");
  const clearBtn = document.getElementById("clearSelectedWorksBtn");
  const addVisibleBtn = document.getElementById("addVisibleWorksBtn");

  if(input){
    input.addEventListener("input",()=>{
      const result = searchWorkItems(input.value).slice(0, 30);
      renderWorkSearchResults(result);
    });
  }

  if(clearBtn){
    clearBtn.addEventListener("click",()=>{
      FIELD_SELECTED_WORK_IDS.clear();
      saveGuideSelections();
      renderSelectedWorkItems();
      renderFieldGuide(currentRows,currentSafetyRows);
    });
  }

  if(addVisibleBtn){
    addVisibleBtn.addEventListener("click",()=>{
      FIELD_LAST_SEARCH_IDS.forEach((id)=>addWorkItem(id, false));
      saveGuideSelections();
      renderSelectedWorkItems();
      renderFavoriteWorkItems();
      renderFieldGuide(currentRows,currentSafetyRows);
    });
  }
}

function searchWorkItems(keyword){
  const q = String(keyword || "").trim().toLowerCase();
  if(!q) return FIELD_WORK_ITEMS.slice(0, 12);
  const tokens = q.split(/\s+/).filter(Boolean);
  return FIELD_WORK_ITEMS
    .map((item)=>({ item, score: scoreWorkItem(item, tokens) }))
    .filter((x)=>x.score > 0)
    .sort((a,b)=>b.score-a.score || Number(a.item.공정순서||999)-Number(b.item.공정순서||999))
    .map((x)=>x.item);
}

function scoreWorkItem(item, tokens){
  const text = `${item.대공종||""} ${item.중공종||""} ${item.세부작업||""} ${item.검색키워드||""}`.toLowerCase();
  let score = 0;
  tokens.forEach((t)=>{
    if((item.세부작업||"").toLowerCase().includes(t)) score += 5;
    if((item.중공종||"").toLowerCase().includes(t)) score += 3;
    if((item.대공종||"").toLowerCase().includes(t)) score += 2;
    if(text.includes(t)) score += 1;
  });
  return score;
}

function workDisplayName(item){
  if(!item) return "알 수 없는 공종";
  return item.세부작업 || item.작업명 || item.작업ID || "알 수 없는 공종";
}

function workPathText(item){
  if(!item) return "";
  return [item.대공종, item.중공종, item.주요시기].filter(Boolean).join(" · ");
}

function renderWorkSearchResults(items){
  const el = document.getElementById("workSearchResults");
  if(!el) return;
  FIELD_LAST_SEARCH_IDS = items.map((item)=>item.작업ID).filter(Boolean);
  if(!items.length){
    el.innerHTML = `<p class="guide-empty">검색 결과가 없습니다.</p>`;
    return;
  }
  el.innerHTML = items.map((item)=>`
    <div class="work-result-card">
      <strong>${workDisplayName(item)}</strong>
      <span>${workPathText(item)}</span>
      <small>기본위험도: ${item.기본위험도 || "-"}</small>
      <button type="button" class="mini-btn" onclick="addWorkItem('${item.작업ID}')">추가</button>
    </div>
  `).join("");
}

function getFrequentWorkIds(){
  const counts = JSON.parse(localStorage.getItem("guideWorkUseCounts") || "{}");
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([id])=>id);
  const defaults = FIELD_WORK_ITEMS
    .filter((item)=>/콘크리트|철근|거푸집|방수|굴착|크레인|양중|천공|분진|하역|덤프/.test(`${item.세부작업} ${item.검색키워드}`))
    .map((item)=>item.작업ID);
  return [...new Set([...sorted, ...defaults])].slice(0, 12);
}

function renderFavoriteWorkItems(){
  const el = document.getElementById("favoriteWorkItems");
  if(!el) return;
  const ids = getFrequentWorkIds();
  if(!ids.length){
    el.innerHTML = `<p class="guide-empty">공종 DB를 불러오는 중입니다.</p>`;
    return;
  }
  el.innerHTML = ids.map((id)=>{
    const item = FIELD_WORK_ITEMS.find((x)=>x.작업ID===id);
    if(!item) return "";
    return `<button type="button" class="work-chip" onclick="addWorkItem('${id}')">${workDisplayName(item)}</button>`;
  }).join("");
}

function addWorkItem(id, rerender=true){
  if(!id) return;
  FIELD_SELECTED_WORK_IDS.add(id);
  const counts = JSON.parse(localStorage.getItem("guideWorkUseCounts") || "{}");
  counts[id] = (counts[id] || 0) + 1;
  localStorage.setItem("guideWorkUseCounts", JSON.stringify(counts));
  saveGuideSelections();
  if(rerender){
    renderSelectedWorkItems();
    renderFavoriteWorkItems();
    renderFieldGuide(currentRows,currentSafetyRows);
  }
}

function removeWorkItem(id){
  FIELD_SELECTED_WORK_IDS.delete(id);
  saveGuideSelections();
  renderSelectedWorkItems();
  renderFieldGuide(currentRows,currentSafetyRows);
}

function renderSelectedWorkItems(){
  const el = document.getElementById("selectedWorkItems");
  if(!el) return;
  const ids = [...FIELD_SELECTED_WORK_IDS];
  if(!ids.length){
    el.innerHTML = `<p class="guide-empty">오늘 공종을 검색하거나 자주 찾는 공종에서 추가하세요.</p>`;
    return;
  }
  el.innerHTML = ids.map((id)=>{
    const item = FIELD_WORK_ITEMS.find((x)=>x.작업ID===id) || FIELD_WORK_DETAILS[id]?.work_item;
    return `<span class="selected-work-item">${workDisplayName(item)} <button type="button" onclick="removeWorkItem('${id}')">×</button></span>`;
  }).join("");
}

function getSelectedGuideWorkIds(){
  return [...FIELD_SELECTED_WORK_IDS];
}

function getSelectedGuideWorkDetails(){
  return getSelectedGuideWorkIds()
    .map((id)=>FIELD_WORK_DETAILS[id])
    .filter(Boolean);
}

/* =========================================================
   v4.7 Work Accordion Selector Override
   - DB 전체 공종을 대공종별 접기/펼치기로 표시
   - 검색 시 관련 공종만 표시하고 해당 대분류 자동 펼침
   - 자주 찾는 공종 상단 유지
   ========================================================= */
var FIELD_OPEN_WORK_GROUPS = new Set();
var FIELD_CURRENT_WORK_FILTER = "";

function initWorkDbSelector(){
  renderFavoriteWorkItems();
  renderSelectedWorkItems();
  renderWorkCategoryAccordion("");
  renderWorkSearchResults(FIELD_WORK_ITEMS.slice(0, 20));

  const input = document.getElementById("workSearchInput");
  const clearBtn = document.getElementById("clearSelectedWorksBtn");
  const addVisibleBtn = document.getElementById("addVisibleWorksBtn");
  const expandBtn = document.getElementById("expandWorkGroupsBtn");
  const collapseBtn = document.getElementById("collapseWorkGroupsBtn");

  if(input){
    input.addEventListener("input",()=>{
      FIELD_CURRENT_WORK_FILTER = input.value || "";
      const result = searchWorkItems(FIELD_CURRENT_WORK_FILTER).slice(0, 80);
      renderWorkSearchResults(result);
      renderWorkCategoryAccordion(FIELD_CURRENT_WORK_FILTER);
    });
  }

  if(clearBtn){
    clearBtn.addEventListener("click",()=>{
      FIELD_SELECTED_WORK_IDS.clear();
      saveGuideSelections();
      renderSelectedWorkItems();
      renderFavoriteWorkItems();
      renderWorkCategoryAccordion(FIELD_CURRENT_WORK_FILTER);
      renderFieldGuide(currentRows,currentSafetyRows);
    });
  }

  if(addVisibleBtn){
    addVisibleBtn.addEventListener("click",()=>{
      FIELD_LAST_SEARCH_IDS.forEach((id)=>addWorkItem(id, false));
      saveGuideSelections();
      renderSelectedWorkItems();
      renderFavoriteWorkItems();
      renderWorkCategoryAccordion(FIELD_CURRENT_WORK_FILTER);
      renderFieldGuide(currentRows,currentSafetyRows);
    });
  }

  if(expandBtn){
    expandBtn.addEventListener("click",()=>{
      getGroupedWorkItems(FIELD_CURRENT_WORK_FILTER).forEach((group)=>FIELD_OPEN_WORK_GROUPS.add(group.name));
      renderWorkCategoryAccordion(FIELD_CURRENT_WORK_FILTER);
    });
  }

  if(collapseBtn){
    collapseBtn.addEventListener("click",()=>{
      FIELD_OPEN_WORK_GROUPS.clear();
      renderWorkCategoryAccordion(FIELD_CURRENT_WORK_FILTER);
    });
  }
}

function searchWorkItems(keyword){
  const q = String(keyword || "").trim().toLowerCase();
  if(!q) return FIELD_WORK_ITEMS.slice(0, 80);
  const tokens = q.split(/\s+/).filter(Boolean);
  return FIELD_WORK_ITEMS
    .map((item)=>({ item, score: scoreWorkItem(item, tokens) }))
    .filter((x)=>x.score > 0)
    .sort((a,b)=>b.score-a.score || Number(a.item.공정순서||999)-Number(b.item.공정순서||999))
    .map((x)=>x.item);
}

function getGroupedWorkItems(keyword=""){
  const items = keyword && keyword.trim() ? searchWorkItems(keyword) : FIELD_WORK_ITEMS.slice();
  const map = new Map();
  items.forEach((item)=>{
    const group = item.대공종 || "기타공종";
    if(!map.has(group)) map.set(group, []);
    map.get(group).push(item);
  });
  return [...map.entries()]
    .map(([name, list])=>({
      name,
      list: list.sort((a,b)=>Number(a.공정순서||999)-Number(b.공정순서||999))
    }))
    .sort((a,b)=>groupOrderScore(a.name)-groupOrderScore(b.name) || a.name.localeCompare(b.name, "ko"));
}

function groupOrderScore(name){
  const order = ["가설공사","토공사","지정 및 기초공사","철근콘크리트공사","철골공사","조적공사","방수공사","미장공사","타일공사","석공사","금속공사","창호공사","유리공사","도장공사","수장공사","지붕 및 홈통공사","외장공사","조경공사","부대토목공사","기계설비공사","전기공사","장비작업","해체공사","기타공종"];
  const idx = order.findIndex((v)=>String(name||"").includes(v) || v.includes(String(name||"")));
  return idx >= 0 ? idx : 999;
}

function renderWorkCategoryAccordion(keyword=""){
  const el = document.getElementById("workCategoryAccordion");
  if(!el) return;

  const groups = getGroupedWorkItems(keyword);
  if(!groups.length){
    el.innerHTML = `<div class="work-empty-line">표시할 공종이 없습니다. 검색어를 다시 입력하세요.</div>`;
    return;
  }

  // 검색 중에는 관련 그룹을 자동 펼침. 일반 상태에서는 사용자가 펼친 그룹만 유지합니다.
  if(keyword && keyword.trim()){
    groups.forEach((group)=>FIELD_OPEN_WORK_GROUPS.add(group.name));
  }

  el.innerHTML = groups.map((group)=>{
    const selectedCount = group.list.filter((item)=>FIELD_SELECTED_WORK_IDS.has(item.작업ID)).length;
    const open = FIELD_OPEN_WORK_GROUPS.has(group.name);
    return `
      <section class="work-group ${open ? "open" : ""}" data-group="${escapeHtml(group.name)}">
        <button type="button" class="work-group-header" onclick="toggleWorkCategory('${encodeAttr(group.name)}')">
          <span class="work-group-title">
            <strong>${escapeHtml(group.name)}</strong>
            <span class="work-group-count">${group.list.length}개 · 선택 ${selectedCount}개</span>
          </span>
          <span class="work-group-toggle">${open ? "접기 ▲" : "펼치기 ▼"}</span>
        </button>
        <div class="work-group-body">
          <div class="work-group-toolbar">
            <button type="button" class="mini-btn" onclick="selectWorkGroup('${encodeAttr(group.name)}', true)">이 대분류 전체 선택</button>
            <button type="button" class="mini-btn" onclick="selectWorkGroup('${encodeAttr(group.name)}', false)">이 대분류 해제</button>
          </div>
          <div class="work-check-grid">
            ${group.list.map(renderWorkCheckCard).join("")}
          </div>
        </div>
      </section>
    `;
  }).join("");
}

function renderWorkCheckCard(item){
  const id = item.작업ID;
  const checked = FIELD_SELECTED_WORK_IDS.has(id);
  return `
    <label class="work-check-card ${checked ? "checked" : ""}">
      <input type="checkbox" ${checked ? "checked" : ""} onchange="setWorkItemChecked('${encodeAttr(id)}', this.checked)">
      <span>
        <strong>${escapeHtml(workDisplayName(item))}</strong>
        <small>${escapeHtml([item.중공종, item.주요시기, item.기본위험도 ? `위험도 ${item.기본위험도}` : ""].filter(Boolean).join(" · "))}</small>
      </span>
    </label>
  `;
}

function toggleWorkCategory(groupName){
  const name = decodeAttr(groupName);
  if(FIELD_OPEN_WORK_GROUPS.has(name)) FIELD_OPEN_WORK_GROUPS.delete(name);
  else FIELD_OPEN_WORK_GROUPS.add(name);
  renderWorkCategoryAccordion(FIELD_CURRENT_WORK_FILTER);
}

function selectWorkGroup(groupName, checked){
  const name = decodeAttr(groupName);
  const groups = getGroupedWorkItems(FIELD_CURRENT_WORK_FILTER);
  const group = groups.find((g)=>g.name === name);
  if(!group) return;
  group.list.forEach((item)=>{
    if(checked) FIELD_SELECTED_WORK_IDS.add(item.작업ID);
    else FIELD_SELECTED_WORK_IDS.delete(item.작업ID);
  });
  saveGuideSelections();
  renderSelectedWorkItems();
  renderFavoriteWorkItems();
  renderWorkCategoryAccordion(FIELD_CURRENT_WORK_FILTER);
  renderFieldGuide(currentRows,currentSafetyRows);
}

function setWorkItemChecked(id, checked){
  const workId = decodeAttr(id);
  if(checked) addWorkItem(workId, false);
  else FIELD_SELECTED_WORK_IDS.delete(workId);
  saveGuideSelections();
  renderSelectedWorkItems();
  renderFavoriteWorkItems();
  renderWorkCategoryAccordion(FIELD_CURRENT_WORK_FILTER);
  renderFieldGuide(currentRows,currentSafetyRows);
}

function addWorkItem(id, rerender=true){
  if(!id) return;
  FIELD_SELECTED_WORK_IDS.add(id);
  const counts = JSON.parse(localStorage.getItem("guideWorkUseCounts") || "{}");
  counts[id] = (counts[id] || 0) + 1;
  localStorage.setItem("guideWorkUseCounts", JSON.stringify(counts));
  saveGuideSelections();
  if(rerender){
    renderSelectedWorkItems();
    renderFavoriteWorkItems();
    renderWorkCategoryAccordion(FIELD_CURRENT_WORK_FILTER);
    renderFieldGuide(currentRows,currentSafetyRows);
  }
}

function removeWorkItem(id){
  FIELD_SELECTED_WORK_IDS.delete(id);
  saveGuideSelections();
  renderSelectedWorkItems();
  renderFavoriteWorkItems();
  renderWorkCategoryAccordion(FIELD_CURRENT_WORK_FILTER);
  renderFieldGuide(currentRows,currentSafetyRows);
}

function renderWorkSearchResults(items){
  const el = document.getElementById("workSearchResults");
  if(!el) return;
  FIELD_LAST_SEARCH_IDS = items.map((item)=>item.작업ID).filter(Boolean);
  if(!items.length){
    el.innerHTML = `<p class="guide-empty">검색 결과가 없습니다.</p>`;
    return;
  }
  el.innerHTML = items.slice(0, 24).map((item)=>`
    <div class="work-result-card">
      <strong>${escapeHtml(workDisplayName(item))}</strong>
      <span>${escapeHtml(workPathText(item))}</span>
      <small>기본위험도: ${escapeHtml(item.기본위험도 || "-")}</small>
      <button type="button" class="mini-btn" onclick="addWorkItem('${encodeAttr(item.작업ID)}')">추가</button>
    </div>
  `).join("");
}

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function encodeAttr(value){ return encodeURIComponent(String(value ?? "")); }
function decodeAttr(value){ return decodeURIComponent(String(value ?? "")); }


/* =========================================================
   v5.1 Process checklist export helpers
   ========================================================= */
function getProcessChecklistPlainText(){
  const root = document.getElementById("processChecklist");
  if(!root) return "";
  const lines = [];
  root.querySelectorAll(".guide-section").forEach((section)=>{
    const title = section.querySelector("h3")?.innerText?.trim();
    if(title) lines.push(`\n[${title}]`);
    section.querySelectorAll("li").forEach((li)=>{
      const text = li.innerText.replace(/\s+/g," ").trim();
      if(text) lines.push(`□ ${text}`);
    });
  });
  return lines.join("\n").trim();
}

function copyProcessChecklist(){
  const text = getProcessChecklistPlainText();
  if(!text){ alert("복사할 공정별 주의사항이 없습니다."); return; }
  navigator.clipboard?.writeText(text).then(()=>alert("공정별 주의사항을 복사했습니다."));
}

function downloadProcessChecklistCsv(){
  const root = document.getElementById("processChecklist");
  if(!root){ alert("내보낼 내용이 없습니다."); return; }
  const rows = [["공종","항목"]];
  root.querySelectorAll(".guide-section").forEach((section)=>{
    const title = section.querySelector("h3")?.innerText?.replace(/\s+/g," ").trim() || "공종";
    section.querySelectorAll("li").forEach((li)=>{
      const text = li.innerText.replace(/\s+/g," ").trim();
      if(text) rows.push([title, text]);
    });
  });
  if(rows.length <= 1){ alert("내보낼 항목이 없습니다."); return; }
  const csv = rows.map((r)=>r.map((v)=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gui-arc-process-checklist.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function printProcessChecklist(){
  window.print();
}
