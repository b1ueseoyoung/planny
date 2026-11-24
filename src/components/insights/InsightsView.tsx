"use client";

import { useMemo } from "react";
import { useAppData } from "@/lib/store";
import { buildInsights } from "@/lib/insights";
import { Card } from "@/components/ui/Card";
import { SummaryCard } from "./SummaryCard";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { WeekdayPattern } from "./WeekdayPattern";
import { TopPlaces } from "./TopPlaces";
import { EventTypeAverages } from "./EventTypeAverages";

export function InsightsView() {
  const { data, today } = useAppData();
  const report = useMemo(() => buildInsights(data, today), [data, today]);

  if (report.total === 0) {
    return (
      <div className="px-5">
        <Card>
          <p className="py-6 text-center text-sm text-muted">최근 30일 동안 기록된 지출이 없어요</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-5">
      <SummaryCard report={report} />
      <CategoryBreakdown report={report} />
      <WeekdayPattern report={report} />
      <TopPlaces report={report} />
      <EventTypeAverages report={report} />
      {/* TODO: 기간 고르기(최근 30일·3개월), 지난달과 나란히 비교, AI 한 줄 요약 */}
    </div>
  );
}
