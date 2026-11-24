// 서버 전용: Claude로 일정 문장을 이해한다. (유료 API 키 필요)
// API 키가 브라우저로 새지 않도록 이 파일은 predict/index.ts(→ api/predict/route.ts)에서만 import 하기.
// TODO: 요청이 많아지면 프롬프트 캐싱으로 비용 줄이기
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { PredictRequest } from "../types";
import type { UnderstoodEvent } from "./types";
import { SYSTEM_PROMPT, UnderstoodEventSchema, buildUserMessage, sanitizeUnderstood } from "./schema";

const MODEL = "claude-opus-5-5";

export async function understandWithClaude(req: PredictRequest): Promise<UnderstoodEvent> {
  const client = new Anthropic(); // ANTHROPIC_API_KEY 환경 변수를 읽는다

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // 안전 분류기가 요청을 거절하면 서버에서 다른 모델로 다시 시도
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(UnderstoodEventSchema) },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(req) }],
  });

  if (response.stop_reason === "refusal") throw new Error("AI가 이 일정에 대한 답변을 거절했어요");
  if (!response.parsed_output) throw new Error("AI 응답을 해석하지 못했어요");
  return sanitizeUnderstood(response.parsed_output, req);
}
