// AI 없이 도는 예측. 규칙으로 문장을 이해하고(rules.ts), 금액은 내 기록 우선으로 정한다(estimate.ts).
// 브라우저에서도 돌아서, 서버에 닿지 못할 때 api.ts가 이걸로 대신한다.
import type { EventPrediction, PredictRequest } from "../types";
import { understandByRules } from "./rules";
import { estimateCosts } from "./estimate";

export function mockPredict(req: PredictRequest): EventPrediction {
  return estimateCosts(understandByRules(req), req.history, "rules");
}
