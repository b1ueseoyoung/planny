// AI 예측에 넘길 과거 소비 요약 (평소 생활비 + 지난 일정의 실제 지출)
import type { AppData, Category, HistorySummary, ISODate, PredictedItem } from "./types";
import { CATEGORY_LABEL } from "./categories";
import { routineDailyAverage } from "./forecast";

const MAX_PAST_EVENTS = 20;

export function buildHistorySummary(data: AppData, today: ISODate): HistorySummary {
  const dailyAverageByCategory: Partial<Record<Category, number>> = {};
  for (const [category, perDay] of Object.entries(routineDailyAverage(data, today)) as [Category, number][]) {
    dailyAverageByCategory[category] = Math.round(perDay);
  }

  const pastEvents = data.events
    .filter((event) => event.startDate <= today)
    .map((event) => {
      // 연결된 거래를 카테고리별로 합쳐서 실제 지출 항목으로
      const byCategory: Partial<Record<Category, number>> = {};
      for (const t of data.transactions) {
        if (t.eventId === event.id) byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
      }
      const items: PredictedItem[] = (Object.entries(byCategory) as [Category, number][]).map(
        ([category, amount]) => ({ category, label: CATEGORY_LABEL[category], amount }),
      );
      const total = items.reduce((sum, item) => sum + item.amount, 0);
      return {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        location: event.location,
        eventType: event.eventType,
        total,
        items,
      };
    })
    .filter((event) => event.total > 0) // 실제 지출 기록이 있는 일정만
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, MAX_PAST_EVENTS);

  return { dailyAverageByCategory, pastEvents };
}
