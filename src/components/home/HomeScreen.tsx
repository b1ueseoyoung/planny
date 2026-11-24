"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react";
import { useAppData } from "@/lib/store";
import { addMonths, formatMonthKo, monthKey, monthStart } from "@/lib/date";
import { computeMonthForecast } from "@/lib/forecast";
import { weekLabelKo, weekRange, weekSummary } from "@/lib/home-summary";
import { LinkButton } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { WeekHeroCard } from "./WeekHeroCard";
import { DayDetail } from "./DayDetail";
import { ForecastTiles } from "./ForecastTiles";
import { AiInsightCard } from "./AiInsightCard";
import { UpcomingEvents } from "./UpcomingEvents";
import { CategoryCards } from "./CategoryCards";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function HomeScreen() {
  const { data, today } = useAppData();
  // 일정 추가 후 /?date=YYYY-MM-DD 로 돌아오면 그 날짜를 보여준다 (이번 주가 아니면 달력을 펼친 채로)
  const dateParam = useSearchParams().get("date");
  const initialDate = dateParam && ISO_DATE.test(dateParam) ? dateParam : today;
  const thisWeek = weekRange(today);

  const [expanded, setExpanded] = useState(initialDate < thisWeek.start || initialDate > thisWeek.end);
  const [month, setMonth] = useState(() => monthKey(initialDate));
  const [selected, setSelected] = useState(initialDate);

  const forecast = useMemo(() => computeMonthForecast(data, month, today), [data, month, today]);
  const week = useMemo(() => weekSummary(data, today), [data, today]);

  function moveMonth(diff: number) {
    const next = addMonths(month, diff);
    setMonth(next);
    setSelected(next === monthKey(today) ? today : monthStart(next));
  }

  /** 접으면 이번 주로 돌아온다 */
  function toggle() {
    if (expanded) {
      setMonth(monthKey(today));
      if (selected < thisWeek.start || selected > thisWeek.end) setSelected(today);
    }
    setExpanded(!expanded);
  }

  return (
    <div className="space-y-4 px-5 pt-5">
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted">
            <span className="font-bold text-primary">Planny</span>
            {data.userName !== "나" && ` · ${data.userName}님`}
          </p>
          <h1 className="text-2xl font-bold">{expanded ? formatMonthKo(month) : weekLabelKo(today)}</h1>
        </div>
        {expanded ? (
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => moveMonth(-1)}
              className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
            >
              <IconChevronLeft size={22} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="다음 달"
              onClick={() => moveMonth(1)}
              className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
            >
              <IconChevronRight size={22} aria-hidden />
            </button>
          </div>
        ) : (
          <StatusBadge status={forecast.status} />
        )}
      </header>

      <WeekHeroCard
        data={data}
        today={today}
        week={week}
        forecast={forecast}
        selected={selected}
        expanded={expanded}
        onSelect={setSelected}
        onToggle={toggle}
      />
      <DayDetail date={selected} />
      <ForecastTiles data={data} today={today} forecast={forecast} />
      <AiInsightCard data={data} today={today} week={week} forecast={forecast} />
      <UpcomingEvents />
      <CategoryCards data={data} today={today} forecast={forecast} />

      {/* 일정 추가 버튼: 하단 탭 위에 떠 있음 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-10 mx-auto flex w-full max-w-[440px] justify-end px-5 pb-[env(safe-area-inset-bottom)]">
        <LinkButton
          href={`/events/new?date=${selected}`}
          size="lg"
          className="pointer-events-auto rounded-full shadow-lg shadow-black/40"
        >
          <IconPlus size={20} aria-hidden />
          일정 추가
        </LinkButton>
      </div>
    </div>
  );
}
