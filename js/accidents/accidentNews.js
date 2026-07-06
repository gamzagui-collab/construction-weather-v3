import { ACCIDENT_POSTER_SEED, ACCIDENT_SOURCE_LINKS } from "../database/accidentPosters.js";

function getDailyPosters(){
  const day = Math.floor(Date.now() / 86400000);
  const start = day % ACCIDENT_POSTER_SEED.length;
  const rotated = [...ACCIDENT_POSTER_SEED.slice(start), ...ACCIDENT_POSTER_SEED.slice(0,start)];
  return rotated.slice(0, 8);
}

export function renderAccidentNews(rootId="accidentNewsRoot"){
  const root = document.getElementById(rootId);
  if (!root) return;

  const posters = getDailyPosters();
  root.innerHTML = `
    <div class="ga-section-title">🚨 건설사고 브리핑</div>
    <div class="accident-news-card">
      <p><b>어제자 사고사례를 뉴스처럼 확인하는 영역</b>입니다. 실제 최신 포스터와 원문은 하단 공식 채널에서 확인하세요.</p>
      <div class="accident-news-grid">
        ${posters.map(p => `
          <article class="accident-poster">
            <span class="type">${p.type}</span>
            <h4>${p.title}</h4>
            <p>🏗 ${p.trade}</p>
            <p>${p.summary}</p>
            <ul>${p.checks.slice(0,5).map(c=>`<li>${c}</li>`).join("")}</ul>
          </article>
        `).join("")}
      </div>
      <div class="source-link-row">
        ${ACCIDENT_SOURCE_LINKS.map(s => `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label}</a>`).join("")}
      </div>
    </div>
  `;
}
document.addEventListener("DOMContentLoaded", () => renderAccidentNews());
