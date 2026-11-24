// 서버 전용: Gemini로 일정 문장을 이해한다. (무료 등급으로 쓸 수 있음)
// 무료 등급은 보낸 내용이 구글 모델 개선에 쓰일 수 있어요. 지금은 샘플 데이터라 괜찮지만,
// TODO: 실제 사용자 소비 내역을 보낼 땐 유료 등급으로 바꾸거나 보내는 정보를 최소화하기
import { GoogleGenAI } from "@google/genai";
import * as z from "zod/v4";
import type { PredictRequest } from "../types";
import type { UnderstoodEvent } from "./types";
import { SYSTEM_PROMPT, UnderstoodEventSchema, buildUserMessage, sanitizeUnderstood } from "./schema";

/**
 * 차례대로 시도할 무료 모델. 무료 등급은 붐비면 503(과부하)·429(한도 초과)를 자주 내서,
 * 그럴 땐 한 번 더 시도하고 안 되면 다음 모델로 넘어간다.
 * 2026-11 기준: flash-lite는 빠르고(1~2초) 덜 붐빔, 3.6-flash는 느림(20초 이상), 3.8-flash는 자주 과부하.
 */
const FREE_MODELS = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];

/** 사용자를 이보다 오래 기다리게 하지 않는다. 넘으면 규칙 기반 예측으로 넘어감 (predict/index.ts) */
const TOTAL_BUDGET_MS = 20_000;
/** 요청 한 번에 기다리는 최대 시간. 무료 모델은 느릴 때가 많아서 길게 잡고, 재시도는 빨리 거절(503·429)된 경우에만 의미 있음 */
const ATTEMPT_TIMEOUT_MS = 18_000;

/** Gemini가 받는 JSON 스키마 ($schema 키는 지원하지 않아서 뺀다) */
const responseJsonSchema = (() => {
  const schema = z.toJSONSchema(UnderstoodEventSchema) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
})();

/** GEMINI_MODEL을 정해 두면 그 모델부터, 아니면 FREE_MODELS 순서대로 */
function modelsToTry(): string[] {
  const chosen = process.env.GEMINI_MODEL?.trim();
  return chosen ? [chosen, ...FREE_MODELS.filter((m) => m !== chosen)] : FREE_MODELS;
}

/** 잠깐 기다리면 풀릴 수 있는 오류인지 (과부하·한도 초과·시간 초과) */
function isBusy(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("name" in error && (error.name === "AbortError" || error.name === "TimeoutError")) return true;
  return "status" in error && (error.status === 503 || error.status === 429);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function askGemini(ai: GoogleGenAI, model: string, req: PredictRequest, timeoutMs: number): Promise<UnderstoodEvent> {
  const response = await ai.models.generateContent({
    model,
    contents: buildUserMessage(req),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema,
      abortSignal: AbortSignal.timeout(timeoutMs),
      // SDK의 자동 재시도(기본 최대 5번, 점점 길게 기다림)는 끄고 아래에서 직접 관리한다
      httpOptions: { retryOptions: { attempts: 1 } },
    },
  });
  const text = response.text;
  if (!text) throw new Error("Gemini 응답이 비어 있어요");
  const parsed = UnderstoodEventSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error(`Gemini 응답 형식이 달라요: ${parsed.error.message}`);
  return sanitizeUnderstood(parsed.data, req);
}

export async function understandWithGemini(req: PredictRequest): Promise<UnderstoodEvent> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError: unknown = new Error("Gemini 응답을 기다리는 시간이 지났어요");

  for (const model of modelsToTry()) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < 1_000) throw lastError;
      try {
        return await askGemini(ai, model, req, Math.min(ATTEMPT_TIMEOUT_MS, remaining));
      } catch (error) {
        lastError = error;
        if (!isBusy(error)) throw error; // 키가 틀렸거나 형식 오류면 다시 해도 소용없음
        if (attempt === 1) await wait(1_000);
      }
    }
  }
  throw lastError;
}
