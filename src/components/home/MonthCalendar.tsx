import { IconCheck } from "@tabler/icons-react";
import type { AppData, ISODate, MonthKey } from "@/lib/types";
import { dayOfWeek, daysInMonth, formatDateKo, monthEnd, monthStart, WEEKDAYS_KO } from "@/lib/date";
import { formatCompact } from "@/lib/format";
import { dailySpend, type DaySpend } from "@/lib/forecast";
import { DayDot, daySpendLabel } from "./DayDot";

interface Props {
  data: AppData;
  month: MonthKey;
  today: ISODate;
  selected: ISODate;
  onSelect: (date: ISODate) => void;
}

/** 점 히트맵 월간 달력: 날짜마다 점 하나, 고른 날엔 금액 툴팁 */
export function MonthCalendar({ data, month, today, selected, onSelect }: Props) {
  const days = dailySpend(data, monthStart(month), monthEnd(month), today);
  const dailyBudget = data.budget / daysInMonth(month);
  const offset = dayOfWeek(monthStart(month));

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted">
        {WEEKDAYS_KO.map((w, i) => (
          <div key={w} className={`pb-2 ${i === 0 ? "text-critical" : i === 6 ? "text-primary" : ""}`}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: offset }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day, i) => (
          <DayCell
            key={day.date}
            day={day}
            index={offset + i}
            dailyBudget={dailyBudget}
            isToday={day.date === today}
            isSelected={day.date === selected}
            onSelect={onSelect}
          />
        ))}
      </div>
      <Legend />
    </div>
  );
}

function DayCell({
  day,
  index,
  dailyBudget,
  isToday,
  isSelected,
  onSelect,
}: {
  day: DaySpend;
  /** 달력 격자에서의 위치 (툴팁 방향 정하기용) */
  index: number;
  dailyBudget: number;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (date: ISODate) => void;
}) {
  const isPast = day.kind === "actual" && !isToday;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onSelect(day.date)}
        aria-label={daySpendLabel(day)}
        aria-pressed={isSelected}
        className={`flex h-14 w-full flex-col items-center gap-1 rounded-2xl pt-1.5 ${
          isSelected ? "bg-surface-2 ring-1 ring-line" : "hover:bg-surface-2/60"
        }`}
      >
        <span
          className={`grid size-7 place-items-center rounded-full text-[13px] tabular-nums ${
            isToday ? "bg-primary font-bold text-white" : isPast ? "text-ink-2" : "text-ink"
          }`}
        >
          {Number(day.date.slice(8))}
        </span>
        <span className="flex h-4 items-center justify-center">
          <DayDot day={day} dailyBudget={dailyBudget} isToday={isToday} />
        </span>
      </button>
      {isSelected && <DayTooltip day={day} index={index} />}
    </div>
  );
}

/** 고른 날 위(첫 줄이면 아래)에 뜨는 금액 툴팁 */
function DayTooltip({ day, index }: { day: DaySpend; index: number }) {
  const col = index % 7;
  const vertical = index < 7 ? "top-full mt-1" : "bottom-full mb-1";
  const horizontal = col <= 1 ? "left-0" : col >= 5 ? "right-0" : "left-1/2 -translate-x-1/2";
  const [first, ...rest] = day.events;
  const money = day.amount > 0 ? `${day.kind === "actual" ? "쓴 돈" : "예상"} ${formatCompact(day.amount)}원` : "지출 없음";

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute z-10 w-max max-w-44 rounded-xl bg-ink px-3 py-2 text-xs text-page shadow-lg shadow-black/40 ${vertical} ${horizontal}`}
    >
      <p className="font-bold">
        {formatDateKo(day.date)} {money}
      </p>
      {first && (
        <p className="mt-0.5 truncate opacity-70">
          {first.title}
          {rest.length > 0 ? ` 외 ${rest.length}개` : ""}
        </p>
      )}
    </div>
  );
}

function Legend() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-line pt-3 text-[11px] text-ink-2">
      <li className="flex items-center gap-1.5">
        <span className="size-[9px] rounded-full bg-primary" aria-hidden />쓴 돈
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-[9px] rounded-full border-[1.5px] border-dashed border-primary bg-primary/15" aria-hidden />
        예상
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-[9px] rounded-full bg-series-2" aria-hidden />
        일정
      </li>
      <li className="flex items-center gap-1.5">
        <IconCheck size={11} stroke={3} className="text-good" aria-hidden />
        무지출
      </li>
      <li className="flex items-center gap-1.5">
        <span className="flex items-center gap-0.5" aria-hidden>
          <span className="size-[5px] rounded-full bg-muted" />
          <span className="size-[8px] rounded-full bg-muted" />
          <span className="size-[11px] rounded-full bg-muted" />
        </span>
        하루 예산 대비 크기
      </li>
    </ul>
  );
}
