# GUI's Arc v6.0.1

건설현장 날씨·안전·작업가이드 안정 개선판입니다.

## 적용

1. 기존 프로젝트 백업
2. `.git` 폴더는 유지
3. ZIP 내용을 덮어쓰기
4. `git add .` → `git commit` → `git push`
5. `worker/worker.js`를 Cloudflare Worker에 배포


## v6.2 Integrated
- 탭 구조 분리: 강수 예보 / 온도·안전관리 / 오늘의 안전가이드 / 오늘의 현장가이드 / 현장스케줄 / 건설사고 브리핑
- 현장스케줄 달력형 기록
- 자재·장비 반입 기록을 안전가이드와 현장가이드에 자동 반영
- 건설사고 브리핑 포스터형 카드


## v6.2 Final
- TBM 전달문 흰색 글자 버그 수정
- 오늘의 안전가이드에 안전관리자·공정별 안전주의·건설사고 브리핑·TBM 항목 통합
- 오늘의 현장가이드는 공사·품질·자재·장비 중심으로 정리
- 중대재해 사이렌 링크를 산업안전포털 최신 경로로 변경


## v6.2.1 KOSHA 사고사례 API
- `/accidents` Worker route 추가
- 공공데이터포털 국내재해사례 게시판 정보 조회서비스 연동
- 첨부파일 정보 조회서비스 연동
- 건설사고 브리핑 카드에 발생일시/지역/공종/사고유형/원인 표시
- API 실패 시 시드 DB로 자동 fallback

## v6.3 Worker Modular & AI Assistant
- Worker 모듈화 기준 구조 추가
- `/accidents` KOSHA 사고사례 API 유지
- `/ai-assistant` AI 현장비서 API 추가
- KCS/산업안전보건기준/품질/감리지적 연결용 기준 라이브러리 초안 추가

## v6.3.1 KOSHA Stable
- KOSHA API HTTP 500 시 화면 깨짐 방지
- http/https 및 callApiId 조합 순차 시도
- 실패 시 시드 DB fallback

## v6.4 Enterprise Foundation
- 건설현장 운영 플랫폼 구조 기반 추가
- Standards Library seed DB 추가
- AI 현장비서 클라이언트 기반 추가
- Enterprise Worker skeleton 추가
