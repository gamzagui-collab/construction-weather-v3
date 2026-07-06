import { ROLE_LABELS } from '../database/roles.js';
export const ROLES = ROLE_LABELS;

export function tasksForRoles(roles, summary) {
  const selected = roles?.length ? roles : ['안전관리자'];
  const tasks = [];
  selected.forEach(role => {
    if (role === '안전관리자') {
      tasks.push('작업 전 TBM 실시 및 고위험 공종 공유');
      tasks.push('07~17시 작업시간 중 위험 시간대 현장 순회계획 수립');
      if (summary?.heatRisk) tasks.push('폭염 대비 냉수·그늘·휴식공간·식염포도당 확인');
      if (summary?.windRisk) tasks.push('강풍 대비 양중·고소작업 작업중지 기준 공유');
      if (summary?.rainRisk) tasks.push('강수 대비 미끄럼·감전·배수·보양 상태 점검');
    }
    if (role === '공사관리자') {
      tasks.push('오늘 공정별 작업 가능 시간대와 간섭사항 확인');
      tasks.push('외부작업·양중·타설 일정과 기상 리스크 조정');
      if (summary?.rainRisk) tasks.push('강수 예상 시 타설·방수·외부마감 공정 재검토');
    }
    if (role === '품질관리자') {
      tasks.push('검측·자재승인·시험계획 대상 공종 확인');
      if (summary?.rainRisk) tasks.push('콘크리트 타설 시 공시체·보양·감리 승인 조건 확인');
      if (summary?.heatRisk) tasks.push('고온 시 양생·균열·마감 품질 영향 확인');
    }
    if (role === '장비담당자') {
      tasks.push('장비 점검필증·작업반경·신호수 배치 확인');
      if (summary?.windRisk) tasks.push('풍속 상승 시간대 크레인·양중작업 중지 기준 확인');
    }
    if (role === '현장소장') {
      tasks.push('오늘의 핵심 위험요인과 공정 조정사항 승인');
      tasks.push('협력업체별 작업계획과 위험성평가 이행상태 확인');
    }
  });
  return [...new Set(tasks)];
}
