# Planny 서버

Planny의 API 서버입니다. 가입과 로그인, 내 정보(이름, 한 달 예산), 일정(AI 예측 결과 포함), 거래, 내 데이터 전체 내보내기와 바꾸기를 맡습니다. JSON 모양은 프론트의 `src/lib/types.ts`와 같습니다.

- Java 25, Spring Boot 4.2, PostgreSQL 18
- 아직 프론트와는 연결하지 않았습니다. 프론트는 지금처럼 localStorage를 씁니다.

## 실행

필요한 것은 Docker Desktop 하나입니다. JDK 25는 Gradle이 처음 실행할 때 내려받고, DB는 컨테이너로 뜹니다.

```bash
cd server
./gradlew bootRun
```

- `compose.yaml`의 PostgreSQL 18 컨테이너가 함께 뜨고, Flyway가 스키마를 맞춥니다.
- http://localhost:8080/swagger-ui.html 에서 API를 보고 바로 불러 볼 수 있습니다.
  1. `POST /api/v1/auth/signup`으로 가입합니다.
  2. 응답의 `accessToken`을 오른쪽 위 Authorize에 넣습니다.
  3. 나머지 API를 부릅니다.
- 로컬에서는 JWT 서명 키를 임시로 만듭니다. 서버를 다시 켜면 그전 토큰은 무효가 되니 다시 로그인합니다.
- DB에 직접 붙으려면 `docker compose port postgres 5432`로 포트를 확인합니다. 사용자, 비밀번호, DB 이름은 모두 `planny`입니다.

### 트레이스와 메트릭 보기 (선택)

```bash
./gradlew bootRun --args='--spring.profiles.active=otel'
```

Grafana LGTM 컨테이너가 함께 뜹니다. http://localhost:3001 에서 Tempo(트레이스)와 Prometheus(메트릭)를 봅니다. 트레이스에는 `Backup > Account`처럼 모듈 사이 호출이 모듈 이름으로 남습니다.

## 테스트

```bash
./gradlew build
```

Docker가 켜져 있어야 합니다. 테스트는 Testcontainers로 실제 PostgreSQL 18을 띄워서 돕니다. 빌드는 아래도 함께 검사합니다.

- 컴파일할 때 null 검사(NullAway): `@NullMarked` 패키지에서 null일 수 있는 값을 확인 없이 쓰면 컴파일이 실패합니다.
- 모듈 경계(Spring Modulith): 모듈이 다른 모듈의 내부 클래스를 쓰면 `ModularityTests`가 실패합니다.
- 모든 패키지에 `@NullMarked`가 붙었는지(`NullSafetyTests`)

PR에서는 GitHub Actions(서버 CI)가 같은 빌드를 돌립니다.

## API

주소는 모두 `/api/v1`로 시작합니다. 가입, 로그인, 토큰 교체, 로그아웃을 빼면 `Authorization: Bearer <accessToken>` 헤더가 있어야 합니다.

| 메서드와 경로 | 하는 일 |
| --- | --- |
| `POST /auth/signup` | 가입하고 바로 토큰을 받습니다 (이메일, 비밀번호 8자 이상, 이름은 선택) |
| `POST /auth/login` | 로그인 |
| `POST /auth/refresh` | 리프레시 토큰으로 새 토큰을 받습니다. 리프레시 토큰도 새로 바뀝니다 |
| `POST /auth/logout` | 이 기기의 로그인을 끝냅니다 |
| `GET /me` | 내 정보 (이메일, 이름, 한 달 예산) |
| `PATCH /me` | 이름이나 예산을 바꿉니다. 보낸 필드만 바뀝니다 |
| `DELETE /me` | 탈퇴. 내 토큰, 일정, 거래가 모두 지워집니다 |
| `GET /events?from=&to=` | 기간과 하루라도 겹치는 일정 (`CalendarEvent`) |
| `POST /events`, `GET/PUT/DELETE /events/{id}` | 일정 추가, 조회, 수정, 삭제. 일정을 지우면 연결된 거래는 남고 연결만 끊깁니다 |
| `GET /transactions?from=&to=` | 기간 안의 거래 (`Transaction`) |
| `POST /transactions`, `GET/PUT/DELETE /transactions/{id}` | 거래 추가, 조회, 수정, 삭제. 내 일정에만 연결할 수 있습니다 |
| `GET /app-data` | 내 데이터 전체 (`AppData`) |
| `PUT /app-data` | 내 데이터를 통째로 바꿉니다. 기기의 localStorage 데이터를 그대로 보내면 id를 새로 만들고 일정 연결을 유지합니다 |
| `GET /.well-known/jwks.json` | 액세스 토큰 검증용 공개 키 (버전 없는 주소) |

- 날짜는 `YYYY-MM-DD` 문자열입니다. 카테고리와 일정 종류는 `types.ts`의 소문자 값(`meal`, `friends` 등)을 씁니다.
- 다른 사람의 데이터는 있어도 404로 답해서 있는지조차 드러나지 않습니다.
- OpenAPI 문서는 `/v3/api-docs`에 있고, CI도 `openapi.json`을 결과물로 올립니다. 프론트에서 TypeScript 타입을 만들 때 쓸 수 있습니다.

### 토큰

- 액세스 토큰: 15분짜리 JWT(ES256)입니다.
- 리프레시 토큰: 30일짜리이고 한 번 쓰면 새 토큰으로 바뀝니다. 이미 쓴 토큰이 다시 오면 탈취로 보고 그 로그인에서 이어진 토큰을 모두 폐기합니다.
- 같은 이메일로 로그인에 5번 연달아 실패하면 5분 동안 막고 429와 `Retry-After`로 답합니다.

### 오류 응답

모든 오류는 RFC 9457 Problem Details(`application/problem+json`)이고, 프론트가 경우를 나눌 수 있게 `code`가 있습니다. 입력값 오류에는 `errors`에 필드 위치와 이유가 들어갑니다.

```json
{
  "status": 400,
  "title": "Bad Request",
  "detail": "입력값을 확인해 주세요.",
  "instance": "/api/v1/events",
  "code": "VALIDATION_FAILED",
  "errors": [{ "field": "endDate", "message": "끝 날짜는 시작 날짜와 같거나 뒤여야 합니다" }]
}
```

| code | 상태 | 뜻 |
| --- | --- | --- |
| `VALIDATION_FAILED` | 400 | 입력값이 규칙에 맞지 않음 (`errors` 참고) |
| `MALFORMED_REQUEST` | 400 | JSON 형식이 틀렸거나 없는 값(카테고리 등) |
| `UNAUTHORIZED` | 401 | 토큰이 없음 |
| `INVALID_TOKEN` | 401 | 토큰이 만료됐거나 올바르지 않음. `/auth/refresh`로 새 토큰을 받습니다 |
| `INVALID_CREDENTIALS` | 401 | 이메일이나 비밀번호가 틀림 |
| `INVALID_REFRESH_TOKEN` | 401 | 리프레시 토큰을 쓸 수 없음. 다시 로그인합니다 |
| `NOT_FOUND` | 404 | 없거나 다른 사람의 데이터 |
| `EMAIL_TAKEN` | 409 | 이미 가입된 이메일 |
| `CONFLICT` | 409 | 다른 데이터와 맞지 않아 저장하지 못함 |
| `TOO_MANY_LOGIN_ATTEMPTS` | 429 | 로그인 실패가 반복돼 잠시 막힘 |
| `INTERNAL_ERROR` | 500 | 서버 오류 |

## 구조

모듈형 모놀리스입니다. 배포는 하나로 하고, 코드 안에서는 모듈 경계를 지킵니다.

```
src/main/java/com/planny/server/
├─ account/   가입, 로그인, 토큰, 내 정보
├─ schedule/  일정과 AI 예측 결과
├─ ledger/    거래 (일정 모듈의 공개 API로 내 일정인지 확인)
├─ backup/    내 데이터 전체 내보내기와 바꾸기 (다른 모듈의 공개 API만 씀)
└─ shared/    오류 응답, API 버전, 보안 설정, 공통 타입
src/main/resources/
├─ application.yaml       기본 설정
├─ application-prod.yaml  컨테이너(운영) 설정
├─ application-otel.yaml  OpenTelemetry로 보내기
└─ db/migration/          Flyway 마이그레이션
```

- 모듈의 공개 API는 패키지 바로 아래의 public 클래스입니다(`EventService`, `TransactionService`, `ProfileService`와 그 record). 컨트롤러, 엔티티, 리포지토리는 package-private로 둡니다.
- id는 앱에서 만드는 UUIDv7이고, 돈은 원 단위 정수(`long`, DB는 `bigint`)입니다.

## 설정 (환경 변수)

| 환경 변수 | 설명 |
| --- | --- |
| `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | DB 접속 정보. 로컬에서는 compose가 알아서 넣습니다 |
| `PLANNY_JWT_KEYS` | JWT 서명 키(JWKS). `./gradlew -q generateJwtKey`로 만들고 비밀 저장소에만 둡니다. 첫 번째 키로 서명하고, 키를 바꿀 때는 새 키를 앞에 두고 예전 키를 뒤에 남깁니다 |
| `SPRING_PROFILES_ACTIVE` | 컨테이너 이미지는 `prod`로 실행합니다. 트레이스와 메트릭을 보내려면 `prod,otel` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | otel 프로필일 때 트레이스와 메트릭을 보낼 OTLP 수집기 주소 |
| `PLANNY_AUTH_REFRESHTOKENTTL` 등 | 토큰 유효 기간과 로그인 제한(`planny.auth.*`, `planny.jwt.*`)을 바꿀 때. 환경 변수 이름은 점을 밑줄로 바꾸고 대시를 빼서 씁니다 (예: `PLANNY_AUTH_REFRESHTOKENTTL=7d`) |

`prod` 프로필은 로그를 한 줄짜리 JSON(ECS)으로 남기고, API 문서를 끄고, 서명 키가 없으면 시작하지 않습니다.

## 컨테이너 이미지

```bash
docker build -t planny-server .
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://<호스트>:5432/planny \
  -e SPRING_DATASOURCE_USERNAME=planny -e SPRING_DATASOURCE_PASSWORD=<비밀번호> \
  -e PLANNY_JWT_KEYS='<generateJwtKey 결과>' \
  planny-server
```

- root가 아닌 사용자로 실행하고, 이미지를 만들 때 JDK AOT 캐시를 만들어 시작 시간을 줄입니다(맥 Docker Desktop에서 약 3.2초가 1.7초).
- main에 합쳐지면 CI가 `ghcr.io/b1ueseoyoung/planny-server`에 이미지를 올리고 빌드 출처 증명을 남깁니다.
- 헬스 체크: `/actuator/health/liveness`(살아 있음), `/actuator/health/readiness`(DB까지 준비됨)

## 지킬 것

- 한 번 main에 들어간 마이그레이션 파일은 고치지 않습니다. 스키마를 바꿀 때는 `V2__설명.sql`처럼 새 파일을 추가합니다.
- `src/lib/types.ts`가 바뀌면 서버의 요청, 응답 record도 함께 맞춥니다.
- 새 패키지를 만들면 `package-info.java`에 `@NullMarked`를 붙입니다. null일 수 있는 값은 `@Nullable`로 표시합니다.
- PostgreSQL 버전을 올릴 때는 `compose.yaml`과 테스트의 `TestcontainersConfiguration`을 같이 바꿉니다.
- 비밀번호, 토큰, 키는 코드, 응답, 로그에 남기지 않습니다.

## 프론트와 연결할 때

- Next 서버가 토큰을 httpOnly 쿠키로 들고 이 API를 부르는 방식(BFF)을 권합니다. 브라우저 스크립트가 토큰에 접근할 수 없고, 도메인이 달라도 CORS 문제가 없습니다.
- Next 서버는 `/.well-known/jwks.json`의 공개 키로 액세스 토큰을 직접 검증할 수 있습니다. 지금 누구나 부를 수 있는 `/api/predict`도 같은 방법으로 로그인한 사용자만 쓰게 막을 수 있습니다.
- 처음 로그인할 때 기기의 localStorage 데이터를 `PUT /api/v1/app-data`로 올리면 서버로 옮겨집니다.
