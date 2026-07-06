# GUI's Arc v6.0 Stable

건설현장 강수·온도·안전·작업가이드 안정본입니다.

## 적용 원칙

이 버전은 기존에 동작하던 v5.1 코드를 안정 기준으로 고정한 버전입니다.
기능 추가보다 오류 방지와 실사용 안정성을 우선했습니다.

## 포함 기능

- 6일 시간별 강수 예보
- KMA / ECMWF / GFS / JMA 비교
- 온도·안전관리
- 오늘의 현장가이드
- 역할별 체크리스트
- 공종별 주의사항
- TBM 문구 생성
- CSV / 인쇄 출력
- Cloudflare Worker 연동

## 모듈화 계획

`js/modules/` 아래 폴더는 v6.1 이후 실제 모듈 이전을 위한 기준 구조입니다.
현재 안정본은 기존 `js/app.js`, `js/ui.js`, `js/api.js`를 중심으로 동작합니다.

## 배포

1. `.git` 폴더만 남기고 기존 파일 삭제
2. 이 ZIP 압축 해제
3. `git add .`
4. `git commit -m "Release GUI's Arc v6.0 Stable"`
5. `git push`
6. `worker/worker.js`를 Cloudflare Worker에 붙여넣고 Deploy
