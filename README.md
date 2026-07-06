# GUI's Arc v4.7 Work Accordion

건설현장 날씨·안전·공정 가이드 웹앱입니다.

## 주요 개선
- 오늘의 현장가이드 공종 DB 선택 화면 전문화
- 대공종별 접기/펼치기 UI
- 전체 공종 또는 50개 이상 공종 선택 대응
- 검색창 + 자주 찾는 공종 + 대분류 선택 병행

## 적용
1. 압축을 기존 Git 폴더에 덮어쓰기
2. `worker/worker.js`를 Cloudflare Worker에 전체 붙여넣고 Deploy
3. 아래 명령 실행

```bash
git add .
git commit -m "Improve work trade selector with accordion"
git push
```
