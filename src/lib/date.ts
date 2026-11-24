// 날짜는 전부 'YYYY-MM-DD' 문자열로 다룬다. Date 객체는 계산할 때만 UTC로 잠깐 써서 시간대 문제를 피한다.
import type { ISODate, MonthKey } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

/** 월·일이 범위를 넘으면 알아서 넘겨준다 (예: 7월 32일 → 8월 1일) */
export function toISODate(y: number, m: number, d: number): ISODate {
  const t = new Date(Date.UTC(y, m - 1, d));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function parseISODate(date: ISODate) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

/** 사용자 기기 시간 기준 오늘 */
export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(date: ISODate, days: number): ISODate {
  const { y, m, d } = parseISODate(date);
  return toISODate(y, m, d + days);
}

/** a - b (일 수) */
export function diffDays(a: ISODate, b: ISODate): number {
  const pa = parseISODate(a);
  const pb = parseISODate(b);
  return Math.round((Date.UTC(pa.y, pa.m - 1, pa.d) - Date.UTC(pb.y, pb.m - 1, pb.d)) / 86_400_000);
}

/** 0 = 일요일 */
export function dayOfWeek(date: ISODate): number {
  const { y, m, d } = parseISODate(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function monthKey(date: ISODate): MonthKey {
  return date.slice(0, 7);
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split("-").map(Number);
  return toISODate(y, m + n, 1).slice(0, 7);
}

export function daysInMonth(month: MonthKey): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthStart(month: MonthKey): ISODate {
  return `${month}-01`;
}

export function monthEnd(month: MonthKey): ISODate {
  return `${month}-${pad(daysInMonth(month))}`;
}

export const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** "7월 20일 (월)" */
export function formatDateKo(date: ISODate, withWeekday = true): string {
  const { m, d } = parseISODate(date);
  return withWeekday ? `${m}월 ${d}일 (${WEEKDAYS_KO[dayOfWeek(date)]})` : `${m}월 ${d}일`;
}

/** "2026년 7월" */
export function formatMonthKo(month: MonthKey): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}년 ${m}월`;
}

/** 하루면 "7월 20일 (월)", 여러 날이면 "8월 5일 (수) ~ 8월 7일 (금) · 2박 3일" */
export function formatRangeKo(start: ISODate, end: ISODate): string {
  if (start === end) return formatDateKo(start);
  const nights = diffDays(end, start);
  return `${formatDateKo(start)} ~ ${formatDateKo(end)} · ${nights}박 ${nights + 1}일`;
}

/** "오늘", "내일", "D-3", "2일 전" */
export function dDayLabel(target: ISODate, today: ISODate): string {
  const n = diffDays(target, today);
  if (n === 0) return "오늘";
  if (n === 1) return "내일";
  return n > 0 ? `D-${n}` : `${-n}일 전`;
}
