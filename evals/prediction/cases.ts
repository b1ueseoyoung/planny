import type { EvaluationCase } from "./types";

// 프롬프트 예시(examples.ts)와 다른 문장. 고정한 기준일로 상대 날짜를 평가한다.
// 2027-02-25는 목요일. 날짜·인원 등 명시되거나 명확히 유추되는 사실만 정답으로 삼는다.
const base = { today: "2027-02-25", defaultDate: "2027-03-13", history: { dailyAverageByCategory: {}, pastEvents: [] } };
function c(id: string, group: EvaluationCase["group"], description: string, text: string,
  expected: EvaluationCase["expected"], dates: Partial<Pick<typeof base, "today" | "defaultDate">> = {}): EvaluationCase {
  return { id, group, description, request: { ...base, ...dates, text }, expected };
}

export const CASES: EvaluationCase[] = [
  c("date-tomorrow", "date", "내일", "내일 홍대에서 친구 모임", { fields: { startDate: "2027-02-26", endDate: "2027-02-26", eventType: "friends" }, locationAnyOf: ["홍대"] }),
  c("date-day-after", "date", "모레", "모레 혼자 영화 보기", { fields: { startDate: "2027-02-27", endDate: "2027-02-27", eventType: "performance" }, requiredItems: [{ id: "ticket", category: "culture" }] }),
  c("date-next-week", "date", "다음 주 월요일, 월 경계", "다음 주 월요일 회사 회식", { fields: { startDate: "2027-03-01", endDate: "2027-03-01", eventType: "work" } }),
  c("date-this-sunday", "date", "이번 주 일요일", "이번 주 일요일 가족 외식", { fields: { startDate: "2027-02-28", endDate: "2027-02-28", eventType: "family" } }),
  c("date-two-weeks", "date", "다다음 주", "다다음 주 화요일 동기 모임", { fields: { startDate: "2027-03-09", endDate: "2027-03-09", eventType: "friends" } }),
  c("date-next-month", "date", "다음 달", "다음 달 7일 전시 보기", { fields: { startDate: "2027-03-07", endDate: "2027-03-07", eventType: "performance" } }),
  c("date-year-boundary", "date", "연도 경계", "내일 친구와 식사", { fields: { startDate: "2027-01-01", endDate: "2027-01-01" } }, { today: "2026-12-31" }),
  c("date-leap-day", "date", "윤년", "모레 지수랑 카페", { fields: { startDate: "2028-02-29", endDate: "2028-02-29" }, people: ["지수"] }, { today: "2028-02-27" }),
  c("date-default", "date", "문장에 날짜가 없으면 기본 날짜", "대학 동창 결혼식", { fields: { startDate: "2027-03-13", endDate: "2027-03-13", eventType: "other" }, requiredItems: [{ id: "wedding-gift", category: "gift", labelIncludesAny: ["축의", "축하금"] }] }),
  c("date-nights", "date", "기간을 날짜로 오해하지 않기", "4월 9일부터 오사카 3박 4일 여행", { fields: { startDate: "2027-04-09", endDate: "2027-04-12", eventType: "travel" }, locationAnyOf: ["오사카"], requiredItems: [{ id: "flight", category: "transport", labelIncludesAny: ["항공", "비행"] }, { id: "lodging", category: "lodging" }] }),

  c("people-two-names", "people", "조사 제거와 본인 포함 인원", "내일 지수랑 은서랑 합정에서 저녁, 셋이서 각자 계산", { fields: { headcount: 3, payer: "split", eventType: "friends" }, people: ["지수", "은서"], locationAnyOf: ["합정"] }),
  c("people-group", "people", "친구들은 이름이 아님", "이번 주 토요일 친구들이랑 모임", { fields: { headcount: null, eventType: "friends" }, people: [] }),
  c("people-explicit-count", "people", "명시된 인원은 본인 포함", "내일 총 5명이서 친구 모임, 더치페이", { fields: { headcount: 5, payer: "split", eventType: "friends" }, people: [] }),
  c("people-without-user", "people", "친구 세 명과 본인이면 네 명", "4월 10일부터 친구 세 명과 강릉 1박 2일 여행", { fields: { headcount: 4, startDate: "2027-04-10", endDate: "2027-04-11", eventType: "travel" }, people: [] }),
  c("people-relation", "people", "관계로 지칭한 한 사람", "내일 엄마랑 둘이서 점심", { fields: { headcount: 2, eventType: "family" }, people: ["엄마"] }),
  c("people-alone", "people", "혼자와 알 수 없는 인원을 구분", "이번 주 일요일 혼자 부산 당일치기 여행", { fields: { headcount: 1, eventType: "travel" }, people: [], forbiddenItems: [{ id: "no-lodging", category: "lodging" }] }),

  c("payer-treat", "payer", "내가 모두 내기", "내일 지수랑 은서랑 셋이서 저녁, 내가 한턱낼게", { fields: { headcount: 3, payer: "me" }, people: ["지수", "은서"], requiredItems: [{ id: "meal", category: "meal" }] }),
  c("payer-split", "payer", "n빵", "토요일 친구 4명 모임, 총 4명이고 밥값은 n빵", { fields: { headcount: 4, payer: "split" }, people: [], requiredItems: [{ id: "meal", category: "meal" }] }),
  c("payer-company", "payer", "회사 식비와 개인 택시", "내일 회사 회식, 밥값은 법인카드이고 귀가 택시는 내가 부담", { fields: { payer: "others", eventType: "work" }, requiredItems: [{ id: "taxi", category: "transport", labelIncludesAny: ["택시"] }] }),
  c("payer-second-round", "payer", "법카여도 2차는 개인 부담", "다음 주 수요일 부서 회식, 1차는 회사 카드고 2차 술값은 각자 내요", { fields: { startDate: "2027-03-03", payer: "others", eventType: "work" }, requiredItems: [{ id: "second-round", category: "meal", labelIncludesAny: ["2차", "이차", "개인", "술"] }] }),
  c("payer-treated", "payer", "얻어먹는 식사 금액은 제외", "금요일 친구에게 저녁 얻어먹기로 했고 교통비만 내가 내요", { fields: { payer: "others" }, requiredItems: [{ id: "transport", category: "transport" }], forbiddenItems: [{ id: "no-meal", category: "meal" }] }),
  c("payer-unknown", "payer", "결제 정보가 없으면 추측하지 않기", "부모님 지인 장례식 조문", { fields: { payer: "unknown", eventType: "other" }, requiredItems: [{ id: "condolence", category: "gift", labelIncludesAny: ["조의", "부의"] }] }),

  c("cost-wedding", "cost-items", "명시된 축의금", "4월 17일 결혼식 참석, 축의금은 15만원 낼 거야", { fields: { startDate: "2027-04-17", eventType: "other" }, requiredItems: [{ id: "explicit-gift", category: "gift", labelIncludesAny: ["축의", "축하금"], amount: { min: 150000, max: 150000 } }] }),
  c("cost-funeral", "cost-items", "장례식 필수 항목", "내일 동창 빈소 조문", { fields: { eventType: "other" }, requiredItems: [{ id: "condolence", category: "gift", labelIncludesAny: ["조의", "부의"] }] }),
  c("cost-flight", "cost-items", "해외여행 항공·숙소", "5월 14일부터 방콕 4박 5일 여행", { fields: { startDate: "2027-05-14", endDate: "2027-05-18", eventType: "travel" }, locationAnyOf: ["방콕"], requiredItems: [{ id: "flight", category: "transport", labelIncludesAny: ["항공", "비행"] }, { id: "lodging", category: "lodging" }] }),
  c("cost-day-trip", "cost-items", "당일 여행에는 숙소 없음", "4월 3일 전주 당일치기 여행", { fields: { startDate: "2027-04-03", endDate: "2027-04-03", eventType: "travel" }, requiredItems: [{ id: "transport", category: "transport" }], forbiddenItems: [{ id: "no-lodging", category: "lodging" }] }),
  c("cost-performance", "cost-items", "명시된 티켓값", "4월 24일 뮤지컬 보러 가, 내 티켓은 9만원", { fields: { startDate: "2027-04-24", eventType: "performance" }, requiredItems: [{ id: "explicit-ticket", category: "culture", labelIncludesAny: ["티켓", "뮤지컬", "입장", "관람"], amount: { min: 90000, max: 90000 } }] }),
  c("cost-free", "cost-items", "무료 입장료는 예측하지 않기", "이번 주 일요일 무료 전시 보러 가요, 입장료는 0원이고 교통비만 들어요", { fields: { eventType: "performance" }, requiredItems: [{ id: "transport", category: "transport" }], forbiddenItems: [{ id: "no-ticket-cost", category: "culture" }] }),
];
