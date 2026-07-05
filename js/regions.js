const DEFAULT_REGION_KEY = "gimje";

const REGION_LIST = [
  // 기본
  { key: "gimje", name: "전북 김제시", lat: 35.8036, lon: 126.8809 },

  // 서울 / 광역시
  { key: "seoul", name: "서울특별시", lat: 37.5665, lon: 126.9780 },
  { key: "busan", name: "부산광역시", lat: 35.1796, lon: 129.0756 },
  { key: "daegu", name: "대구광역시", lat: 35.8714, lon: 128.6014 },
  { key: "incheon", name: "인천광역시", lat: 37.4563, lon: 126.7052 },
  { key: "gwangju", name: "광주광역시", lat: 35.1595, lon: 126.8526 },
  { key: "daejeon", name: "대전광역시", lat: 36.3504, lon: 127.3845 },
  { key: "ulsan", name: "울산광역시", lat: 35.5384, lon: 129.3114 },
  { key: "sejong", name: "세종특별자치시", lat: 36.4800, lon: 127.2890 },

  // 경기
  { key: "suwon", name: "경기 수원시", lat: 37.2636, lon: 127.0286 },
  { key: "seongnam", name: "경기 성남시", lat: 37.4200, lon: 127.1265 },
  { key: "yongin", name: "경기 용인시", lat: 37.2411, lon: 127.1776 },
  { key: "hwaseong", name: "경기 화성시", lat: 37.1995, lon: 126.8312 },
  { key: "pyeongtaek", name: "경기 평택시", lat: 36.9921, lon: 127.1127 },
  { key: "ansan", name: "경기 안산시", lat: 37.3219, lon: 126.8309 },
  { key: "anyang", name: "경기 안양시", lat: 37.3943, lon: 126.9568 },
  { key: "bucheon", name: "경기 부천시", lat: 37.5034, lon: 126.7660 },
  { key: "siheung", name: "경기 시흥시", lat: 37.3802, lon: 126.8029 },
  { key: "gimpo", name: "경기 김포시", lat: 37.6153, lon: 126.7156 },
  { key: "paju", name: "경기 파주시", lat: 37.7599, lon: 126.7802 },
  { key: "goyang", name: "경기 고양시", lat: 37.6584, lon: 126.8320 },
  { key: "namyangju", name: "경기 남양주시", lat: 37.6360, lon: 127.2165 },
  { key: "uijeongbu", name: "경기 의정부시", lat: 37.7381, lon: 127.0338 },
  { key: "icheon", name: "경기 이천시", lat: 37.2721, lon: 127.4350 },
  { key: "anseong", name: "경기 안성시", lat: 37.0079, lon: 127.2797 },
  { key: "yangju", name: "경기 양주시", lat: 37.7853, lon: 127.0458 },
  { key: "pochen", name: "경기 포천시", lat: 37.8949, lon: 127.2003 },

  // 강원
  { key: "chuncheon", name: "강원 춘천시", lat: 37.8813, lon: 127.7298 },
  { key: "wonju", name: "강원 원주시", lat: 37.3422, lon: 127.9202 },
  { key: "gangneung", name: "강원 강릉시", lat: 37.7519, lon: 128.8761 },
  { key: "sokcho", name: "강원 속초시", lat: 38.2070, lon: 128.5918 },
  { key: "donghae", name: "강원 동해시", lat: 37.5247, lon: 129.1143 },
  { key: "samcheok", name: "강원 삼척시", lat: 37.4499, lon: 129.1652 },

  // 충북
  { key: "cheongju", name: "충북 청주시", lat: 36.6424, lon: 127.4890 },
  { key: "chungju", name: "충북 충주시", lat: 36.9910, lon: 127.9259 },
  { key: "jecheon", name: "충북 제천시", lat: 37.1326, lon: 128.1910 },
  { key: "jincheon", name: "충북 진천군", lat: 36.8554, lon: 127.4356 },
  { key: "eumseong", name: "충북 음성군", lat: 36.9402, lon: 127.6905 },

  // 충남
  { key: "cheonan", name: "충남 천안시", lat: 36.8151, lon: 127.1139 },
  { key: "asan", name: "충남 아산시", lat: 36.7898, lon: 127.0018 },
  { key: "seosan", name: "충남 서산시", lat: 36.7848, lon: 126.4503 },
  { key: "dangjin", name: "충남 당진시", lat: 36.8930, lon: 126.6283 },
  { key: "gongju", name: "충남 공주시", lat: 36.4465, lon: 127.1190 },
  { key: "nonsan", name: "충남 논산시", lat: 36.1871, lon: 127.0987 },
  { key: "boryeong", name: "충남 보령시", lat: 36.3334, lon: 126.6129 },
  { key: "hongseong", name: "충남 홍성군", lat: 36.6013, lon: 126.6608 },
  { key: "yesan", name: "충남 예산군", lat: 36.6827, lon: 126.8489 },
  { key: "taean", name: "충남 태안군", lat: 36.7456, lon: 126.2979 },

  // 전북
  { key: "jeonju", name: "전북 전주시", lat: 35.8242, lon: 127.1480 },
  { key: "iksan", name: "전북 익산시", lat: 35.9483, lon: 126.9576 },
  { key: "gunsan", name: "전북 군산시", lat: 35.9676, lon: 126.7369 },
  { key: "jeongeup", name: "전북 정읍시", lat: 35.5699, lon: 126.8560 },
  { key: "namwon", name: "전북 남원시", lat: 35.4164, lon: 127.3904 },
  { key: "wanju", name: "전북 완주군", lat: 35.9047, lon: 127.1621 },
  { key: "buan", name: "전북 부안군", lat: 35.7316, lon: 126.7333 },
  { key: "gochang", name: "전북 고창군", lat: 35.4358, lon: 126.7021 },
  { key: "sunchang", name: "전북 순창군", lat: 35.3744, lon: 127.1375 },
  { key: "im실", name: "전북 임실군", lat: 35.6179, lon: 127.2890 },
  { key: "jangu", name: "전북 장수군", lat: 35.6472, lon: 127.5210 },
  { key: "muju", name: "전북 무주군", lat: 36.0068, lon: 127.6608 },
  { key: "jinan", name: "전북 진안군", lat: 35.7918, lon: 127.4249 },

  // 전남
  { key: "mokpo", name: "전남 목포시", lat: 34.8118, lon: 126.3922 },
  { key: "yeosu", name: "전남 여수시", lat: 34.7604, lon: 127.6622 },
  { key: "suncheon", name: "전남 순천시", lat: 34.9506, lon: 127.4872 },
  { key: "gwangyang", name: "전남 광양시", lat: 34.9407, lon: 127.6959 },
  { key: "naju", name: "전남 나주시", lat: 35.0161, lon: 126.7108 },
  { key: "damyang", name: "전남 담양군", lat: 35.3211, lon: 126.9879 },
  { key: "hwasun", name: "전남 화순군", lat: 35.0645, lon: 126.9865 },
  { key: "haenam", name: "전남 해남군", lat: 34.5735, lon: 126.5993 },
  { key: "yeongam", name: "전남 영암군", lat: 34.8002, lon: 126.6968 },
  { key: "muan", name: "전남 무안군", lat: 34.9903, lon: 126.4817 },

  // 경북
  { key: "pohang", name: "경북 포항시", lat: 36.0190, lon: 129.3435 },
  { key: "gyeongju", name: "경북 경주시", lat: 35.8562, lon: 129.2247 },
  { key: "gumi", name: "경북 구미시", lat: 36.1195, lon: 128.3446 },
  { key: "andong", name: "경북 안동시", lat: 36.5684, lon: 128.7294 },
  { key: "gimcheon", name: "경북 김천시", lat: 36.1398, lon: 128.1136 },
  { key: "yeongju", name: "경북 영주시", lat: 36.8057, lon: 128.6241 },
  { key: "sangju", name: "경북 상주시", lat: 36.4109, lon: 128.1591 },
  { key: "mungyeong", name: "경북 문경시", lat: 36.5866, lon: 128.1869 },
  { key: "yecheon", name: "경북 예천군", lat: 36.6577, lon: 128.4529 },
  { key: "uiseong", name: "경북 의성군", lat: 36.3527, lon: 128.6971 },

  // 경남
  { key: "changwon", name: "경남 창원시", lat: 35.2280, lon: 128.6811 },
  { key: "gimhae", name: "경남 김해시", lat: 35.2285, lon: 128.8894 },
  { key: "jinju", name: "경남 진주시", lat: 35.1800, lon: 128.1076 },
  { key: "yangsan", name: "경남 양산시", lat: 35.3350, lon: 129.0370 },
  { key: "geoje", name: "경남 거제시", lat: 34.8806, lon: 128.6211 },
  { key: "tongyeong", name: "경남 통영시", lat: 34.8544, lon: 128.4332 },
  { key: "miryang", name: "경남 밀양시", lat: 35.5038, lon: 128.7465 },
  { key: "sacheon", name: "경남 사천시", lat: 35.0038, lon: 128.0643 },
  { key: "haman", name: "경남 함안군", lat: 35.2725, lon: 128.4066 },
  { key: "geochang", name: "경남 거창군", lat: 35.6867, lon: 127.9095 },

  // 제주
  { key: "jeju", name: "제주 제주시", lat: 33.4996, lon: 126.5312 },
  { key: "seogwipo", name: "제주 서귀포시", lat: 33.2541, lon: 126.5601 }
];

const REGION_MAP = Object.fromEntries(
  REGION_LIST.map((region) => [region.key, region])
);

const REGION_ALIAS = {
  김제: "gimje",
  김제시: "gimje",
  전주: "jeonju",
  전주시: "jeonju",
  익산: "iksan",
  익산시: "iksan",
  군산: "gunsan",
  군산시: "gunsan",
  완주: "wanju",
  완주군: "wanju",
  부안: "buan",
  부안군: "buan",

  서울: "seoul",
  부산: "busan",
  대구: "daegu",
  인천: "incheon",
  광주: "gwangju",
  대전: "daejeon",
  울산: "ulsan",
  세종: "sejong",

  수원: "suwon",
  용인: "yongin",
  화성: "hwaseong",
  평택: "pyeongtaek",
  고양: "goyang",
  파주: "paju",

  춘천: "chuncheon",
  원주: "wonju",
  강릉: "gangneung",

  청주: "cheongju",
  충주: "chungju",
  천안: "cheonan",
  아산: "asan",
  서산: "seosan",
  당진: "dangjin",

  목포: "mokpo",
  여수: "yeosu",
  순천: "suncheon",
  광양: "gwangyang",
  나주: "naju",

  포항: "pohang",
  경주: "gyeongju",
  구미: "gumi",
  안동: "andong",

  창원: "changwon",
  김해: "gimhae",
  진주: "jinju",
  양산: "yangsan",
  거제: "geoje",

  제주: "jeju",
  서귀포: "seogwipo"
};

function findLocalRegionByKeyword(keyword) {
  const value = keyword.trim();

  if (!value) return null;

  if (REGION_ALIAS[value]) {
    return REGION_MAP[REGION_ALIAS[value]];
  }

  const exact = REGION_LIST.find((region) => region.name === value);
  if (exact) return exact;

  const included = REGION_LIST.find((region) => region.name.includes(value));
  if (included) return included;

  return null;
}