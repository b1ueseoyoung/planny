// 소비 패턴 분석: 최근 N일 동안 어디에, 언제, 얼마나 썼는지 코드로 계산한다.
// TODO: 기간 고르기(최근 30일·3개월), AI가 이 숫자들을 보고 자연스러운 한두 문장으로 요약하기
import type { AppData, Category, EventType, ISODate, Transaction } from "./types";
import { CATEGORY_LABEL } from "./categories";
import { addDays, dayOfWeek } from "./date";
import { formatCompact } from "./format";
import { josa } from "./korean";

export interface CategoryStat {
  category: Category;
  amount: number;
  /** 전체 대비 비율 (0~1) */
  share: number;
  /** 바로 앞 기간의 같은 카테고리 금액 */
  previous: number;
}

export interface MerchantStat {
  merchant: string;
  category: Category;
  count: number;
  amount: number;
}

export interface EventTypeStat {
  eventType: EventType;
  count: number;
  average: number;
}

export interface InsightReport {
  days: number;
  start: ISODate;
  end: ISODate;
  total: number;
  /** 바로 앞 같은 길이 기간의 지출 */
  previousTotal: number;
  /** 금액 큰 순 */
  byCategory: CategoryStat[];
  /** 요일별 하루 평균 지출 (0 = 일요일) */
  weekdayAverage: number[];
  /** 자주 간 곳 (교통·정기결제 제외) */
  topMerchants: MerchantStat[];
  /** 지난 일정의 종류별 평균 실제 지출 (전체 기록 기준) */
  eventTypes: EventTypeStat[];
  /** 화면 맨 위에 보여줄 한 줄 요약 */
  highlights: string[];
}

const sum = (list: Transaction[]) => list.reduce((s, t) => s + t.amount, 0);

function sumByCategory(list: Transaction[]): Partial<Record<Category, number>> {
  const result: Partial<Record<Category, number>> = {};
  for (const t of list) result[t.category] = (result[t.category] ?? 0) + t.amount;
  return result;
}

export function buildInsights(data: AppData, today: ISODate, days = 30): InsightReport {
  const start = addDays(today, -(days - 1));
  const prevStart = addDays(start, -days);
  const prevEnd = addDays(start, -1);

  const current = data.transactions.filter((t) => t.date >= start && t.date <= today);
  const previous = data.transactions.filter((t) => t.date >= prevStart && t.date <= prevEnd);
  const total = sum(current);
  const previousTotal = sum(previous);

  // 1) 카테고리별
  const cur = sumByCategory(current);
  const prev = sumByCategory(previous);
  const byCategory: CategoryStat[] = (Object.entries(cur) as [Category, number][])
    .map(([category, amount]) => ({
      category,
      amount,
      share: total > 0 ? amount / total : 0,
      previous: prev[category] ?? 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 2) 요일별 하루 평균
  const daySums = Array<number>(7).fill(0);
  const dayCounts = Array<number>(7).fill(0);
  for (let i = 0; i < days; i++) dayCounts[dayOfWeek(addDays(start, i))]++;
  for (const t of current) daySums[dayOfWeek(t.date)] += t.amount;
  const weekdayAverage = daySums.map((s, i) => (dayCounts[i] > 0 ? Math.round(s / dayCounts[i]) : 0));

  // 3) 자주 가는 곳
  const merchants = new Map<string, MerchantStat>();
  for (const t of current) {
    if (t.category === "transport" || t.category === "subscription") continue;
    const m = merchants.get(t.merchant) ?? { merchant: t.merchant, category: t.category, count: 0, amount: 0 };
    m.count += 1;
    m.amount += t.amount;
    merchants.set(t.merchant, m);
  }
  const topMerchants = [...merchants.values()].sort((a, b) => b.count - a.count || b.amount - a.amount).slice(0, 5);

  // 4) 일정 종류별 평균 (연결된 거래가 있는 지난 일정만)
  const spentByEvent = new Map<string, number>();
  for (const t of data.transactions) {
    if (t.eventId) spentByEvent.set(t.eventId, (spentByEvent.get(t.eventId) ?? 0) + t.amount);
  }
  const byType = new Map<EventType, { count: number; total: number }>();
  for (const e of data.events) {
    const spent = spentByEvent.get(e.id);
    if (!spent || e.startDate > today) continue;
    const agg = byType.get(e.eventType) ?? { count: 0, total: 0 };
    agg.count += 1;
    agg.total += spent;
    byType.set(e.eventType, agg);
  }
  const eventTypes = [...byType.entries()]
    .map(([eventType, { count, total: t }]) => ({ eventType, count, average: Math.round(t / count) }))
    .sort((a, b) => b.average - a.average);

  return {
    days,
    start,
    end: today,
    total,
    previousTotal,
    byCategory,
    weekdayAverage,
    topMerchants,
    eventTypes,
    highlights: buildHighlights(byCategory, weekdayAverage, previousTotal, days),
  };
}

/** 숫자에서 눈에 띄는 점 몇 가지를 문장으로 (규칙 기반) */
function buildHighlights(
  byCategory: CategoryStat[],
  weekdayAverage: number[],
  previousTotal: number,
  days: number,
): string[] {
  const lines: string[] = [];

  const top = byCategory[0];
  if (top) {
    lines.push(`가장 많이 쓴 곳은 ${josa(CATEGORY_LABEL[top.category], "이에요", "예요")} (전체의 ${Math.round(top.share * 100)}%)`);
  }

  if (previousTotal > 0) {
    const rise = [...byCategory].sort((a, b) => b.amount - b.previous - (a.amount - a.previous))[0];
    const diff = rise ? rise.amount - rise.previous : 0;
    if (rise && diff >= 10_000) {
      lines.push(`${josa(CATEGORY_LABEL[rise.category], "이", "가")} 이전 ${days}일보다 ${formatCompact(diff)}원 늘었어요`);
    }
  }

  const avg = (idx: number[]) => idx.reduce((s, i) => s + weekdayAverage[i], 0) / idx.length;
  const weekday = avg([1, 2, 3, 4, 5]);
  const weekend = avg([0, 6]);
  if (weekday > 0 && weekend >= weekday * 1.2) {
    lines.push(`주말엔 평일보다 하루에 ${(weekend / weekday).toFixed(1)}배 더 써요`);
  } else if (weekend > 0 && weekday >= weekend * 1.2) {
    lines.push(`평일에 주말보다 하루에 ${(weekday / weekend).toFixed(1)}배 더 써요`);
  }

  return lines;
}
