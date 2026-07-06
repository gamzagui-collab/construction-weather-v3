const DEFAULT_REGION_KEY = "gimje";
const REGION_LIST = [
  { key: "gimje", name: "전북 김제시", lat: 35.8036, lon: 126.8809 },
  { key: "jeonju", name: "전북 전주시", lat: 35.8242, lon: 127.1480 },
  { key: "iksan", name: "전북 익산시", lat: 35.9483, lon: 126.9576 },
  { key: "gunsan", name: "전북 군산시", lat: 35.9676, lon: 126.7369 },
  { key: "wanju", name: "전북 완주군", lat: 35.9047, lon: 127.1621 },
  { key: "seoul", name: "서울특별시", lat: 37.5665, lon: 126.9780 },
  { key: "busan", name: "부산광역시", lat: 35.1796, lon: 129.0756 },
  { key: "daegu", name: "대구광역시", lat: 35.8714, lon: 128.6014 },
  { key: "incheon", name: "인천광역시", lat: 37.4563, lon: 126.7052 },
  { key: "gwangju", name: "광주광역시", lat: 35.1595, lon: 126.8526 },
  { key: "daejeon", name: "대전광역시", lat: 36.3504, lon: 127.3845 },
  { key: "ulsan", name: "울산광역시", lat: 35.5384, lon: 129.3114 },
  { key: "sejong", name: "세종특별자치시", lat: 36.4800, lon: 127.2890 },
  { key: "suwon", name: "경기 수원시", lat: 37.2636, lon: 127.0286 },
  { key: "yongin", name: "경기 용인시", lat: 37.2411, lon: 127.1776 },
  { key: "hwaseong", name: "경기 화성시", lat: 37.1995, lon: 126.8312 },
  { key: "pyeongtaek", name: "경기 평택시", lat: 36.9921, lon: 127.1127 },
  { key: "chuncheon", name: "강원 춘천시", lat: 37.8813, lon: 127.7298 },
  { key: "wonju", name: "강원 원주시", lat: 37.3422, lon: 127.9202 },
  { key: "gangneung", name: "강원 강릉시", lat: 37.7519, lon: 128.8761 },
  { key: "cheongju", name: "충북 청주시", lat: 36.6424, lon: 127.4890 },
  { key: "cheonan", name: "충남 천안시", lat: 36.8151, lon: 127.1139 },
  { key: "asan", name: "충남 아산시", lat: 36.7898, lon: 127.0018 },
  { key: "seosan", name: "충남 서산시", lat: 36.7848, lon: 126.4503 },
  { key: "dangjin", name: "충남 당진시", lat: 36.8930, lon: 126.6283 },
  { key: "mokpo", name: "전남 목포시", lat: 34.8118, lon: 126.3922 },
  { key: "yeosu", name: "전남 여수시", lat: 34.7604, lon: 127.6622 },
  { key: "suncheon", name: "전남 순천시", lat: 34.9506, lon: 127.4872 },
  { key: "pohang", name: "경북 포항시", lat: 36.0190, lon: 129.3435 },
  { key: "gumi", name: "경북 구미시", lat: 36.1195, lon: 128.3446 },
  { key: "changwon", name: "경남 창원시", lat: 35.2280, lon: 128.6811 },
  { key: "gimhae", name: "경남 김해시", lat: 35.2285, lon: 128.8894 },
  { key: "jeju", name: "제주 제주시", lat: 33.4996, lon: 126.5312 },
  { key: "seogwipo", name: "제주 서귀포시", lat: 33.2541, lon: 126.5601 }
];
const REGION_MAP = Object.fromEntries(REGION_LIST.map((r) => [r.key, r]));
const REGION_ALIAS = { 김제:"gimje",김제시:"gimje",전주:"jeonju",전주시:"jeonju",익산:"iksan",군산:"gunsan",완주:"wanju",서울:"seoul",부산:"busan",대구:"daegu",인천:"incheon",광주:"gwangju",대전:"daejeon",울산:"ulsan",세종:"sejong",수원:"suwon",용인:"yongin",화성:"hwaseong",평택:"pyeongtaek",춘천:"chuncheon",원주:"wonju",강릉:"gangneung",청주:"cheongju",천안:"cheonan",아산:"asan",서산:"seosan",당진:"dangjin",목포:"mokpo",여수:"yeosu",순천:"suncheon",포항:"pohang",구미:"gumi",창원:"changwon",김해:"gimhae",제주:"jeju",서귀포:"seogwipo" };
function findLocalRegionByKeyword(keyword) {
  const value = keyword.trim();
  if (!value) return null;
  if (REGION_ALIAS[value]) return REGION_MAP[REGION_ALIAS[value]];
  return REGION_LIST.find((r) => r.name === value || r.name.includes(value)) || null;
}
