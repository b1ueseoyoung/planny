// 함께한 사람 이름 정리 (규칙·AI 공통). 브라우저에서도 쓰이니 Node 전용 API 쓰지 않기.

/** 여럿을 묶어 부르는 말이라 사람 이름으로 저장하지 않는 단어 */
const GROUP_WORDS = new Set([
  "친구",
  "친구들",
  "동기",
  "동기들",
  "동료",
  "동료들",
  "가족",
  "사람들",
  "애들",
  "다같이",
  "회사",
  "팀원",
  "팀원들",
  "혼자",
]);

/** 공백 정리, 중복·묶음 말 제거, 최대 10명 */
export function cleanPeople(names: string[]): string[] {
  const cleaned = names.map((name) => name.trim()).filter((name) => name && !GROUP_WORDS.has(name));
  return [...new Set(cleaned)].slice(0, 10);
}
