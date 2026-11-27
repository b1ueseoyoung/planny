# syntax=docker/dockerfile:1
# 빌드: docker build -t planny-server server/
# 실행: docker run -p 8080:8080 -e SPRING_DATASOURCE_URL=... -e PLANNY_JWT_KEYS=... planny-server

# 1) 빌드 단계: 소스로 실행 jar를 만들고 계층별로 푼다 (테스트는 CI에서 따로 돌린다)
FROM eclipse-temurin:25-jdk-noble@sha256:4ddc1a8bdaf283421df5487411aff10b797ccf1e06a339041005114c8f489b5c AS build
WORKDIR /workspace
COPY gradlew settings.gradle.kts build.gradle.kts gradle.properties ./
COPY gradle gradle
COPY src src
# Gradle 배포본과 의존성은 빌드 캐시에 두고 이미지에는 넣지 않는다
RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon --quiet bootJar
RUN java -Djarmode=tools -jar build/libs/planny-server.jar extract --layers --destination extracted

# 2) 실행 단계: JRE만 담고 root가 아닌 사용자로 실행한다
FROM eclipse-temurin:25-jre-noble@sha256:f3dd0838e69b881cc382237d5901e74ae3705b1056ad964b2e0e523b174fef99
RUN useradd --system --uid 10001 --user-group --no-create-home --shell /usr/sbin/nologin planny
WORKDIR /app
# 자주 바뀌지 않는 의존성부터 복사해서, 코드만 바뀌면 마지막 계층만 새로 받는다
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./

ENV SPRING_PROFILES_ACTIVE=prod

# JDK AOT 캐시 학습 실행: 앱을 한 번 띄웠다가 바로 끝내면서, 읽고 연결한 클래스를 app.aot에 저장한다.
# 실행할 때 이 캐시를 쓰면 시작이 빨라진다. 이미지 빌드에는 DB가 없으니 DB에 붙지 않게 한다.
# GitHub Actions의 Docker 빌드(BuildKit)는 RUN 단계에 OTEL_* 환경 변수(unix 소켓 주소)를 넣는데,
# Spring Boot가 이를 트레이스 주소로 읽으면 시작에 실패하므로 학습 실행에서는 OTEL_* 환경 변수를 읽지 않는다
RUN java -XX:MaxRAMPercentage=75 -XX:AOTCacheOutput=app.aot \
        -Dspring.context.exit=onRefresh \
        -Dmanagement.opentelemetry.map-environment-variables=false \
        -Dplanny.jwt.allow-ephemeral-key=true \
        -Dspring.datasource.url=jdbc:postgresql://localhost:5432/aot-training \
        -Dspring.flyway.enabled=false \
        -Dspring.jpa.hibernate.ddl-auto=none \
        -Dspring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect \
        -Dspring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access=false \
        -jar planny-server.jar

USER planny
EXPOSE 8080
# 메모리의 75%까지 힙으로 쓴다 (기본값 25%는 작은 컨테이너에서 너무 작다)
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-XX:AOTCache=app.aot", "-jar", "planny-server.jar"]
