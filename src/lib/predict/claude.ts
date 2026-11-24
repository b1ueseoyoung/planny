// 서버 전용: Claude API로 일정 비용을 예측한다.
// API 키가 브라우저로 새지 않도록 이 파일은 predict/index.ts(→ api/predict/route.ts)에서만 import 하기.
// TODO: 프롬프트 다듬기 (예시 추가, 지역 물가 반영), 요청이 많아지면 프롬프트 캐싱으로 비용 줄이기
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { CATEGORIES, EVENT_TYPES, type EventPrediction, type PredictRequest } from "../types";
import { CATEGORY_LABEL } from "../categories";
import { parseISODate, toISODate } from "../date";

const MODEL = "claude-opus-5-5";

/** AI가 반드시 이 모양의 JSON으로 답하게 만드는 스키마 (EventPrediction과 같은 모양) */
const PredictionSchema = z.object({
  title: z.string().describe("일정 제목. 날짜 표현은 빼고 짧게"),
  startDate: z.string().describe("시작일 YYYY-MM-DD"),
  endDate: z.string().describe("마지막 날 YYYY-MM-DD. 하루 일정이면 startDate와 같음"),
  eventType: z.enum(EVENT_TYPES),
  location: z.string().nullable().describe("장소. 모르면 null"),
  items: z.array(
    z.object({
      category: z.enum(CATEGORIES),
      label: z.string().describe("항목 이름 (예: 저녁 식사, KTX 왕복)"),
      amount: z.number().describe("사용자 1인 부담 금액 (원)"),
    }),
  ),
  reasons: z.array(z.string()).describe("예측 근거 2~4개. 한국어 짧은 문장"),
  savingTips: z
    .array(z.object({ label: z.string(), amount: z.number() }))
    .describe("이 일정에서 아낄 수 있는 현실적인 방법 0~3개와 아끼는 금액"),
});

const SYSTEM_PROMPT = `너는 한국 사용자의 일정 문장을 보고, 그 일정에서 사용자 본인이 쓸 돈을 항목별로 추정하는 소비 예측 도우미야.
- "이번 주 토요일", "다음 달 5일" 같은 표현은 메시지에 있는 오늘 날짜를 기준으로 YYYY-MM-DD로 바꿔. 날짜가 없으면 기본 날짜를 써. 여러 날 일정이면 endDate를 마지막 날로 해.
- 금액은 사용자 1인 부담 기준의 원 단위 정수로, 현재 한국 물가에 맞게 현실적으로 잡아.
- 과거 소비 요약(평소 카테고리별 하루 평균, 지난 일정의 실제 지출)을 보고 이 사람의 씀씀이에 맞춰. 비슷한 지난 일정이 있으면 근거로 언급해.
- 예산 영향이나 월말 잔액은 계산하지 마. 앱이 따로 계산해.
- category: meal(식사) cafe(카페·간식) delivery(배달) grocery(장보기·편의점) transport(교통) lodging(숙박) shopping(쇼핑) culture(문화·여가) gift(선물·경조사) subscription(정기결제) etc(기타)`;

export async function predictWithClaude(req: PredictRequest): Promise<EventPrediction> {
  const client = new Anthropic(); // ANTHROPIC_API_KEY 환경 변수를 읽는다

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // 안전 분류기가 요청을 거절하면 서버에서 다른 모델로 다시 시도
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(PredictionSchema) },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `오늘: ${req.today}`,
          `기본 날짜: ${req.defaultDate}`,
          `과거 소비 요약: ${JSON.stringify(req.history)}`,
          `일정: ${req.text}`,
        ].join("\n"),
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("AI가 이 일정에 대한 답변을 거절했어요");
  if (!response.parsed_output) throw new Error("AI 응답을 해석하지 못했어요");
  return sanitize(response.parsed_output, req);
}

function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { y, m, d } = parseISODate(value);
  return toISODate(y, m, d) === value;
}

/** AI 응답을 앱에서 안전하게 쓸 수 있게 정리 (금액은 0 이상 정수, 날짜는 올바른 순서) */
function sanitize(raw: z.infer<typeof PredictionSchema>, req: PredictRequest): EventPrediction {
  const money = (n: number) => Math.max(0, Math.round(n));
  const startDate = isISODate(raw.startDate) ? raw.startDate : req.defaultDate;
  const endDate = isISODate(raw.endDate) && raw.endDate >= startDate ? raw.endDate : startDate;
  return {
    title: raw.title.trim() || req.text.trim(),
    startDate,
    endDate,
    eventType: raw.eventType,
    location: raw.location?.trim() || null,
    items: raw.items
      .map((i) => ({ category: i.category, label: i.label.trim() || CATEGORY_LABEL[i.category], amount: money(i.amount) }))
      .filter((i) => i.amount > 0),
    reasons: raw.reasons.map((r) => r.trim()).filter(Boolean).slice(0, 5),
    savingTips: raw.savingTips
      .map((t) => ({ label: t.label.trim(), amount: money(t.amount) }))
      .filter((t) => t.label && t.amount > 0)
      .slice(0, 3),
  };
}
