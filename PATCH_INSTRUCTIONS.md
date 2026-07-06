# GUI's Arc v6.1.1 건설사고 브리핑 탭 적용 방법

## 1. 파일 복사

이 ZIP의 내용을 기존 GUI's Arc 프로젝트 루트에 덮어쓰기 합니다.

추가되는 파일:

- css/accidentBriefing.css
- js/database/accidentCases.js
- js/database/safetySources.js
- js/fieldguide/accidentBriefingTab.js
- data/accidents/*

## 2. index.html에 아래 2줄 추가

head 안에 추가:

```html
<link rel="stylesheet" href="css/accidentBriefing.css">
```

body 맨 아래 기존 script들 아래에 추가:

```html
<script type="module" src="js/fieldguide/accidentBriefingTab.js"></script>
```

## 3. 기능

새 탭 이름:

🚨 건설사고 브리핑

자동 생성 내용:

- 📅 오늘 발생 사고 표시 영역
- 📍 발생 지역
- 🏗 공종
- ⚠ 사고유형
- ❗ 주요 원인
- ✅ 우리 현장에서 확인할 사항 5가지
- 📋 TBM 교육자료 자동 생성
- 📚 공식 확인 채널 4개 바로가기

## 4. 주의

현재 포함된 사고 DB는 실제 10년 사고 원자료가 아니라 공종별 사고위험 매칭용 시드 DB입니다.
실제 신규 사고는 하단 공식 채널을 확인하세요.
