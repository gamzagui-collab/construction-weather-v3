export const DISEASE_GUIDES = [
  { id:'heat-exhaustion', name:'🥵 열탈진', trigger:'heat', level:'danger', symptoms:['두통','어지럼증','구역감','과도한 발한','무력감'], firstAid:['그늘·시원한 곳으로 이동','옷을 느슨하게 풀기','시원한 물을 조금씩 제공','증상이 지속되면 의료기관 연락'] },
  { id:'heat-stroke', name:'🔥 열사병(응급)', trigger:'heat', level:'extreme', symptoms:['의식저하','고열','피부가 뜨겁고 건조하거나 의식 이상','경련'], firstAid:['즉시 119 신고','얼음·찬물로 적극적으로 체온 낮추기','의식이 없으면 음료를 억지로 먹이지 않기','응급구조 도착 전까지 냉각 지속'] },
  { id:'cramp', name:'💪 열경련', trigger:'heat', level:'high', symptoms:['근육경련','다리·복부 통증','땀 과다'], firstAid:['작업 중지 후 휴식','전해질 보충','경련 부위 무리한 마사지 금지','반복 시 의료기관 확인'] },
  { id:'hypothermia', name:'🥶 저체온증', trigger:'cold', level:'danger', symptoms:['떨림','말이 어눌함','판단력 저하','졸림'], firstAid:['젖은 옷 교체','담요·보온','의식이 있으면 따뜻한 음료','심한 경우 의료기관 이송'] },
  { id:'frostbite', name:'🧊 동상', trigger:'cold', level:'high', symptoms:['손끝·귀 저림','피부 창백','감각 저하','통증'], firstAid:['마찰 금지','미지근한 물로 서서히 가온','수포를 터뜨리지 않기','의료기관 진료'] }
];

export function diseaseGuidesForSafety(code) {
  if (['danger','extreme'].includes(code)) return DISEASE_GUIDES.filter(d=>['heat-exhaustion','heat-stroke','cramp'].includes(d.id));
  if (['cold-danger','cold-extreme'].includes(code)) return DISEASE_GUIDES.filter(d=>['hypothermia','frostbite'].includes(d.id));
  return DISEASE_GUIDES.filter(d=>d.id==='cramp');
}
