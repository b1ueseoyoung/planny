"use client";

import { useAppData } from "@/lib/store";
import { dDayLabel, formatDateKo } from "@/lib/date";
import { formatWon } from "@/lib/format";
import { eventCost } from "@/lib/forecast";
import { Card, CardTitle } from "@/components/ui/Card";

/** 오늘 이후 일정 몇 개와 예상 비용 */
export function UpcomingEvents() {
  const { data, today } = useAppData();
  const upcoming = data.events
    .filter((e) => e.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 4);

  if (upcoming.length === 0) return null;

  return (
    <Card>
      <CardTitle>다가오는 일정</CardTitle>
      <ul className="divide-y divide-line">
        {upcoming.map((e) => {
          const cost = eventCost(data, e);
          return (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{e.title}</p>
                <p className="text-xs text-muted">
                  {formatDateKo(e.startDate)} · {dDayLabel(e.startDate, today)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {cost.kind === "predicted" ? "예상 " : ""}
                {formatWon(cost.amount)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
