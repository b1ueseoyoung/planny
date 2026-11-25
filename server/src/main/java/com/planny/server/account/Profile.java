package com.planny.server.account;

/**
 * 다른 모듈이 쓰는 사용자 이름과 한 달 예산(원)
 *
 * @param userName 비우면 "나"
 */
public record Profile(String userName, long budget) {
}
