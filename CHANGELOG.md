# GUI's Arc v6.0.1

- 07:00~17:00 작업시간 기준을 UI 전반에 명확히 반영
- 탭 디자인 및 아이콘 시인성 개선
- 헤더/안전바/카드 디자인 고도화
- 역할 순서 변경: 현장소장 → 안전관리자 → 품질관리자 → 공사관리자 → 장비관리자 → 자재관리자
- 공정별 위험요소 문구 강조 표시
- 건축형 SVG 브랜드 로고 적용


## v6.2 Integrated Site Schedule
- Added separated safety guide and field guide tabs.
- Added site schedule calendar for material/equipment delivery records.
- Added schedule-driven safety/field task generation.
- Added accident briefing poster-style news cards and source links.


## v6.2 Final
- Fixed TBM text readability.
- Moved safety-related guide content into Today Safety Guide.
- Updated Serious Accident Siren URL to the Industrial Safety Portal.
- Finalized v6.2 before v6.3 AI assistant work.


## v6.2.1 KOSHA Accident API
- Added Cloudflare Worker `/accidents` endpoint.
- Added KOSHA disaster case API integration.
- Added attachment API integration.
- Accident briefing now shows occurredAt, region, trade, accidentType and checks.

## v6.3 Worker Modular & AI Assistant
- Added worker-modular folder.
- Added `/ai-assistant` route.
- Added standards library seed DB.
- Kept bundled `worker/worker.js` for Cloudflare dashboard paste deployment.

## v6.3.1 KOSHA Stable
- Added handleAccidentsV631 stable route.
- Prevented raw KOSHA 500 errors from appearing in briefing UI.

## v6.4 Enterprise Foundation
- Added platform config, standards library seed DB, enterprise status client, AI field assistant client, and worker-enterprise skeleton.
