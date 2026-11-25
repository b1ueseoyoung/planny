package com.planny.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class PlannyApplication {

    public static void main(String[] args) {
        SpringApplication.run(PlannyApplication.class, args);
    }
}
