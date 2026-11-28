import assert from "node:assert/strict";
import test from "node:test";
import { applyExplicitCosts } from "../src/lib/predict/explicit-costs";
import { understandByRules } from "../src/lib/predict/rules";
import { mockPredict } from "../src/lib/predict/mock";
import { sanitizeUnderstood } from "../src/lib/predict/schema";
import { estimateCosts } from "../src/lib/predict/estimate";
import type { HistorySummary, PredictRequest } from "../src/lib/types";
import type { UnderstoodEvent } from "../src/lib/predict/types";

const history: HistorySummary = { dailyAverageByCategory: {}, pastEvents: [{
  id: "past", title: "뮤지컬과 식사", startDate: "2027-02-10", eventType: "performance",
  location: null, total: 143000,
  items: [
    { category: "culture", label: "티켓", amount: 132000 },
    { category: "transport", label: "교통", amount: 11000 },
  ],
}] };
function request(text: string, withHistory = false): PredictRequest {
  return { text, today: "2027-02-25", defaultDate: "2027-03-13",
    history: withHistory ? history : { dailyAverageByCategory: {}, pastEvents: [] } };
}

for (const [text, expected] of [
  ["축의금 15만원", 150000],
  ["조의금은 150,000원", 150000],
  ["내 티켓은 9만 원", 90000],
  ["입장료: 1.5만원", 15000],
  ["입장료 1만 5천원", 15000],
  ["관람료는 9천5백원", 9500],
  ["티켓값 12345원", 12345],
  ["입장료 0원", 0],
] as const) {
  test(`명시 금액: ${text}`, () => {
    const category = /축의|조의/.test(text) ? "gift" : "culture";
    const label = text.includes("축의") ? "축의금" : text.includes("조의") ? "조의금" : "티켓";
    const result = applyExplicitCosts(text, [{ category, label, estimate: 20000 }]);
    assert.equal(result[0].estimate, expected);
    assert.equal(result[0].amountSource, "user");
  });
}

test("기본 항목을 바꾸거나 뒤 요청에 금액이 남지 않는다", () => {
  const first = understandByRules(request("결혼식 축의금 15만원"));
  assert.equal(first.items.find((i) => i.category === "gift")!.estimate, 150000);
  const second = understandByRules(request("결혼식"));
  assert.equal(second.items.find((i) => i.category === "gift")!.estimate, 100000);
  assert.equal(second.items.find((i) => i.category === "gift")!.amountSource, undefined);
});

test("최종 예측에서도 명시 티켓값은 과거 평균보다 우선한다", () => {
  const p = mockPredict(request("뮤지컬 내 티켓은 9만원", true));
  assert.equal(p.items.find((i) => i.category === "culture")!.amount, 90000);
  assert.equal(p.items.find((i) => i.category === "transport")!.amount, 11000);
  assert.ok(p.reasons.some((r) => r.includes("문장에 적은 금액")));
  assert.equal("amountSource" in p.items[0], false);
});

test("명시하지 않은 티켓값은 기존처럼 과거 기록을 쓴다", () => {
  const p = mockPredict(request("무료가 아닌 일반 뮤지컬", true));
  assert.equal(p.items.find((i) => i.category === "culture")!.amount, 132000);
});

for (const text of ["무료 전시", "전시 입장료는 무료", "전시 입장료 0원", "공짜 영화 관람"]) {
  test(`무료 조건은 기록이 있어도 되살리지 않는다: ${text}`, () => {
    const p = mockPredict(request(text, true));
    assert.equal(p.items.filter((i) => i.category === "culture").reduce((s, i) => s + i.amount, 0), 0);
    assert.equal(p.items.find((i) => i.category === "transport")!.amount, 11000);
  });
}

for (const text of [
  "무료 주차가 있는 전시", "티켓은 무료가 아니에요", "무료 전시는 아니고 일반 전시",
  "무료 입장이 아닙니다", "티켓은 무료 배송", "티켓은 9만원~10만원", "입장료는 1만원 이상",
  "티켓은 3만원 할인", "티켓 9만원 환불",
  "티켓은 인당 9만원", "티켓 18만원 총액을 n빵", "친구 티켓은 9만원", "민지의 티켓은 9만원",
  "티켓은 9만원 말고 7만원", "지난 티켓은 9만원", "티켓 9만원, 티켓 7만원",
]) {
  test(`모호한 범위·다른 비용·부정·정정은 확정값으로 읽지 않는다: ${text}`, () => {
    const items: UnderstoodEvent["items"] = [{ category: "culture", label: "티켓", estimate: 20000 }];
    const result = applyExplicitCosts(text, items);
    assert.equal(result[0].estimate, 20000);
    assert.equal(result[0].amountSource, undefined);
    assert.equal(items[0].amountSource, undefined);
  });
}

test("내 몫이라고 명시한 티켓값은 n빵 언급이 있어도 보존한다", () => {
  const p = mockPredict(request("뮤지컬 n빵, 내 티켓은 9만원", true));
  assert.equal(p.items.find((i) => i.category === "culture")!.amount, 90000);
});

test("무료 입장과 유료 관람료가 상충하면 임의로 선택하지 않는다", () => {
  const result = applyExplicitCosts("무료 전시, 입장료 5천원", [{ category: "culture", label: "티켓", estimate: 20000 }]);
  assert.equal(result[0].amountSource, undefined);
});

test("명시한 축의금은 과거 경조사 지출로 덮지 않는다", () => {
  const req = request("결혼식 축의금 15만원");
  req.history.pastEvents = [{ id: "wedding", title: "이전 결혼식", startDate: "2027-01-10",
    eventType: "other", location: null, total: 50000,
    items: [{ category: "gift", label: "축의금", amount: 50000 }] }];
  assert.equal(mockPredict(req).items.find((i) => i.category === "gift")!.amount, 150000);
});

test("AI 응답의 명시 금액도 정리·기록 보정 뒤까지 보존한다", () => {
  const req = request("뮤지컬 내 티켓은 12345원", true);
  const raw = understandByRules(req);
  raw.items = [{ category: "culture", label: "뮤지컬 티켓", estimate: 100000 }];
  const clean = sanitizeUnderstood(raw, req);
  assert.equal(clean.items[0].estimate, 12345);
  assert.equal(estimateCosts(clean, req.history, "gemini").items[0].amount, 12345);
});

test("AI가 무료 전시에 양수 입장료를 줘도 최종 예측에 반영하지 않는다", () => {
  const req = request("무료 전시", true);
  const raw = understandByRules(req);
  raw.items = [{ category: "culture", label: "전시 입장료", estimate: 20000 }];
  const clean = sanitizeUnderstood(raw, req);
  assert.equal(estimateCosts(clean, req.history, "gemini").items[0].amount, 0);
});
