# GUI's Arc v6.3 Worker 모듈화 안내

현재 rebase 충돌 상태라면 먼저 실행하세요.

```bash
git rebase --abort
```

그 다음 최신 GitHub를 새 폴더에 clone한 뒤 이 ZIP을 덮어쓰는 방식이 가장 안전합니다.

## 운영용 Worker

Cloudflare 대시보드에서 직접 붙여넣는 경우:

```text
worker/worker.js
```

를 전체 붙여넣고 Deploy 하세요.

## 모듈형 Worker

Wrangler 배포로 전환할 때는:

```text
worker-modular/index.js
worker-modular/routes/*
worker-modular/utils/*
```

구조를 사용합니다.

## 새 API

```text
/accidents
/ai-assistant
```

테스트:

```text
https://weather-proxy.gamzagui.workers.dev/accidents?business=건설업&numOfRows=10
https://weather-proxy.gamzagui.workers.dev/ai-assistant?trades=철근공사,콘크리트%20타설
```
