// 서버 전용: 일정 예측 진입점. API 키가 있으면 Claude, 없거나 실패하면 목업 예측.
import type { PredictRequest, PredictResponse } from "../types";
import { mockPredict } from "./mock";
import { predictWithClaude } from "./claude";

export async function predictEvent(req: PredictRequest): Promise<PredictResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { prediction: mockPredict(req), source: "mock", notice: "ANTHROPIC_API_KEY가 없어 목업 예측을 보여줘요" };
  }
  try {
    return { prediction: await predictWithClaude(req), source: "ai", notice: null };
  } catch (error) {
    console.error("[predict] Claude 예측 실패, 목업으로 대신해요:", error);
    return { prediction: mockPredict(req), source: "mock", notice: "AI 예측에 실패해서 목업 예측을 보여줘요" };
  }
}
