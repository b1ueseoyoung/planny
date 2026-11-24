import type { PredictRequest, PredictResponse } from "./types";
import { mockPredict } from "./predict/mock";

/** 일정 예측 요청. 서버에 닿지 못하면 브라우저에서 목업 예측으로 대신한다. */
export async function fetchPrediction(req: PredictRequest): Promise<PredictResponse> {
  try {
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as PredictResponse;
  } catch {
    return {
      prediction: mockPredict(req),
      source: "mock",
      notice: "서버에 연결하지 못해 목업 예측을 보여줘요.",
    };
  }
}
