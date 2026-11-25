package com.planny.server.shared;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.HandlerExceptionResolver;

/**
 * Authorization: Bearer 액세스 토큰(JWT)으로만 인증한다.
 * 세션과 쿠키를 쓰지 않아서 CSRF 보호는 끈다.
 */
@Configuration(proxyBeanMethods = false)
class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver) {
        var problemDetails = new ProblemDetailsSecurityHandler(exceptionResolver);
        http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .requestCache(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/*/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/.well-known/jwks.json").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(Customizer.withDefaults())
                        .authenticationEntryPoint(problemDetails)
                        .accessDeniedHandler(problemDetails))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(problemDetails)
                        .accessDeniedHandler(problemDetails));
        return http.build();
    }
}
