"use client";

import { addMonths, formatMonthKo } from "@/lib/date";
import type { MonthKey } from "@/lib/types";

/** 이번 달 / 다음 달 고르기 */
export function MonthToggle({
  options,
  value,
  thisMonth,
  onChange,
}: {
  options: MonthKey[];
  value: MonthKey;
  thisMonth: MonthKey;
  onChange: (month: MonthKey) => void;
}) {
  const nextMonth = addMonths(thisMonth, 1);
  const label = (m: MonthKey) => (m === thisMonth ? "이번 달" : m === nextMonth ? "다음 달" : formatMonthKo(m));

  return (
    <div role="group" aria-label="조정할 달" className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-surface-2 p-1">
      {options.map((m) => {
        const active = m === value;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(m)}
            className={`h-10 rounded-xl text-sm font-semibold transition ${
              active ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:text-ink"
            }`}
          >
            {label(m)} <span className="font-normal text-muted">{Number(m.slice(5))}월</span>
          </button>
        );
      })}
    </div>
  );
}
