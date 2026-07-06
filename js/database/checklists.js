import { getWorkDetailByName, uniqueByText } from './workItems.js';

export function checklistForTrade(tradeName) {
  const detail = getWorkDetailByName(tradeName);
  if (!detail) return [`${tradeName}: 작업 전 TBM 및 위험성평가 확인`, `${tradeName}: 작업구역 정리 및 안전조치 확인`];
  return uniqueByText((detail.checklists || []).map(c => c.체크문항));
}

export function roleChecklistsForTrade(tradeName) {
  const detail = getWorkDetailByName(tradeName);
  if (!detail) return { common: checklistForTrade(tradeName), safety: [], construction: [], quality: [], equipment: [] };
  return {
    common: uniqueByText((detail.checklists || []).map(c => c.체크문항)),
    safety: uniqueByText((detail.safety_controls || []).map(c => `[${c.단계}] ${c['공사/안전이 해야할 일']}`)),
    construction: uniqueByText((detail.construction_controls || []).map(c => `[${c.단계}] ${c['공사가 해야할 일']} / 확인: ${c.확인포인트}`)),
    quality: uniqueByText((detail.quality_controls || []).map(c => `${c.관리항목}: ${c['관리기준/확인내용']} (${c.검사시점})`)),
    equipment: uniqueByText((detail.equipment_materials || []).map(c => `[${c.구분}] ${c['장비/자재/PPE']} - ${c.관리포인트}`)),
    risks: uniqueByText((detail.risks || []).map(r => `${r.사고유형}/${r.위험도}: ${r.위험요소} - ${r.예방핵심}`))
  };
}
