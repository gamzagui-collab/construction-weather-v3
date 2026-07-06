# GUI's Arc v6.2 적용 안내

이 패치는 기존 프로젝트에 다음 기능을 추가합니다.

## 추가 기능

- 탭 구조 분리
  - 🌧 강수 예보
  - 🌡 온도·안전관리
  - 🛡 오늘의 안전가이드
  - 🏗 오늘의 현장가이드
  - 📅 현장스케줄
  - 🚨 건설사고 브리핑

- 현장스케줄
  - 달력형 공정표 느낌
  - 자재명, 반입일시, 하차방법, 수량, 장비 기록
  - localStorage 저장

- 자동 반영
  - 현장스케줄 → 오늘의 안전가이드
  - 현장스케줄 → 오늘의 현장가이드

- 건설사고 브리핑
  - 매일 바뀌는 포스터형 사고사례 카드 8개 이하
  - 공식 채널 4개 바로가기

## index.html 추가

`<head>` 안:

```html
<link rel="stylesheet" href="css/v62-schedule-guides.css">
```

`</body>` 바로 위, 기존 script 아래:

```html
<script type="module" src="js/guides/v62Tabs.js"></script>
<script type="module" src="js/schedule/siteSchedule.js"></script>
<script type="module" src="js/guides/splitGuides.js"></script>
<script type="module" src="js/accidents/accidentNews.js"></script>
```

## 주의

중대재해 사이렌 포스터 원문은 저작권과 CORS 문제가 있으므로 본 패치는 공식 링크를 열어 확인하는 구조입니다.
향후 Worker에서 공식 게시글 API 또는 수동 등록 JSON을 연결하면 실제 포스터 URL을 표시할 수 있습니다.
