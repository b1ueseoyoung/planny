import type { UnderstoodEvent } from "../../src/lib/predict/types";
import type { CaseResult, CheckResult, EvaluationCase, ItemExpectation } from "./types";

const normalized = (value: string) => value.replace(/\s+/g, "").toLowerCase();

function matches(item: UnderstoodEvent["items"][number], expected: ItemExpectation): boolean {
  return item.category === expected.category && item.estimate > 0 &&
    (!expected.labelIncludesAny || expected.labelIncludesAny.some((word) => normalized(item.label).includes(normalized(word))));
}

/** 정해 둔 기준만 채점하고, 생략된 모호한 필드는 정답으로 간주하지 않는다. */
export function scoreCase(example: EvaluationCase, output: UnderstoodEvent): CheckResult[] {
  const checks: CheckResult[] = [];
  for (const [field, expected] of Object.entries(example.expected.fields)) {
    const actual = output[field as keyof typeof example.expected.fields];
    checks.push({ field, passed: actual === expected, expected, actual });
  }
  if (example.expected.people !== undefined) {
    // 순서는 무관하지만 중복 인물이나 조사·그룹명 추가는 정답으로 치지 않는다.
    const expected = [...example.expected.people].sort();
    const actual = [...output.people].sort();
    checks.push({ field: "people", passed: JSON.stringify(expected) === JSON.stringify(actual), expected, actual });
  }
  if (example.expected.locationAnyOf) {
    const expected = example.expected.locationAnyOf;
    checks.push({ field: "location", passed: output.location !== null && expected.some((p) => normalized(output.location!).includes(normalized(p))), expected, actual: output.location });
  }
  for (const expected of example.expected.requiredItems ?? []) {
    const matched = output.items.filter((item) => matches(item, expected));
    checks.push({ field: `requiredItems.${expected.id}`, passed: matched.length > 0, expected, actual: matched });
    if (expected.amount) {
      const actual = matched.reduce((sum, item) => sum + item.estimate, 0);
      checks.push({ field: `amount.${expected.id}`, passed: matched.length > 0 && Number.isFinite(actual) && actual >= expected.amount.min && actual <= expected.amount.max, expected: expected.amount, actual });
    }
  }
  for (const expected of example.expected.forbiddenItems ?? []) {
    const actual = output.items.filter((item) => matches(item, expected));
    checks.push({ field: `forbiddenItems.${expected.id}`, passed: actual.length === 0, expected: "양수 비용 항목 없음", actual });
  }
  return checks;
}

/** 호출 오류/미실행 문장을 통과율의 분모에서 숨기지 않는다. 필드 정확도는 응답 완료분만 집계. */
export function summarize(results: CaseResult[]) {
  const completed = results.filter((r) => r.status === "completed");
  const fields: Record<string, { passed: number; total: number }> = {};
  for (const result of completed) {
    for (const check of result.checks) {
      const key = check.field.split(".")[0];
      const count = fields[key] ??= { passed: 0, total: 0 };
      count.total++;
      if (check.passed) count.passed++;
    }
  }
  return {
    totalCases: results.length,
    completed: completed.length,
    errors: results.filter((r) => r.status === "error").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    passedCases: completed.filter((r) => r.passed).length,
    allCasePassRate: results.length ? completed.filter((r) => r.passed).length / results.length : 0,
    passedChecks: completed.reduce((sum, r) => sum + r.checks.filter((c) => c.passed).length, 0),
    totalChecks: completed.reduce((sum, r) => sum + r.checks.length, 0),
    fields,
  };
}
