# GUI's Arc v6.0 Phase 4 Final Integration

건설현장 날씨·안전·공정 판단을 통합하는 현장 운영 보조 웹앱입니다.

## 구성
- 강수 예보
- 온도·안전관리
- 오늘의 현장가이드
- 역할/공종 기반 체크리스트
- AI 작업판단
- 건설안전 브리핑
- TBM 자동 문구
- 오늘 작업일보

## 배포
1. 기존 프로젝트에서 `.git`만 남기고 파일 삭제
2. 이 ZIP의 내용을 복사
3. `git add .`
4. `git commit -m "Release GUI's Arc v6.0 Final Integration"`
5. `git push`
6. `worker/worker.js`를 Cloudflare Worker에 붙여넣고 Deploy
