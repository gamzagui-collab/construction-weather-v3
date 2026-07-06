# GUI's Arc v5.1 Field System Fixes

건설현장 날씨·안전·작업가이드 웹앱입니다.

## 주요 수정
- 오늘의 현장가이드 공종 선택 UI 안정화
- 공정별 주의사항 역할별 분리 표시
- 공정 체크리스트 복사/CSV/PDF 출력
- 기상 데이터 기반 작업관리 조언 개선
- 상단 안전 상태바 가독성 개선

## 적용
1. 기존 프로젝트 폴더에 덮어쓰기
2. `worker/worker.js`를 Cloudflare Worker에 배포
3. Git 반영

```bash
git add .
git commit -m "Apply v5.1 field system fixes"
git push
```
