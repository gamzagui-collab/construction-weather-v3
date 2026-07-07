
import { ACCIDENT_POSTER_SEED, ACCIDENT_SOURCE_LINKS } from "../database/accidentPosters.js";

function getDailyFallbackPosters(){
  const day = Math.floor(Date.now() / 86400000);
  const start = day % ACCIDENT_POSTER_SEED.length;
  const rotated = [...ACCIDENT_POSTER_SEED.slice(start), ...ACCIDENT_POSTER_SEED.slice(0,start)];
  return rotated.slice(0, 8).map((p, idx) => ({
    title: p.title,
    accidentType: p.type,
    trade: p.trade,
    summary: p.summary,
    checks: p.checks || [],
    occurredAt: "공식 채널 확인",
    publishedAt: "시드 DB",
    region: "공식 채널 확인",
    sourceUrl: "https://portal.kosha.or.kr/",
    attachments: [],
    fallback: true
  }));
}

function formatAttachmentLinks(row){
  const files = row.attachments || [];
  if (!files.length) return "";
  return `<div class="poster-files">${
    files.slice(0,2).map((f) => {
      const href = f.filePath || row.sourceUrl || "#";
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">📎 ${f.fileName || "첨부파일"}</a>`;
    }).join("")
  }</div>`;
}

function normalizeRows(rows){
  return (rows || []).slice(0, 10).map((r) => ({
    title: r.title || "국내재해사례",
    accidentType: r.accidentType || "공식 원문 확인",
    trade: r.trade || "건설업",
    summary: r.cause || r.summary || r.mainCause || "공식 원문 확인",
    checks: r.checks || [],
    occurredAt: r.occurredAt || "공식 원문 확인",
    publishedAt: r.publishedAt || "공식 원문 확인",
    region: r.region || "공식 원문 확인",
    sourceUrl: r.sourceUrl || "https://portal.kosha.or.kr/",
    attachments: r.attachments || [],
    fallback: false
  }));
}

async function loadAccidentRows(){
  if (typeof fetchAccidentsFromWorker !== "function") {
    return { rows: getDailyFallbackPosters(), source: "fallback", message: "Worker 사고사례 함수 없음" };
  }

  try {
    const json = await fetchAccidentsFromWorker({ business: "건설업", keyword: "", pageNo: 1, numOfRows: 10 });
    const rows = normalizeRows(json.rows);
    if (rows.length) return { rows, source: "kosha", meta: json.meta };
    return { rows: getDailyFallbackPosters(), source: "fallback", message: "API 결과 없음" };
  } catch (error) {
    console.warn("KOSHA accident API fallback:", error);
    return { rows: getDailyFallbackPosters(), source: "fallback", message: error.message };
  }
}

function buildTbmFromRows(rows){
  const lines = [];
  lines.push("📋 오늘의 건설사고 예방 TBM");
  lines.push("");
  rows.slice(0, 5).forEach((row, idx) => {
    lines.push(`${idx + 1}. ${row.accidentType} · ${row.trade}`);
    lines.push(`   📅 발생일시: ${row.occurredAt}`);
    lines.push(`   📍 발생지역: ${row.region}`);
    (row.checks || []).slice(0, 3).forEach((c) => lines.push(`   □ ${c}`));
    lines.push("");
  });
  lines.push("□ 유사사고를 우리 현장 작업 전 TBM에 반영하십시오.");
  return lines.join("\n");
}

export async function renderAccidentNews(rootId="accidentNewsRoot"){
  const root = document.getElementById(rootId);
  if (!root) return;

  root.innerHTML = `
    <div class="ga-section-title">🚨 건설사고 브리핑</div>
    <div class="accident-news-card">
      <p>산업안전보건공단 국내재해사례 API를 조회하고 있습니다. 실패 시 시드 DB로 대체 표시됩니다.</p>
    </div>
  `;

  const { rows, source, message } = await loadAccidentRows();
  const tbm = buildTbmFromRows(rows);

  root.innerHTML = `
    <div class="ga-section-title">🚨 건설사고 브리핑</div>
    <div class="accident-news-card">
      <p>
        <b>${source === "kosha" ? "산업안전보건공단 국내재해사례 API 연동" : "시드 DB 표시"}</b>
        · 최대 10건 · 발생일시가 API 본문에서 확인되지 않으면 “공식 원문 확인”으로 표시합니다.
        ${message ? `<br><small>${message}</small>` : ""}
      </p>

      <div class="accident-news-grid">
        ${rows.map((p, idx) => `
          <article class="accident-poster">
            <span class="type">${p.accidentType}</span>
            <h4>${idx + 1}. ${p.title}</h4>
            <p>📅 발생일시: <b>${p.occurredAt}</b></p>
            <p>📍 발생지역: <b>${p.region}</b></p>
            <p>🏗 공종: ${p.trade}</p>
            <p>❗ 주요 원인: ${p.summary}</p>
            <ul>${(p.checks || []).slice(0,5).map(c=>`<li>${c}</li>`).join("")}</ul>
            ${formatAttachmentLinks(p)}
            <a href="${p.sourceUrl}" target="_blank" rel="noopener noreferrer">공식 원문 확인</a>
          </article>
        `).join("")}
      </div>

      <div class="guide-card" style="margin-top:16px">
        <div class="ga-section-title">📋 TBM 교육자료 자동 생성</div>
        <pre id="accidentTbmText" class="tbm-text">${tbm}</pre>
        <button type="button" class="ga-copy-btn" id="copyAccidentTbmBtn">건설사고 TBM 복사</button>
      </div>

      <div class="source-link-row">
        ${ACCIDENT_SOURCE_LINKS.map(s => `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label}</a>`).join("")}
      </div>
    </div>
  `;

  document.getElementById("copyAccidentTbmBtn")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(tbm);
    alert("건설사고 TBM 문구를 복사했습니다.");
  });
}

document.addEventListener("DOMContentLoaded", () => renderAccidentNews());
