export async function buildDailyAiBriefing({ workerBaseUrl, trades = [], weatherRisk = "normal" }) {
  const url = `${workerBaseUrl}/ai-assistant?trades=${encodeURIComponent(trades.join(","))}&weatherRisk=${encodeURIComponent(weatherRisk)}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.message || "AI 현장비서 조회 실패");
  return json.assistant;
}

export function renderDailyAiBriefing(root, assistant) {
  if (!root || !assistant) return;
  root.innerHTML = `
    <section class="card ai-briefing-card">
      <div class="section-title"><h2>🤖 AI 현장비서 종합 브리핑</h2></div>
      <p>${assistant.summary}</p>
      <div class="guide-output-grid">
        <div class="guide-section"><h3>⚠ 사고위험 TOP5</h3><ul>${assistant.accidentTop5.map(x=>`<li>${x}</li>`).join("")}</ul></div>
        <div class="guide-section"><h3>📐 품질문제 TOP3</h3><ul>${assistant.qualityTop3.map(x=>`<li>${x}</li>`).join("")}</ul></div>
        <div class="guide-section"><h3>🧾 감리지적 TOP3</h3><ul>${assistant.inspectionTop3.map(x=>`<li>${x}</li>`).join("")}</ul></div>
      </div>
      <pre class="tbm-text">${assistant.tbm}</pre>
    </section>
  `;
}
