# Planny

**AI 미래 소비 캘린더.** 캘린더에 일정을 넣으면 AI가 그 일정에 드는 돈을 예측하고, 이번 달 예산에 어떤 영향이 있는지와 어떻게 줄이면 되는지 알려주는 앱이에요. "가계부"가 아니라 **미래 소비 내비게이션**이 목표예요.

- 기획서: [Notion - AI 기반 미래 소비 예측 캘린더](https://app.notion.com/p/422830fac55f8096ac6ef9c311d0bc02)

> 지금은 **목업 단계**예요. 화면과 구조는 잡혀 있고 기본 흐름은 동작하지만, 데이터는 샘플이고 기능은 단순하게만 들어가 있어요. 코드 곳곳의 `TODO:`가 다음에 다듬을 곳이에요.

## 실행

```bash
npm install
npm run dev
```

http://localhost:3000 을 열면 돼요. 휴대폰 화면 기준(최대 폭 440px)이라 브라우저 개발자 도구의 모바일 보기로 보면 편해요. 처음 열면 오늘 날짜 기준 샘플 데이터가 만들어지고, 데이터는 브라우저 localStorage에 저장돼요.

### AI 예측 켜기 (선택)

```bash
cp .env.example .env.local
```

`.env.local`에 `ANTHROPIC_API_KEY`를 넣고 서버를 다시 켜면 `/api/predict`가 Claude(`claude-opus-5-5`)로 예측해요. 키가 없으면 키워드 기반 목업 예측이 대신 돌아가서, 키 없이도 화면은 다 써볼 수 있어요.

## 서버

`server/` 폴더에 API 서버(Spring Boot 4.2, Java 25, PostgreSQL 18)가 있어요. 가입과 로그인, 내 정보, 일정, 거래, 내 데이터 전체를 저장해요. 아직 프론트와는 연결하지 않았어요.

```bash
cd server
./gradlew bootRun
```

Docker Desktop만 켜 두면 JDK와 DB는 알아서 준비돼요. http://localhost:8080/swagger-ui.html 에서 API를 바로 불러 볼 수 있어요. 자세한 건 [server/README.md](server/README.md)에 있어요.

## 화면

| 경로 | 화면 | 컴포넌트 |
| --- | --- | --- |
| `/` | 홈: 이번 주 예상 지출과 주간 날짜 줄(펼치면 점 히트맵 월 달력), 고른 날의 일정·지출, 예측 타일, 예측 카드, 다가오는 지출, 카테고리별 | `components/home/` |
| `/insights` | 분석: 최근 30일 카테고리별 지출, 요일별 패턴, 자주 가는 곳, 일정 종류별 평균 | `components/insights/` |
| `/events/new` | 일정 추가: 문장 입력 → 예상 지출 → 예산 영향 → 저장 | `components/events/` |
| `/simulate` | 조정: 카테고리별로 줄여보는 시뮬레이션 | `components/simulate/` |
| `/settings` | 설정: 월 예산, 이름, 화면 테마(시스템, 다크, 라이트), 샘플 데이터 초기화 | `components/settings/` |

## 폴더 구조

```
src/
├─ app/                       라우트 (page.tsx는 얇게, 화면 내용은 components로)
│  ├─ page.tsx                홈
│  ├─ events/new/page.tsx     일정 추가
│  ├─ insights/page.tsx       소비 분석
│  ├─ simulate/page.tsx       조정 시뮬레이션
│  ├─ settings/page.tsx       설정
│  └─ api/predict/route.ts    예측 API (POST)
├─ components/
│  ├─ layout/                 앱 틀, 하단 탭
│  ├─ ui/                     공용 UI (Card, Button, PageHeader, StatusBadge, CategoryIcon)
│  └─ home/ events/ insights/ simulate/ settings/   화면별 컴포넌트
└─ lib/
   ├─ types.ts                ★ 공용 타입 (모듈 사이 약속)
   ├─ store.tsx               앱 데이터 상태 + localStorage 저장
   ├─ forecast.ts             월말 예상 잔액 계산 (돈 계산은 전부 여기)
   ├─ suggestions.ts          예산 조정 제안
   ├─ insights.ts             소비 패턴 분석 (카테고리·요일·자주 가는 곳·일정 종류별)
   ├─ home-summary.ts         홈 요약 (이번 주, 연속 기록, 다가오는 지출, 카테고리별 전망)
   ├─ theme.ts                화면 테마(시스템, 다크, 라이트) 저장과 적용
   ├─ history.ts              AI에 넘길 과거 소비 요약
   ├─ mock-data.ts            샘플 데이터 (오늘 기준으로 생성)
   ├─ api.ts                  브라우저 → /api/predict 호출
   ├─ predict/
   │  ├─ index.ts             키가 있으면 Claude, 없으면 목업
   │  ├─ claude.ts            Claude 호출 (서버 전용)
   │  └─ mock.ts              키워드 기반 목업 예측
   └─ categories.ts, date.ts, format.ts   이름표, 날짜, 금액 표시
```

## 데이터 흐름

1. `/events/new`에서 일정을 문장으로 입력
2. `lib/api.ts`가 과거 소비 요약(`history.ts`)과 함께 `POST /api/predict` 호출
3. `predict/index.ts`가 Claude 또는 목업으로 `EventPrediction`(항목별 예상 비용과 근거)을 만듦
4. `forecast.ts`가 그 예측을 넣고 빼서 월말 예상 잔액을 계산하고, 화면이 예산 영향을 보여줌
5. 저장하면 `store.tsx`가 localStorage에 기록하고 홈 달력에 반영

원칙: **AI는 "얼마쯤 들지" 추정만 하고, 잔액이나 초과 금액 같은 계산은 코드(`forecast.ts`, `suggestions.ts`)가 해요.** AI에게 계산을 맡기면 숫자가 틀릴 수 있어서예요.

## 역할 나누기 제안

겹치는 파일이 적도록 "화면 + 그 화면이 쓰는 로직" 단위로 나눴어요.

| | 파트 A: 캘린더·예산 | 파트 B: 일정·AI |
| --- | --- | --- |
| 화면 | `/` (`components/home/`), `/insights`, `/simulate` | `/events/new` (`components/events/`), `/settings` |
| 로직 | `forecast.ts`, `suggestions.ts`, `insights.ts`, `home-summary.ts`, `mock-data.ts` | `predict/*`, `app/api/predict`, `history.ts`, `api.ts` |

- `lib/types.ts`는 양쪽이 다 쓰는 약속이에요. 필드를 바꿀 땐 서로 말하고 같이 맞춰 주세요.
- `components/ui/`, `globals.css`(색상), `lib/theme.ts`(화면 테마)도 함께 쓰는 곳이에요.
- 서버(`server/`)는 `C: 서버` 라벨로 따로 관리해요.

## 개발 규칙

- 브랜치, 커밋 메시지, PR, 라벨 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)에 있어요.
- 날짜는 `'YYYY-MM-DD'`, 월은 `'YYYY-MM'` 문자열로 다뤄요 (`lib/date.ts`).
- 색은 hex 대신 토큰 클래스를 써요: `bg-surface`, `bg-surface-2`, `text-ink`, `text-ink-2`, `text-muted`, `bg-primary` 등 (`globals.css`). 다크가 기본이고, 설정에서 테마를 바꾸면 토큰 값만 바뀌어요 (`lib/theme.ts`).
- 예산 상태(여유·빠듯·초과)는 색만으로 보여주지 않고 `StatusBadge`(아이콘 + 글자)를 써요.
- Next.js 16은 예전 버전과 다른 점이 많아요. 헷갈리면 `node_modules/next/dist/docs/`를 먼저 확인해요 (`AGENTS.md` 참고).

## 다음에 할 일 (목업에서 빠진 것)

- 지출 직접 기록하기, 카드 내역 CSV 가져오기
- 일정 상세 화면(`/events/[id]`): 예측 금액 고치기, 끝난 일정에 실제 지출 연결하기
- 고정 지출(월세·구독) 따로 관리하기
- AI 프롬프트 다듬기, 예상과 실제 지출 비교해서 정확도 보기
- 프론트를 서버에 연결하기: 로그인 화면, `store.tsx`를 서버 API로 바꾸기, 기기 데이터 올리기
- 서버 배포
- 테스트

## 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Claude API (`@anthropic-ai/sdk`) · Tabler 아이콘 (`@tabler/icons-react`) · Wanted Sans 폰트

서버: Java 25, Spring Boot 4.2, PostgreSQL 18, Spring Modulith, OpenTelemetry, Testcontainers
