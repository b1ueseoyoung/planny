"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAppData } from "@/lib/store";
import { addMonths, formatMonthKo, monthKey, monthStart } from "@/lib/date";
import { computeMonthForecast } from "@/lib/forecast";
import { LinkButton } from "@/components/ui/Button";
import { BudgetSummaryCard } from "./BudgetSummaryCard";
import { MonthCalendar } from "./MonthCalendar";
import { DayDetail } from "./DayDetail";
import { UpcomingEvents } from "./UpcomingEvents";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function HomeScreen() {
  const { data, today } = useAppData();
  // 일정 추가 후 /?date=YYYY-MM-DD 로 돌아오면 그 날짜를 보여준다
  const dateParam = useSearchParams().get("date");
  const initialDate = dateParam && ISO_DATE.test(dateParam) ? dateParam : today;

  const [month, setMonth] = useState(() => monthKey(initialDate));
  const [selected, setSelected] = useState(initialDate);

  const forecast = useMemo(() => computeMonthForecast(data, month, today), [data, month, today]);

  function moveMonth(diff: number) {
    const next = addMonths(month, diff);
    setMonth(next);
    setSelected(next === monthKey(today) ? today : monthStart(next));
  }

  return (
    <div className="space-y-4 px-5 pt-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">
            <span className="font-bold text-primary">Planny</span>
            {data.userName !== "나" && ` · ${data.userName}님`}
          </p>
          <h1 className="text-2xl font-bold">{formatMonthKo(month)}</h1>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => moveMonth(-1)}
            className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
          >
            <ChevronLeft size={22} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => moveMonth(1)}
            className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
          >
            <ChevronRight size={22} aria-hidden />
          </button>
        </div>
      </header>

      <BudgetSummaryCard forecast={forecast} today={today} />
      <MonthCalendar data={data} month={month} today={today} selected={selected} onSelect={setSelected} />
      <DayDetail date={selected} />
      <UpcomingEvents />

      {/* 일정 추가 버튼: 하단 탭 위에 떠 있음 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-10 mx-auto flex w-full max-w-[440px] justify-end px-5 pb-[env(safe-area-inset-bottom)]">
        <LinkButton
          href={`/events/new?date=${selected}`}
          size="lg"
          className="pointer-events-auto rounded-full shadow-lg"
        >
          <Plus size={20} aria-hidden />
          일정 추가
        </LinkButton>
      </div>
    </div>
  );
}
