import type { ISODate } from "@/lib/types";
import type { DaySpend } from "@/lib/forecast";
import { WEEKDAYS_KO } from "@/lib/date";
import { DayDot, daySpendLabel } from "./DayDot";

/** 이번 주 7일 줄: 요일, 날짜, 점. 오늘은 파란 알약, 고른 날은 테두리 */
export function WeekStrip({
  days,
  today,
  selected,
  dailyBudget,
  onSelect,
}: {
  /** 일요일부터 7일 */
  days: DaySpend[];
  today: ISODate;
  selected: ISODate;
  dailyBudget: number;
  onSelect: (date: ISODate) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day, i) => {
        const isToday = day.date === today;
        const isSelected = day.date === selected;
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelect(day.date)}
            aria-label={daySpendLabel(day)}
            aria-pressed={isSelected}
            className={`flex flex-col items-center gap-1.5 rounded-2xl py-2.5 ${
              isToday
                ? "bg-primary text-white"
                : isSelected
                  ? "bg-surface-2 ring-1 ring-line"
                  : "hover:bg-surface-2/60"
            }`}
          >
            <span
              className={`text-[11px] ${
                isToday ? "text-white/80" : i === 0 ? "text-critical" : i === 6 ? "text-primary" : "text-muted"
              }`}
            >
              {WEEKDAYS_KO[i]}
            </span>
            <span className="text-[15px] font-semibold tabular-nums">{Number(day.date.slice(8))}</span>
            <span className="flex h-4 items-center">
              <DayDot day={day} dailyBudget={dailyBudget} isToday={isToday} onAccent={isToday} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
