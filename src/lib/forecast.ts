// 한 달 예산 예측 계산. 돈 계산은 AI가 아니라 전부 여기 코드에서 한다.
import type {
  Adjustments,
  AppData,
  BudgetStatus,
  CalendarEvent,
  Category,
  EventPrediction,
  ISODate,
  MonthForecast,
  MonthKey,
} from "./types";
import { addDays, daysInMonth, diffDays, monthEnd, monthKey } from "./date";

/** 평소 생활비 평균을 낼 때 보는 기간 (일) */
export const ROUTINE_WINDOW_DAYS = 60;
/** 잔액이 예산의 이 비율보다 적으면 '빠듯함' */
export const TIGHT_RATIO = 0.1;

export interface ForecastOptions {
  /** 시뮬레이션: 카테고리별로 줄여볼 비율 */
  adjustments?: Adjustments;
  /** 아직 저장하지 않은 예측을 포함해서 계산 (추가 전/후 비교용) */
  extraEvent?: EventPrediction | null;
}

/** 예측 항목 금액 합계 */
export function predictionTotal(prediction: EventPrediction): number {
  return prediction.items.reduce((sum, item) => sum + item.amount, 0);
}

/** 일정 비용: 지난 일정은 연결된 거래의 합(actual), 다가오는 일정은 예측 합계(predicted) */
export function eventCost(
  data: AppData,
  event: CalendarEvent,
): { amount: number; kind: "actual" | "predicted" | "none" } {
  const actual = data.transactions
    .filter((t) => t.eventId === event.id)
    .reduce((sum, t) => sum + t.amount, 0);
  if (actual > 0) return { amount: actual, kind: "actual" };
  if (event.prediction) return { amount: predictionTotal(event.prediction), kind: "predicted" };
  return { amount: 0, kind: "none" };
}

/** 날짜별 실제 지출 합계 (캘린더 칸 표시용) */
export function spendingByDay(data: AppData, month: MonthKey): Record<ISODate, number> {
  const result: Record<ISODate, number> = {};
  for (const t of data.transactions) {
    if (!t.date.startsWith(month)) continue;
    result[t.date] = (result[t.date] ?? 0) + t.amount;
  }
  return result;
}

/** 잔액으로 예산 상태 판단 */
export function budgetStatus(balance: number, budget: number): BudgetStatus {
  if (balance < 0) return "over";
  if (balance < budget * TIGHT_RATIO) return "tight";
  return "safe";
}

/**
 * 일정을 뺀 평소 생활비의 카테고리별 하루 평균 (최근 60일).
 * 기록이 60일보다 짧으면 실제 기록 기간으로 나눈다.
 * TODO: 정기결제(통신비 등)는 평균 대신 결제일 기준으로 따로 잡기
 */
export function routineDailyAverage(data: AppData, today: ISODate): Partial<Record<Category, number>> {
  const from = addDays(today, -(ROUTINE_WINDOW_DAYS - 1));
  const sums: Partial<Record<Category, number>> = {};
  let earliest: ISODate | null = null;
  for (const t of data.transactions) {
    if (t.eventId || t.date < from || t.date > today) continue;
    sums[t.category] = (sums[t.category] ?? 0) + t.amount;
    if (!earliest || t.date < earliest) earliest = t.date;
  }
  if (!earliest) return {};
  const days = diffDays(today, earliest) + 1;
  const result: Partial<Record<Category, number>> = {};
  for (const [category, sum] of Object.entries(sums) as [Category, number][]) {
    result[category] = sum / days;
  }
  return result;
}

/** 아직 오지 않은 일정인지 (오늘 일정은 실제 지출 기록이 없을 때만 예정으로 본다) */
function isUpcoming(data: AppData, event: CalendarEvent, today: ISODate): boolean {
  if (event.startDate > today) return true;
  if (event.startDate < today) return false;
  return !data.transactions.some((t) => t.eventId === event.id);
}

/**
 * 한 달 예산 예측
 * - 지난 달: 실제로 쓴 돈만
 * - 이번 달: 오늘까지 쓴 돈 + 남은 날의 평소 생활비 + 남은 일정 예상 비용
 * - 다음 달 이후: 한 달 치 평소 생활비 + 그 달 일정 예상 비용
 * TODO: 일정이 있는 날은 평소 생활비가 덜 나가는 점 반영하기
 */
export function computeMonthForecast(
  data: AppData,
  month: MonthKey,
  today: ISODate,
  options: ForecastOptions = {},
): MonthForecast {
  const { adjustments = {}, extraEvent = null } = options;
  const currentMonth = monthKey(today);
  const phase = month < currentMonth ? "past" : month === currentMonth ? "current" : "future";

  // 1) 실제로 쓴 돈
  let spent = 0;
  if (phase !== "future") {
    for (const t of data.transactions) {
      if (monthKey(t.date) === month && t.date <= today) spent += t.amount;
    }
  }

  // 2) 남은 기간 평소 생활비
  const remainingDays =
    phase === "current" ? diffDays(monthEnd(month), today) : phase === "future" ? daysInMonth(month) : 0;
  const routineByCategory: Partial<Record<Category, number>> = {};
  let routineProjected = 0;
  if (remainingDays > 0) {
    const daily = routineDailyAverage(data, today);
    for (const [category, perDay] of Object.entries(daily) as [Category, number][]) {
      const base = Math.round(perDay * remainingDays);
      if (base <= 0) continue;
      routineByCategory[category] = base;
      const ratio = Math.min(Math.max(adjustments[category] ?? 0, 0), 1);
      routineProjected += Math.round(base * (1 - ratio));
    }
  }

  // 3) 남은 일정 예상 비용
  let eventsProjected = 0;
  if (phase !== "past") {
    for (const event of data.events) {
      if (monthKey(event.startDate) !== month || !event.prediction) continue;
      if (isUpcoming(data, event, today)) eventsProjected += predictionTotal(event.prediction);
    }
    if (extraEvent && monthKey(extraEvent.startDate) === month && extraEvent.startDate >= today) {
      eventsProjected += predictionTotal(extraEvent);
    }
  }

  const projectedBalance = Math.round(data.budget - (spent + routineProjected + eventsProjected));
  return {
    month,
    budget: data.budget,
    spent: Math.round(spent),
    routineProjected,
    eventsProjected: Math.round(eventsProjected),
    projectedBalance,
    status: budgetStatus(projectedBalance, data.budget),
    routineByCategory,
  };
}
