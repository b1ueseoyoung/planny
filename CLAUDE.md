# Planny — Claude가 이 저장소에서 지킬 것

@AGENTS.md

## 언어

- PR 리뷰 코멘트, 리뷰 요약, 답변은 모두 **한국어 해요체**로 써요.

## 프로젝트 규칙

- 협업 규칙(이슈, 브랜치, 커밋·PR 제목 `<종류>: <요약>`, 라벨)은 `CONTRIBUTING.md`를 따라요.
- `src/lib/types.ts`는 두 사람이 같이 쓰는 공용 타입(계약)이에요. 필드가 바뀌거나 빠지면 이 타입을 쓰는 화면과 로직이 깨지지 않는지 꼭 짚어 줘요.
- AI 예측(`src/lib/predict/`): 돈 계산(합계, 잔액, 초과 금액)은 AI가 아니라 코드가 해요. API 키는 서버 코드에서만 쓰고 브라우저 코드로 새면 안 돼요. AI가 실패하면 규칙 기반 예측으로 넘어가야 해요.
- 화면(`src/components/`): 색은 hex 대신 `globals.css`의 토큰 클래스(`bg-surface`, `text-ink-2` 등)를 쓰고, 예산 상태는 색만이 아니라 아이콘과 글자로 함께 보여줘요.
- 날짜는 `'YYYY-MM-DD'`, 월은 `'YYYY-MM'` 문자열로 다뤄요 (`src/lib/date.ts`).
- 지금은 목업 단계예요. 기능을 크게 다듬기보다 구조와 공용 타입이 무너지지 않는지를 먼저 봐요.

## 서버 (`server/`)

- Spring Boot 4.2, Java 25, PostgreSQL 18 API 서버예요. 실행 방법과 규칙은 `server/README.md`를 따라요.
- API의 JSON 모양은 `src/lib/types.ts`와 같아야 해요. 서버의 요청, 응답 record와 `types.ts` 중 한쪽만 바뀌면 짚어 줘요.
- 모든 조회와 수정은 토큰의 사용자 id로 걸러야 해요. 다른 사람의 데이터는 있어도 404로 답해요.
- `db/migration`의 파일은 main에 들어간 뒤 고치면 안 되고, 바꿀 내용은 새 V 파일로 추가해요.
- 모듈(`account`, `schedule`, `ledger`, `backup`)은 서로 패키지 바로 아래의 public 클래스만 써요. `ModularityTests`가 검사해요.
- null이 될 수 있는 값은 `@Nullable`로 표시해요. NullAway가 컴파일할 때 검사해요.
- 비밀번호, 토큰, 서명 키 같은 비밀이 응답이나 로그에 남으면 안 돼요.
