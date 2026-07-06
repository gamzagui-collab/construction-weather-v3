# v6.2.1 KOSHA 사고사례 API 적용 안내

## Cloudflare Worker Secret

이미 KMA_API_KEY가 공공데이터포털 인증키라면 재사용됩니다.

권장:
- Worker Settings → Variables → Secret
- `KOSHA_API_KEY` = 공공데이터포털 일반 인증키

없으면 `KMA_API_KEY`를 자동 사용합니다.

## 확인 주소

Worker 배포 후 브라우저에서 확인:

`https://weather-proxy.gamzagui.workers.dev/accidents?business=건설업&numOfRows=10`

정상이라면 JSON에 `rows`가 표시됩니다.

## 주의

API 응답에 정확한 발생일시가 별도 필드로 없으면 본문에서 `발생일시`, `재해발생일시`, `사고일시`를 자동 추출합니다.
본문에도 없으면 `공식 원문 확인`으로 표시합니다.
