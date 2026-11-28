import type { Category, PredictRequest } from "../../src/lib/types";
import type { UnderstoodEvent } from "../../src/lib/predict/types";

export interface ItemExpectation {
  id: string;
  category: Category;
  /** 같은 뜻의 항목명을 허용한다. 대소문자·공백을 제외하고 부분 일치로 비교한다. */
  labelIncludesAny?: string[];
  /** 금액을 명시한 문장만 채점한다. 시장가격을 정답으로 지정하지 않는다. */
  amount?: { min: number; max: number };
}

export interface EvaluationCase {
  id: string;
  group: "date" | "people" | "payer" | "cost-items";
  description: string;
  request: PredictRequest;
  expected: {
    /** 모호한 항목은 생략한다. null은 알 수 없는 것이 정답이라는 뜻이다. */
    fields: Partial<Pick<UnderstoodEvent, "startDate" | "endDate" | "eventType" | "headcount" | "payer">>;
    people?: string[];
    locationAnyOf?: string[];
    requiredItems?: ItemExpectation[];
    forbiddenItems?: ItemExpectation[];
  };
}

export interface CheckResult {
  field: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
}

export interface CaseResult {
  id: string;
  group: EvaluationCase["group"];
  provider: "rules" | "gemini";
  status: "completed" | "error" | "skipped";
  durationMs: number;
  passed: boolean;
  checks: CheckResult[];
  /** 오류 본문이나 인증 정보는 저장하지 않는다. */
  errorKind?: string;
}
