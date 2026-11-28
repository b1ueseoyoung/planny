// 브라우저와 서버가 같이 쓰는 예측 요청 제한값. 브라우저에서도 import 하니 다른 모듈을 끌어오지 않게 상수만 둔다.

/** 일정 문장 최대 길이. 입력칸(NewEventScreen)의 maxLength와 서버 검사(request.ts)가 같이 쓴다 */
export const MAX_TEXT_LENGTH = 300;
