export const ROLE_DEFINITIONS = [
  { id:'safety', label:'안전관리자', keywords:['안전','위험','TBM','순회','PPE','작업허가'] },
  { id:'construction', label:'공사관리자', keywords:['공사','시공','공정','작업계획','동선','간섭'] },
  { id:'quality', label:'품질관리자', keywords:['품질','검측','시험','공시체','자재승인','시방'] },
  { id:'equipment', label:'장비담당자', keywords:['장비','자재','PPE','양중','점검필증'] },
  { id:'manager', label:'현장소장', keywords:['종합','일정','조정','보고','승인'] }
];

export const ROLE_LABELS = ROLE_DEFINITIONS.map(r=>r.label);
