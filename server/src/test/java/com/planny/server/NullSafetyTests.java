package com.planny.server;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import org.jspecify.annotations.NullMarked;
import org.junit.jupiter.api.Test;

/** NullAway는 @NullMarked 패키지만 검사하므로, 새 패키지에 package-info.java를 빠뜨리지 않았는지 확인한다. */
class NullSafetyTests {

    @Test
    void everyPackageIsNullMarked() {
        var mainClasses = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.planny.server");

        classes().should(resideInNullMarkedPackage()).check(mainClasses);
    }

    private static ArchCondition<JavaClass> resideInNullMarkedPackage() {
        return new ArchCondition<>("reside in a @NullMarked package") {
            @Override
            public void check(JavaClass javaClass, ConditionEvents events) {
                boolean marked = javaClass.getPackage().isAnnotatedWith(NullMarked.class);
                events.add(new SimpleConditionEvent(javaClass, marked,
                        javaClass.getPackageName() + " 패키지에 @NullMarked가 붙은 package-info.java가 없습니다"));
            }
        };
    }
}
