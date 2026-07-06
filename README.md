# GUI's Arc v6.0 Phase 1 Modular Refactor

실제 모듈 구조를 적용한 1단계 리팩터링본입니다.

## 구조
- js/api
- js/weather
- js/safety
- js/fieldguide
- js/database
- js/charts
- js/export
- js/ai
- js/ui

## 주의
Phase 1은 프론트 구조 분리용입니다. Cloudflare Worker는 기존 운영 중인 forecast Worker를 유지해도 됩니다.
