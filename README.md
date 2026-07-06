# GUI's Arc v4.2 Today Field Guide

건설현장 강수 예보와 온도·안전관리 판단을 위한 웹앱입니다.

## 주요 기능

- 7일 1시간 단위 강수 예보
- KMA 단기예보 1~3일 강수량(mm/hr)
- KMA 중기예보 4~7일 강수확률(%)
- ECMWF / GFS / JMA 7일 강수량 비교
- 강우량 위험도 자동 판정
- 온도·안전관리 탭
- 기온, 체감온도, 습도, 풍속 기반 작업관리 판단
- 습도 체감 표현: 예) 60% = 덜 마른 빨래를 입은 듯한 느낌
- Windy 지도, 좌표 선택 지도, 공유 링크, 다크모드

## 배포

1. GitHub 저장소에 업로드
2. Cloudflare Pages에서 정적 사이트 배포
3. `worker/worker.js` 내용을 Cloudflare Worker에 붙여넣고 Deploy
4. Worker 환경변수 `KMA_API_KEY` 등록

## Worker URL

`js/api.js`의 `WORKER_BASE_URL`을 본인의 Worker 주소로 수정하세요.

```js
const WORKER_BASE_URL = "https://weather-proxy.gamzagui.workers.dev";
```


## v4.1 Health Safety Refactor
- 날짜별 섹션 구분 행 추가
- 강수/온도 표 모바일 가로 스크롤 안정화
- 오늘 체감온도 그래프와 위험수위 스티커 추가


## v4.1 Health Safety

- 온열·한랭 건강관리 위험도 카드 추가
- 체감상황 생활 표현, 예상 질환, 중점관리, 응급 대응 표시
- 오늘 체감온도 그래프 위험 스티커 유지
