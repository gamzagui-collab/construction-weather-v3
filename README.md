# GUI's Arc v5.0 Field System

건설현장 강수·온도·안전·작업가이드 웹앱입니다.

## v5.0 핵심 변경
- 역할 선택 상단 가로 배치
- 공종 선택 전체 폭 레이아웃
- 대분류별 접기/펼치기 아코디언
- 검색·자주 찾는 공종·선택 공종 태그 개선
- 역할 + 공종 + 날씨 기반 오늘의 할 일 생성 구조 유지

## 배포
1. GitHub 저장소에 파일 덮어쓰기
2. `git add .`
3. `git commit -m "Refactor field guide work selector"`
4. `git push`
5. Cloudflare Worker의 `worker/worker.js` 전체 교체 후 Deploy
