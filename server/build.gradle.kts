import net.ltgt.gradle.errorprone.CheckSeverity
import net.ltgt.gradle.errorprone.errorprone

plugins {
    java
    id("org.springframework.boot") version "4.2.0"
    id("io.spring.dependency-management") version "1.1.7"
    id("net.ltgt.errorprone") version "5.2.0"
}

group = "com.planny"
version = "0.0.1-SNAPSHOT"
description = "Planny API 서버"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

extra["springModulithVersion"] = "2.2.0"

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server")
    // Argon2 비밀번호 해시
    implementation("org.bouncycastle:bcprov-jdk18on:1.87")
    implementation("com.github.ben-manes.caffeine:caffeine")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.2.1")
    // Javadoc을 실행 중에도 읽을 수 있게 남겨서 API 문서 설명으로 쓴다
    implementation("com.github.therapi:therapi-runtime-javadoc:0.16.0")
    annotationProcessor("com.github.therapi:therapi-runtime-javadoc-scribe:0.16.0")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.springframework.modulith:spring-modulith-starter-core")
    implementation("org.jspecify:jspecify")
    developmentOnly("org.springframework.boot:spring-boot-docker-compose")
    runtimeOnly("org.postgresql:postgresql")
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")

    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
    testImplementation("org.springframework.boot:spring-boot-starter-security-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.springframework.modulith:spring-modulith-starter-test")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testImplementation("com.tngtech.archunit:archunit")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    errorprone("com.google.errorprone:error_prone_core:2.53.0")
    errorprone("com.uber.nullaway:nullaway:0.14.4")
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.modulith:spring-modulith-bom:${property("springModulithVersion")}")
    }
}

// @NullMarked 패키지에서 null이 될 수 있는 값을 확인 없이 쓰면 컴파일 오류로 막는다 (Spring 문서 권장 설정)
tasks.withType<JavaCompile>().configureEach {
    options.compilerArgs.add("-Ajavadoc.packages=com.planny.server")
    options.errorprone {
        disableWarningsInGeneratedCode = true
        check("NullAway", CheckSeverity.ERROR)
        option("NullAway:OnlyNullMarked", "true")
        option("NullAway:CustomContractAnnotations", "org.springframework.lang.Contract")
        // JPA 엔티티는 Hibernate가 기본 생성자로 만든 뒤 필드를 채운다
        option("NullAway:ExternalInitAnnotations", "jakarta.persistence.Entity")
    }
}

tasks.register<JavaExec>("generateJwtKey") {
    group = "planny"
    description = "운영용 JWT 서명 키(JWKS)를 새로 만들어 출력합니다."
    classpath = sourceSets["main"].runtimeClasspath
    mainClass = "com.planny.server.shared.JwtKeyGenerator"
}

tasks.withType<Test> {
    useJUnitPlatform()
}
