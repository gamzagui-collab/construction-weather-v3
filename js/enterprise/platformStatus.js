const PLATFORM_STATUS_ROUTES = [
  { id: "worker", label: "Worker", url: "/health" },
  { id: "kosha", label: "KOSHA", url: "/accidents?business=건설업&numOfRows=3" },
  { id: "ai", label: "AI 현장비서", url: "/ai-assistant?trades=철근공사,콘크리트%20타설" }
];

export async function checkPlatformStatus(workerBaseUrl) {
  const results = [];
  for (const route of PLATFORM_STATUS_ROUTES) {
    const started = performance.now();
    try {
      const res = await fetch(`${workerBaseUrl}${route.url}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      results.push({
        ...route,
        ok: res.ok && json.ok !== false,
        status: res.status,
        ms: Math.round(performance.now() - started),
        mode: json?.meta?.mode || json?.meta?.source || "",
        message: json?.message || json?.meta?.message || ""
      });
    } catch (error) {
      results.push({...route, ok: false, status: "error", ms: Math.round(performance.now() - started), message: error.message});
    }
  }
  return results;
}

export function renderPlatformStatus(root, results) {
  if (!root) return;
  root.innerHTML = `
    <section class="card enterprise-status-card">
      <div class="section-title"><h2>🧭 GUI's Arc API 상태</h2><p>KMA·KOSHA·AI 연결 상태를 확인합니다.</p></div>
      <div class="enterprise-status-grid">
        ${results.map(r => `
          <article class="summary-card">
            <span>${r.ok ? "🟢" : "🔴"} ${r.label}</span>
            <strong>${r.ok ? "정상" : "확인 필요"}</strong>
            <small>${r.ms}ms · ${r.mode || r.message || r.status}</small>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
