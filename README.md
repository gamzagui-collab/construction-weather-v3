# GUI's Arc v6.0 Refactor

건설현장 날씨·안전·작업가이드 통합 웹앱입니다.

## 주요 개선
- v5 계열 기능 유지
- 코드 구조 정리 기준 버전
- 온도·습도·풍속 음영을 더 부드러운 색상으로 개선
- 상단 안전바 가독성 개선
- 오늘의 현장가이드 출력 영역 정리
- 공종 대분류 아코디언/검색/자주 찾는 공종 구조 유지

## 적용 방법
1. 기존 Git 폴더에 ZIP 내용 덮어쓰기
2. `worker/worker.js`를 Cloudflare Worker에 전체 붙여넣고 Deploy
3. VS Code 터미널에서 실행

```bash
git add .
git commit -m "Release GUI's Arc v6.0 refactor"
git push
```

## 참고
Cloudflare Pages 배포 후 화면이 바뀌지 않으면 Ctrl+F5 또는 `?v=6`을 붙여 새로고침하세요.
