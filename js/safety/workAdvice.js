import { safetyLevel } from "../weather/temperature.js";
export function buildSafetyAction(row){ const lv=safetyLevel(row); if(lv.score>=5)return"작업중지 검토, 단독작업 금지, 체온 집중관리"; if(lv.score>=4)return"40분 작업/20분 휴식, 냉조끼, 식염포도당 지급"; if(lv.score>=3)return"50분 작업/10분 휴식, 체온 확인, 냉수 제공"; if(lv.score>=2)return"수분섭취 안내, 휴게시설 확인"; return"일반 작업관리"; }
