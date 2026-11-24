import type { AppData, CalendarEvent, ISODate, MonthKey } from "@/lib/types";
import { addDays, dayOfWeek, daysInMonth, formatDateKo, monthEnd, monthStart, WEEKDAYS_KO } from "@/lib/date";
import { formatCompact } from "@/lib/format";
import { spendingByDay } from "@/lib/forecast";
import { Card } from "@/components/ui/Card";

interface Props {
  data: AppData;
  month: MonthKey;
  today: ISODate;
  selected: ISODate;
  onSelect: (date: ISODate) => void;
}

/** 월간 달력: 지난 날은 쓴 돈, 일정이 있는 날은 일정 이름을 보여준다 */
export function MonthCalendar({ data, month, today, selected, onSelect }: Props) {
  const spending = spendingByDay(data, month);
  const eventsByDay = groupEventsByDay(data.events, month);

  const cells: (ISODate | null)[] = Array(dayOfWeek(monthStart(month))).fill(null);
  for (let d = 1; d <= daysInMonth(month); d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);

  return (
    <Card className="!p-3">
      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted">
        {WEEKDAYS_KO.map((w, i) => (
          <div key={w} className={`py-2 ${i === 0 ? "text-critical" : i === 6 ? "text-primary" : ""}`}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) =>
          date ? (
            <DayCell
              key={date}
              date={date}
              isToday={date === today}
              isSelected={date === selected}
              spent={date <= today ? spending[date] ?? 0 : 0}
              events={eventsByDay[date] ?? []}
              onSelect={onSelect}
            />
          ) : (
            <div key={`blank-${i}`} />
          ),
        )}
      </div>
    </Card>
  );
}

function DayCell({
  date,
  isToday,
  isSelected,
  spent,
  events,
  onSelect,
}: {
  date: ISODate;
  isToday: boolean;
  isSelected: boolean;
  spent: number;
  events: CalendarEvent[];
  onSelect: (date: ISODate) => void;
}) {
  const day = Number(date.slice(8));
  const label = [formatDateKo(date), spent > 0 && `지출 ${formatCompact(spent)}원`, events.length > 0 && `일정 ${events.length}개`]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      aria-label={label}
      aria-pressed={isSelected}
      className={`flex min-h-16 flex-col items-center gap-0.5 rounded-xl px-0.5 pb-1 pt-1 ${
        isSelected ? "bg-surface-2" : "hover:bg-surface-2/60"
      }`}
    >
      <span
        className={`grid size-7 place-items-center rounded-full text-sm ${
          isToday ? "bg-primary font-semibold text-white" : "text-ink"
        }`}
      >
        {day}
      </span>
      {spent > 0 && <span className="text-[10px] leading-3 text-muted tabular-nums">{formatCompact(spent)}</span>}
      {events.slice(0, 2).map((e) => (
        <span key={e.id} className="w-full truncate rounded-md bg-series-2/15 px-1 text-[10px] leading-4 text-ink">
          {e.title}
        </span>
      ))}
      {events.length > 2 && <span className="text-[10px] leading-3 text-muted">+{events.length - 2}</span>}
    </button>
  );
}

/** 여러 날 일정은 걸친 모든 날짜에 표시 */
function groupEventsByDay(events: CalendarEvent[], month: MonthKey): Record<ISODate, CalendarEvent[]> {
  const start = monthStart(month);
  const end = monthEnd(month);
  const result: Record<ISODate, CalendarEvent[]> = {};
  for (const e of events) {
    if (e.endDate < start || e.startDate > end) continue;
    for (let d = e.startDate < start ? start : e.startDate; d <= e.endDate && d <= end; d = addDays(d, 1)) {
      (result[d] ??= []).push(e);
    }
  }
  return result;
}
