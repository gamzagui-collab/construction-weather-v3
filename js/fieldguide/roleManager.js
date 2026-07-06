export const ROLES=["안전관리자","공사관리자","품질관리자","장비담당자","현장소장"];
export function tasksForRoles(roles, summary){
 const out=[]; if(roles.includes("안전관리자")) out.push("작업자 건강상태 확인","냉수·그늘·휴게시설 점검","위험시간대 현장순회"); if(roles.includes("공사관리자")) out.push("강수·풍속 시간대별 작업조정","외부작업 우선순위 조정"); if(roles.includes("품질관리자")) out.push("타설·양생·보양계획 확인","검측 및 사진기록 준비"); if(roles.includes("장비담당자")) out.push("장비 이동동선 확인","풍속 상승 시 양중작업 기준 공유"); if(roles.includes("현장소장")) out.push("중점 위험시간 공유","공정·안전회의 지시사항 정리"); return [...new Set(out)];
}
