// AI(Gemini·Claude)가 공통으로 쓰는 응답 형식, 프롬프트, 응답 정리 함수
// TODO: 프롬프트에 예시 몇 개 넣기, 예상 vs 실제 지출을 모아서 프롬프트 다듬기
import * as z from "zod/v4";
import { CATEGORIES, EVENT_TYPES, type PredictRequest } from "../types";
import { CATEGORY_LABEL } from "../categories";
import { formatDateKo, parseISODate, toISODate } from "../date";
import type { UnderstoodEvent } from "./types";
import { cleanPeople } from "./people";

/** AI가 반드시 이 모양의 JSON으로 답하게 하는 스키마 (UnderstoodEvent와 같은 모양) */
export const UnderstoodEventSchema = z.object({
  title: z.string().describe("일정 제목. 날짜 표현은 빼고 짧게"),
  startDate: z.string().describe("시작일 YYYY-MM-DD"),
  endDate: z.string().describe("마지막 날 YYYY-MM-DD. 하루 일정이면 startDate와 같음"),
  eventType: z.enum(EVENT_TYPES),
  location: z.string().nullable().describe("장소. 모르면 null"),
  people: z.array(z.string()).describe("함께하는 사람 이름 (본인 제외, 조사 없이)"),
  headcount: z.number().nullable().describe("본인 포함 인원. 모르면 null"),
  payer: z.enum(["me", "split", "others", "unknown"]).describe("누가 내는지"),
  items: z.array(
    z.object({
      category: z.enum(CATEGORIES),
      label: z.string().describe("항목 이름 (예: 저녁 식사, 축의금, 왕복 항공권)"),
      estimate: z.number().describe("사용자 본인이 낼 금액 (원)"),
    }),
  ),
  notes: z.array(z.string()).describe("금액을 이렇게 잡은 근거 1~3개, 한국어 짧은 문장"),
  savingTips: z
    .array(z.object({ label: z.string(), amount: z.number() }))
    .describe("현실적인 절약 방법 0~3개와 아끼는 금액"),
});

export type UnderstoodEventRaw = z.infer<typeof UnderstoodEventSchema>;

export const SYSTEM_PROMPT = `너는 한국 사용자의 일정 문장을 읽고, 그 일정에서 사용자 본인이 쓸 돈을 항목별로 정리하는 도우미야.

- 날짜: "이번 주 토요일", "다음 달 5일" 같은 표현은 메시지의 '오늘'을 기준으로 YYYY-MM-DD로 바꿔. 문장에 날짜가 없으면 '기본 날짜'를 써. 여러 날 일정이면 endDate를 마지막 날로 해.
- eventType: friends(친구 모임), date(데이트), travel(여행), performance(공연·전시·영화), work(회사·회식), family(가족), other(결혼식·장례식·병원 등 그 밖).
- people: 문장에 나온, 함께하는 사람만 넣어. 본인은 빼고, "채연이랑" → "채연"처럼 조사와 '이'는 떼. 이름 대신 관계만 나오면(팀장님, 엄마) 그대로 넣어. "친구들", "동기들", "가족"처럼 여럿을 묶어 부르는 말은 넣지 마. 없으면 빈 배열.
- headcount: 본인 포함 인원. 문장에서 알 수 없으면 null.
- payer: 사용자가 다른 사람 몫까지 내면 "me"(예: 내가 쏜다, 한턱), 나눠 내면 "split", 다른 사람이나 회사가 내면 "others"(예: 법카, 얻어먹음). 혼자 쓰는 돈(축의금, 혼자 가는 여행 등)이거나 알 수 없으면 "unknown".
- items: 이 일정에 실제로 드는 지출 항목과 사용자 본인이 낼 금액(원, 정수). 지금 한국 물가로 현실적으로 잡아. payer가 "me"면 다른 사람 몫까지 넣고, 남이 내는 항목은 넣지 마. 결혼식 축의금, 해외여행 항공권, 숙박처럼 그 일정에만 있는 큰 항목을 빠뜨리지 마. 회사 회식·송별회처럼 회사가 내는 일정도 2차나 귀가 교통비처럼 본인이 낼 만한 항목은 넣어.
- notes: 금액을 이렇게 잡은 근거 1~3개를 해요체 짧은 문장으로 (예: "축의금은 보통 5~10만원이에요").
- savingTips: 현실적인 절약 방법 0~3개와 그때 아끼는 금액.
- 예산이나 월말 잔액은 계산하지 마. 앱이 따로 계산해.
- 과거 소비 요약이 있으면 이 사람의 평소 씀씀이에 맞춰.
- category: meal(식사) cafe(카페·간식) delivery(배달) grocery(장보기·편의점) transport(교통) lodging(숙박) shopping(쇼핑) culture(문화·여가) gift(선물·경조사) subscription(정기결제) etc(기타)`;

/** AI에게 보내는 사용자 메시지 */
export function buildUserMessage(req: PredictRequest): string {
  return [
    `오늘: ${req.today} (${formatDateKo(req.today)})`,
    `기본 날짜: ${req.defaultDate}`,
    `과거 소비 요약: ${JSON.stringify(req.history)}`,
    `일정: ${req.text}`,
  ].join("\n");
}

/** 올바른 'YYYY-MM-DD' 날짜인지 (2월 30일 같은 없는 날은 false) */
export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { y, m, d } = parseISODate(value);
  return toISODate(y, m, d) === value;
}

const money = (n: number) => Math.max(0, Math.round(n / 100) * 100);

/** AI 응답을 앱에서 안전하게 쓸 수 있게 정리 (금액은 0 이상 100원 단위, 날짜는 올바른 순서, 개수 제한) */
export function sanitizeUnderstood(raw: UnderstoodEventRaw, req: PredictRequest): UnderstoodEvent {
  const startDate = isISODate(raw.startDate) ? raw.startDate : req.defaultDate;
  const endDate = isISODate(raw.endDate) && raw.endDate >= startDate ? raw.endDate : startDate;
  const people = cleanPeople(raw.people);
  const headcount = raw.headcount && raw.headcount >= 1 ? Math.round(raw.headcount) : null;

  return {
    title: raw.title.trim() || req.text.trim(),
    startDate,
    endDate,
    eventType: raw.eventType,
    location: raw.location?.trim() || null,
    people,
    headcount,
    payer: raw.payer,
    items: raw.items
      .map((i) => ({ category: i.category, label: i.label.trim() || CATEGORY_LABEL[i.category], estimate: money(i.estimate) }))
      .filter((i) => i.estimate > 0)
      .slice(0, 10),
    notes: raw.notes.map((n) => n.trim()).filter(Boolean).slice(0, 4),
    savingTips: raw.savingTips
      .map((t) => ({ label: t.label.trim(), amount: money(t.amount) }))
      .filter((t) => t.label && t.amount > 0)
      .slice(0, 3),
  };
}
