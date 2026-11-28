import assert from "node:assert/strict";
import test from "node:test";
import { CASES } from "../evals/prediction/cases";
import { scoreCase, summarize } from "../evals/prediction/score";
import { evaluate, parseArgs } from "../evals/prediction/run.mjs";
import { PROMPT_EXAMPLES } from "../src/lib/predict/examples";
import type { UnderstoodEvent } from "../src/lib/predict/types";

function output(patch: Partial<UnderstoodEvent> = {}): UnderstoodEvent {
  return {
    title: "평가용 일정", startDate: "2027-03-13", endDate: "2027-03-13",
    eventType: "other", location: null, people: [], headcount: null, payer: "unknown",
    items: [], notes: [], savingTips: [], ...patch,
  };
}

test("28개 문장은 고유하며 프롬프트의 예시 문장과 분리돼 있다", () => {
  assert.equal(CASES.length, 28);
  assert.equal(new Set(CASES.map((c) => c.id)).size, 28);
  assert.equal(new Set(CASES.map((c) => c.request.text)).size, 28);
  const training = new Set(PROMPT_EXAMPLES.map((e) => e.text));
  for (const c of CASES) {
    assert.equal(training.has(c.request.text), false);
    assert.ok(Object.keys(c.expected.fields).length > 0);
    for (const date of [c.request.today, c.request.defaultDate, c.expected.fields.startDate, c.expected.fields.endDate].filter((d): d is string => !!d)) {
      assert.equal(new Date(date + "T00:00:00Z").toISOString().slice(0, 10), date);
    }
    assert.equal(JSON.stringify(c.request.history), '{"dailyAverageByCategory":{},"pastEvents":[]}');
  }
});

test("사람 순서는 무관하고 조사·중복·그룹명은 불일치로 채점한다", () => {
  const c = CASES.find((c) => c.id === "people-two-names")!;
  const peopleCheck = (people: string[]) => scoreCase(c, output({ people })).find((c) => c.field === "people")!.passed;
  assert.equal(peopleCheck(["은서", "지수"]), true);
  assert.equal(peopleCheck(["지수랑", "은서"]), false);
  assert.equal(peopleCheck(["지수", "은서", "친구들"]), false);
  assert.equal(peopleCheck(["지수", "은서", "은서"]), false);
});

test("null 정답과 생략한 기준을 구분한다", () => {
  const c = CASES.find((c) => c.id === "people-group")!;
  assert.equal(scoreCase(c, output({ headcount: null })).find((c) => c.field === "headcount")!.passed, true);
  assert.equal(scoreCase(c, output({ headcount: 3 })).find((c) => c.field === "headcount")!.passed, false);
  assert.equal(scoreCase(c, output()).some((c) => c.field === "payer"), false);
});

test("필수 항목은 카테고리와 의미를 함께 확인한다", () => {
  const c = CASES.find((c) => c.id === "cost-flight")!;
  const flight = (label: string) => scoreCase(c, output({ items: [{ category: "transport", label, estimate: 350000 }] })).find((c) => c.field === "requiredItems.flight")!.passed;
  assert.equal(flight("왕복 항공권"), true);
  assert.equal(flight("왕복 택시"), false);
});

test("사용자가 명시한 금액을 임의의 시장가격으로 대체하면 감점한다", () => {
  const c = CASES.find((c) => c.id === "cost-wedding")!;
  const score = (estimate: number) => scoreCase(c, output({ items: [{ category: "gift", label: "축의금", estimate }] })).find((c) => c.field === "amount.explicit-gift")!.passed;
  assert.equal(score(150000), true);
  assert.equal(score(100000), false);
});

test("무료 입장에는 양수 티켓 비용을 넣지 않는다", () => {
  const c = CASES.find((c) => c.id === "cost-free")!;
  const score = (estimate: number) => scoreCase(c, output({ items: [{ category: "culture", label: "입장료", estimate }] })).find((c) => c.field.startsWith("forbiddenItems"))!.passed;
  assert.equal(score(0), true);
  assert.equal(score(20000), false);
});

test("외부 호출은 명시적으로 고르고, 기본 Gemini 평가는 3문장으로 제한한다", () => {
  assert.equal(parseArgs([]).provider, "rules");
  assert.equal(parseArgs([]).examples.length, 28);
  assert.equal(parseArgs(["--provider", "both"]).examples.length, 3);
  assert.equal(parseArgs(["--provider", "gemini", "--limit", "28"]).examples.length, 28);
  assert.deepEqual(parseArgs(["--ids", "cost-flight,date-default"]).examples.map((c) => c.id), ["cost-flight", "date-default"]);
  for (const args of [["--limit", "0"], ["--limit", "1.5"], ["--ids", "unknown"], ["--ids", "cost-flight,cost-flight"], ["--provider", "other"], ["--limit"]]) assert.throws(() => parseArgs(args));
});

test("Gemini 실패를 규칙 정답으로 덮지 않고 이후 호출을 중단한다", async () => {
  let calls = 0;
  const secret = "SHOULD_NOT_BE_SAVED";
  const results = await evaluate(CASES.slice(0, 3), "gemini", () => {
    calls++;
    throw Object.assign(new Error(secret), { status: 429 });
  });
  assert.equal(calls, 1);
  assert.deepEqual(results.map((r) => r.status), ["error", "skipped", "skipped"]);
  assert.equal(results[0].errorKind, "HTTP_429");
  assert.equal(JSON.stringify(results).includes(secret), false);
  const summary = summarize(results);
  assert.equal(summary.totalCases, 3);
  assert.equal(summary.allCasePassRate, 0);
  assert.equal(summary.errors, 1);
  assert.equal(summary.skipped, 2);
});

test("필드별 점수와 문장 전체 통과율을 따로 집계한다", async () => {
  const c = CASES[0];
  const results = await evaluate([c], "rules", () => output({ startDate: "2027-02-26", endDate: "2027-02-26", eventType: "friends", location: "홍대입구" }));
  assert.equal(summarize(results).allCasePassRate, 1);
  const failed = await evaluate([c], "rules", () => output({ startDate: "2027-02-26", endDate: "2027-02-26", eventType: "friends", location: "강남" }));
  const summary = summarize(failed);
  assert.equal(summary.allCasePassRate, 0);
  assert.equal(summary.passedChecks, 3);
  assert.equal(summary.totalChecks, 4);
  assert.deepEqual(summary.fields.location, { passed: 0, total: 1 });
});
