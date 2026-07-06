# GUI's Weather · Construction Weather v3.2 Final

건설현장 콘크리트 타설 및 작업 판단용 강수 예보 웹앱입니다.

## 구성

- Cloudflare Pages: 정적 웹앱 배포
- Cloudflare Worker: KMA/Open-Meteo API 프록시 및 통합 예보
- KMA 단기예보: 1~3일 강수량(mm/hr)
- KMA 중기예보: 4~7일 강수확률(%)
- Open-Meteo: ECMWF/GFS/JMA 7일 1시간 강수량(mm/hr)

## 배포

1. GitHub 저장소에 업로드
2. Cloudflare Pages에서 저장소 연결
3. `worker/worker.js`를 Cloudflare Worker 코드에 붙여넣고 Deploy
4. Worker Secret에 `KMA_API_KEY` 등록

## Git 명령

```bash
git add .
git commit -m "Release GUI's Weather v3.2 Final"
git push
```
