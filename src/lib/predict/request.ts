// POST /api/predict 요청 본문 검사. 브라우저가 보낸 값은 믿지 않고, 여기서 통과한 값만 AI와 예측 코드로 넘긴다.
// 모양은 src/lib/types.ts의 PredictRequest와 같다 (아래 satisfies가 어긋나면 타입 오류를 낸다).
// 길이·개수 제한은 요청 하나가 AI 프롬프트를 지나치게 키우지 못하게 하려는 것이다.
import * as z from "zod/v4";
import { CATEGORIES, EVENT_TYPES, type PredictRequest } from "../types";
import { isISODate } from "./schema";
import { MAX_TEXT_LENGTH } from "./limits";

/** 지난 일정 개수. 브라우저는 최근 20개만 보낸다 (history.ts의 MAX_PAST_EVENTS) */
const MAX_PAST_EVENTS = 20;
/** 지난 일정 하나의 항목 수. 브라우저는 카테고리별로 합쳐 보내서 카테고리 수(11)를 넘지 않는다 */
const MAX_ITEMS = CATEGORIES.length;
/** 금액 하나의 최대값 (원). 현실에서 나올 수 없는 값은 거른다 */
const MAX_AMOUNT = 1_000_000_000;

const isoDate = z.string().refine(isISODate, "YYYY-MM-DD 형식의 올바른 날짜여야 해요");
const amount = z.number().finite().min(0).max(MAX_AMOUNT);
const shortText = (max: number) => z.string().max(max);

const PredictedItemSchema = z.object({
  category: z.enum(CATEGORIES),
  label: shortText(50),
  amount,
});

const PastEventSchema = z.object({
  id: shortText(100),
  title: shortText(100),
  startDate: isoDate,
  location: shortText(100).nullable(),
  eventType: z.enum(EVENT_TYPES),
  total: amount,
  items: z.array(PredictedItemSchema).max(MAX_ITEMS),
});

const HistorySummarySchema = z.object({
  dailyAverageByCategory: z.partialRecord(z.enum(CATEGORIES), amount),
  pastEvents: z.array(PastEventSchema).max(MAX_PAST_EVENTS),
});

export const PredictRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "일정 문장이 비어 있어요")
    .max(MAX_TEXT_LENGTH, `일정 문장은 ${MAX_TEXT_LENGTH}자까지 쓸 수 있어요`),
  defaultDate: isoDate,
  today: isoDate,
  history: HistorySummarySchema,
}) satisfies z.ZodType<PredictRequest>;

/** 요청 본문 최대 크기 (바이트). 위 제한을 다 채워도 이보다 훨씬 작다 */
export const MAX_BODY_BYTES = 64 * 1024;

/** 검사 결과. 실패하면 어느 필드가 틀렸는지만 알려준다 (보낸 값은 응답에 되돌려 주지 않는다) */
export function parsePredictRequest(
  body: unknown,
): { ok: true; data: PredictRequest } | { ok: false; errors: { field: string; message: string }[] } {
  const result = PredictRequestSchema.safeParse(body);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    errors: result.error.issues.slice(0, 10).map((issue) => ({
      field: issue.path.join(".") || "(본문)",
      message: issue.message,
    })),
  };
}
