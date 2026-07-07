# GUI's Arc v6.4 Enterprise Foundation

## 목표

GUI's Arc를 단순 날씨 앱이 아니라 건설현장 의사결정 플랫폼으로 확장하기 위한 기반입니다.

## 데이터 흐름

오늘 공종 + 현장스케줄 + 날씨 + KOSHA 사고사례 + KCS/법령 메타DB
→ AI 현장비서
→ 오늘의 안전가이드 / 오늘의 현장가이드 / TBM / 체크리스트

## 포함된 기반

- `data/enterprise/platform_config.json`
- `data/standards/standards_library_seed.json`
- `js/enterprise/platformStatus.js`
- `js/ai/fieldAssistantClient.js`
- `worker-enterprise/`

## 주의

이번 버전은 v6.4의 기반 구조입니다. 기존 운영용 앱은 그대로 유지하고,
새 엔진을 점진적으로 연결하는 방식으로 안정적으로 확장합니다.
