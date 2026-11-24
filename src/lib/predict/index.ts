// 서버 전용: 일정 예측 진입점.
// 1) 문장 이해: Gemini · Claude · 규칙 중 하나 (AI_PROVIDER로 고르거나, 키가 있는 쪽을 자동으로)
// 2) 금액: estimate.ts가 내 기록 우선으로 정한다 (계산은 코드)
import type { PredictRequest, PredictResponse } from "../types";
import type { UnderstoodEvent, Understander } from "./types";
import { understandByRules } from "./rules";
import { understandWithGemini } from "./gemini";
import { understandWithClaude } from "./claude";
import { estimateCosts } from "./estimate";

function pickUnderstander(): Understander {
  const chosen = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (chosen === "gemini" || chosen === "claude" || chosen === "rules") return chosen;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return "rules";
}

/** 무료 AI가 붐비거나(503) 한도를 넘었거나(429) 시간이 초과된 경우 */
function isBusy(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("name" in error && (error.name === "AbortError" || error.name === "TimeoutError")) return true;
  return "status" in error && (error.status === 429 || error.status === 503);
}

export async function predictEvent(req: PredictRequest): Promise<PredictResponse> {
  const understander = pickUnderstander();

  if (understander === "rules") {
    return {
      prediction: estimateCosts(understandByRules(req), req.history, "rules"),
      source: "mock",
      notice: "AI 키가 없어 규칙 기반으로 예측했어요. .env.local에 GEMINI_API_KEY를 넣으면 AI가 문장을 이해해요",
    };
  }

  try {
    const understood: UnderstoodEvent =
      understander === "gemini" ? await understandWithGemini(req) : await understandWithClaude(req);
    return { prediction: estimateCosts(understood, req.history, understander), source: "ai", notice: null };
  } catch (error) {
    console.error(`[predict] ${understander} 실패, 규칙 기반으로 대신해요:`, error);
    return {
      prediction: estimateCosts(understandByRules(req), req.history, "rules"),
      source: "mock",
      notice: isBusy(error)
        ? "지금 AI가 붐비거나 사용 한도를 넘어서 규칙 기반으로 예측했어요. 잠시 뒤 다시 해 보세요"
        : "AI 예측에 실패해서 규칙 기반으로 예측했어요",
    };
  }
}
