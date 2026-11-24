// 홈 화면 요약 카드용 계산 (이번 주, 소비 날씨, 연속 기록, 다가오는 지출, 카테고리별 전망).
// 날짜별 금액은 forecast.ts의 dailySpend 기준을 그대로 따른다.
import type { AppData, CalendarEvent, Category, EventType, ISODate, MonthForecast, Transaction } from "./types";
import { addDays, dayOfWeek, daysInMonth, monthKey, monthStart, parseISODate, toISODate } from "./date";
import { dailySpend, isUpcoming, predictionTotal, routineDailyTotal, type DaySpend } from "./forecast";

/** 일요일에 시작하는 이번 주 */
export function weekRange(today: ISODate): { start: ISODate; end: ISODate } {
  const start = addDays(today, -dayOfWeek(today));
  return { start, end: addDays(start, 6) };
}

const WEEK_ORDINAL = ["첫째", "둘째", "셋째", "넷째", "다섯째", "여섯째"];

/** "11월 넷째 주" */
export function weekLabelKo(today: ISODate): string {
  const { m, d } = parseISODate(today);
  const index = Math.floor((d - 1 + dayOfWeek(monthStart(monthKey(today)))) / 7);
  return `${m}월 ${WEEK_ORDINAL[index]} 주`;
}

/** 하루 예산: 월 예산을 그 달 일수로 나눈 값 */
export function dailyBudgetOf(data: AppData, date: ISODate): number {
  return data.budget / daysInMonth(monthKey(date));
}

export interface WeekSummary {
  days: DaySpend[];
  /** 이번 주 합계 (지난 날은 실제, 남은 날은 예상) */
  total: number;
  /** 일정 없는 평소 한 주 생활비 */
  usual: number;
}

export function weekSummary(data: AppData, today: ISODate): WeekSummary {
  const { start, end } = weekRange(today);
  const days = dailySpend(data, start, end, today);
  return {
    days,
    total: days.reduce((sum, d) => sum + d.amount, 0),
    usual: Math.round(routineDailyTotal(data, today) * 7),
  };
}

/** 평소 한 주와 비교한 이번 주 소비를 날씨로 표현 */
export type SpendWeather = "clear" | "partly" | "cloudy" | "rain";

export const WEATHER_LABEL: Record<SpendWeather, string> = {
  clear: "맑음",
  partly: "구름 조금",
  cloudy: "흐림",
  rain: "비",
};

export function spendWeather(total: number, usual: number): SpendWeather {
  if (usual <= 0 || total <= usual) return "clear";
  const ratio = total / usual;
  if (ratio <= 1.2) return "partly";
  if (ratio <= 1.5) return "cloudy";
  return "rain";
}

export interface BudgetStreak {
  /** 어제부터 거꾸로 하루 예산을 지킨 날 수 */
  streak: number;
  /** 이번 달 지난 날 중 지킨 날 */
  kept: number;
  /** 이번 달 지난 날 수 (오늘 제외) */
  passed: number;
  /** 최근 7일 지켰는지 (오래된 날부터) */
  recent: boolean[];
}

/** 하루 예산 안에서 쓴 날. 오늘은 아직 안 끝나서 어제까지만 센다 */
export function budgetStreak(data: AppData, today: ISODate): BudgetStreak {
  const dailyBudget = dailyBudgetOf(data, today);
  const kept = (d: DaySpend) => d.amount <= dailyBudget;
  const history = dailySpend(data, addDays(today, -60), addDays(today, -1), today);

  let streak = 0;
  for (let i = history.length - 1; i >= 0 && kept(history[i]); i--) streak++;
  const thisMonth = history.filter((d) => d.date >= monthStart(monthKey(today)));
  return {
    streak,
    kept: thisMonth.filter(kept).length,
    passed: thisMonth.length,
    recent: history.slice(-7).map(kept),
  };
}

/** 금액을 체감되는 것으로: 2만원 미만은 커피(4,500원), 그 이상은 치킨(2만원) */
export function tangibleLabel(amount: number): string {
  if (amount < 20_000) return `커피 ${Math.max(1, Math.round(amount / 4_500))}잔`;
  return `치킨 ${Math.max(1, Math.round(amount / 20_000))}마리`;
}

/** 앞으로 withinDays일 안의 일정 중 예상 비용이 가장 큰 것 */
export function biggestUpcomingEvent(data: AppData, today: ISODate, withinDays = 14): CalendarEvent | null {
  const until = addDays(today, withinDays);
  let best: CalendarEvent | null = null;
  let bestTotal = 0;
  for (const e of data.events) {
    if (!e.prediction || e.startDate > until || !isUpcoming(data, e, today)) continue;
    const total = predictionTotal(e.prediction);
    if (total > bestTotal) {
      best = e;
      bestTotal = total;
    }
  }
  return best;
}

export interface UpcomingPayment {
  id: string;
  date: ISODate;
  title: string;
  amount: number;
  kind: "event" | "subscription";
  eventType?: EventType;
}

/**
 * 다가오는 일정(예상 비용)과 정기결제(마지막 결제일의 다음 달 같은 날)를 날짜순으로.
 * TODO: 정기결제는 아직 월말 예측에서 평균으로 잡혀 있다 (forecast.ts의 routineDailyAverage TODO 참고)
 */
export function upcomingPayments(data: AppData, today: ISODate, withinDays = 30): UpcomingPayment[] {
  const until = addDays(today, withinDays);
  const events: UpcomingPayment[] = data.events
    .filter((e) => e.prediction && e.startDate <= until && isUpcoming(data, e, today))
    .map((e) => ({
      id: e.id,
      date: e.startDate,
      title: e.title,
      amount: predictionTotal(e.prediction!),
      kind: "event",
      eventType: e.eventType,
    }));

  const latest = new Map<string, Transaction>();
  for (const t of data.transactions) {
    if (t.category !== "subscription") continue;
    const prev = latest.get(t.merchant);
    if (!prev || prev.date < t.date) latest.set(t.merchant, t);
  }
  const subscriptions: UpcomingPayment[] = [];
  for (const t of latest.values()) {
    let next = nextMonthSameDay(t.date);
    while (next <= today) next = nextMonthSameDay(next);
    if (next <= until) {
      subscriptions.push({ id: `sub_${t.merchant}`, date: next, title: t.merchant, amount: t.amount, kind: "subscription" });
    }
  }

  return [...events, ...subscriptions].sort((a, b) => a.date.localeCompare(b.date));
}

function nextMonthSameDay(date: ISODate): ISODate {
  const { y, m, d } = parseISODate(date);
  return toISODate(y, m + 1, d);
}

export interface CategoryOutlook {
  category: Category;
  /** 그 달 오늘까지 쓴 돈 */
  spent: number;
  /** 남은 기간 예상 (평소 생활비 + 다가오는 일정 항목) */
  projected: number;
}

/** 그 달 카테고리별 쓴 돈과 남은 기간 예상. 합계가 큰 순서 */
export function categoryOutlook(data: AppData, forecast: MonthForecast, today: ISODate): CategoryOutlook[] {
  const { month } = forecast;
  const spent: Partial<Record<Category, number>> = {};
  for (const t of data.transactions) {
    if (monthKey(t.date) === month && t.date <= today) spent[t.category] = (spent[t.category] ?? 0) + t.amount;
  }

  const projected: Partial<Record<Category, number>> = { ...forecast.routineByCategory };
  for (const e of data.events) {
    if (!e.prediction || monthKey(e.startDate) !== month || !isUpcoming(data, e, today)) continue;
    for (const item of e.prediction.items) projected[item.category] = (projected[item.category] ?? 0) + item.amount;
  }

  const categories = new Set([...Object.keys(spent), ...Object.keys(projected)] as Category[]);
  return [...categories]
    .map((category) => ({
      category,
      spent: Math.round(spent[category] ?? 0),
      projected: Math.round(projected[category] ?? 0),
    }))
    .filter((c) => c.spent + c.projected > 0)
    .sort((a, b) => b.spent + b.projected - (a.spent + a.projected));
}
