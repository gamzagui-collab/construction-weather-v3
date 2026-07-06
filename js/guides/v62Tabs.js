const TAB_DEFS = [
  { id:"rain", label:"🌧 강수 예보", existing:["rainTab","rainPanel","forecastPanel"] },
  { id:"temp", label:"🌡 온도·안전관리", existing:["safetyTab","temperaturePanel","tempPanel"] },
  { id:"safetyGuide", label:"🛡 오늘의 안전가이드", html:`<section id="todaySafetyGuideRoot"></section>` },
  { id:"fieldGuide", label:"🏗 오늘의 현장가이드", html:`<section id="todayFieldGuideRoot"></section>` },
  { id:"schedule", label:"📅 현장스케줄", html:`<section id="siteScheduleRoot"></section>` },
  { id:"accident", label:"🚨 건설사고 브리핑", html:`<section id="accidentNewsRoot"></section>` }
];

function ensureV62Tabs(){
  if (document.getElementById("gaTabsV62")) return;
  const main = document.querySelector("main") || document.querySelector(".layout") || document.body;

  const nav = document.createElement("div");
  nav.id = "gaTabsV62";
  nav.className = "ga-tabs-v62";

  const panels = document.createElement("div");
  panels.id = "gaPanelsV62";

  TAB_DEFS.forEach((tab, idx) => {
    const btn = document.createElement("button");
    btn.className = "ga-tab-v62" + (idx===0 ? " active" : "");
    btn.textContent = tab.label;
    btn.dataset.target = `gaPanel-${tab.id}`;
    nav.appendChild(btn);

    let panel = document.getElementById(`gaPanel-${tab.id}`);
    if (!panel) {
      panel = document.createElement("section");
      panel.id = `gaPanel-${tab.id}`;
      panel.className = "ga-panel-v62";
      panel.style.display = idx===0 ? "block" : "none";
      if (tab.html) panel.innerHTML = tab.html;
      panels.appendChild(panel);
    }
  });

  main.prepend(panels);
  main.prepend(nav);

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".ga-tab-v62");
    if (!btn) return;
    document.querySelectorAll(".ga-tab-v62").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".ga-panel-v62").forEach(p=>p.style.display="none");
    document.getElementById(btn.dataset.target).style.display = "block";
  });
}

document.addEventListener("DOMContentLoaded", ensureV62Tabs);
