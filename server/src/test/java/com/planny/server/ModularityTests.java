package com.planny.server;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

/** 모듈(account, ledger, schedule, backup, shared) 사이의 의존 규칙을 검사하고 모듈 문서를 만든다. */
class ModularityTests {

    private final ApplicationModules modules = ApplicationModules.of(PlannyApplication.class);

    @Test
    void verifiesModuleBoundaries() {
        modules.verify();
    }

    @Test
    void writesModuleDocumentation() {
        // build/spring-modulith-docs 에 모듈 그림(PlantUML)과 설명을 만든다
        new Documenter(modules).writeDocumentation();
    }
}
