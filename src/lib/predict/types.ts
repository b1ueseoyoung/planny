// 예측 모듈 안에서만 쓰는 타입
import type { Category, EventType, ISODate } from "../types";

/** 누가 내는지: me(내가 다 냄), split(나눠 냄), others(다른 사람·회사가 냄), unknown(모름) */
export type Payer = "me" | "split" | "others" | "unknown";

/**
 * 일정 문장을 "이해"한 결과. AI(gemini.ts, claude.ts)나 규칙(rules.ts)이 만든다.
 * items의 estimate는 대략적인 추정이고, 최종 금액은 estimate.ts가 내 기록을 보고 정한다.
 */
export interface UnderstoodEvent {
  title: string;
  startDate: ISODate;
  endDate: ISODate;
  eventType: EventType;
  location: string | null;
  /** 함께하는 사람 이름 (본인 제외) */
  people: string[];
  /** 본인 포함 인원, 모르면 null */
  headcount: number | null;
  payer: Payer;
  /** 이 일정에 드는 지출 항목과 사용자 본인이 낼 대략 금액 */
  items: { category: Category; label: string; estimate: number }[];
  /** 금액을 이렇게 잡은 근거 */
  notes: string[];
  savingTips: { label: string; amount: number }[];
}

export type Understander = "gemini" | "claude" | "rules";
