import type { ReactNode } from "react";
import { IconChevronDown, IconChevronUp, IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import type { AppData, ISODate, MonthForecast } from "@/lib/types";
import { monthKey } from "@/lib/date";
import { formatCompact } from "@/lib/format";
import { dailyBudgetOf, type WeekSummary } from "@/lib/home-summary";
import { Card } from "@/components/ui/Card";
import { MonthCalendar } from "./MonthCalendar";
import { WeekStrip } from "./WeekStrip";

/** 홈 맨 위 카드: 접으면 이번 주(큰 숫자 + 주간 줄), 펼치면 그 달(큰 숫자 + 점 히트맵 달력) */
export function WeekHeroCard({
  data,
  today,
  week,
  forecast,
  selected,
  expanded,
  onSelect,
  onToggle,
}: {
  data: AppData;
  today: ISODate;
  week: WeekSummary;
  /** 펼쳤을 때 보여줄 달의 예측 */
  forecast: MonthForecast;
  selected: ISODate;
  expanded: boolean;
  onSelect: (date: ISODate) => void;
  onToggle: () => void;
}) {
  const diff = week.total - week.usual;
  const monthTotal = forecast.spent + forecast.routineProjected + forecast.eventsProjected;
  const m = Number(forecast.month.slice(5));
  const isPast = forecast.month < monthKey(today);

  return (
    <Card className="!p-4">
      {expanded ? (
        <BigAmount label={isPast ? `${m}월 쓴 돈` : `${m}월 예상 지출`} amount={monthTotal}>
          예산 {formatCompact(forecast.budget)}원의 {Math.round((monthTotal / forecast.budget) * 100)}%
        </BigAmount>
      ) : (
        <BigAmount label="이번 주 예상 지출" amount={week.total}>
          {diff > 0 ? (
            <IconTrendingUp size={16} className="text-series-2" aria-hidden />
          ) : (
            <IconTrendingDown size={16} className="text-good" aria-hidden />
          )}
          평소 한 주보다 {formatCompact(Math.abs(diff))}원 {diff > 0 ? "많아요" : "적어요"}
        </BigAmount>
      )}

      <div className="mt-4">
        {expanded ? (
          <MonthCalendar data={data} month={forecast.month} today={today} selected={selected} onSelect={onSelect} />
        ) : (
          <WeekStrip
            days={week.days}
            today={today}
            selected={selected}
            dailyBudget={dailyBudgetOf(data, today)}
            onSelect={onSelect}
          />
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="mx-auto mt-3 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-2"
      >
        {expanded ? "주간으로 접기" : "이번 달 전체 보기"}
        {expanded ? <IconChevronUp size={14} aria-hidden /> : <IconChevronDown size={14} aria-hidden />}
      </button>
    </Card>
  );
}

/** 큰 숫자 하나: "24.6" + "만원" */
function BigAmount({ label, amount, children }: { label: string; amount: number; children: ReactNode }) {
  const text = formatCompact(amount);
  const [num, unit] = text.endsWith("만") ? [text.slice(0, -1), "만원"] : [text, "원"];

  return (
    <div>
      <p className="text-xs font-medium text-ink-2">{label}</p>
      <p className="mt-1 flex items-baseline gap-0.5 font-bold tracking-tight">
        <span className="text-[44px] leading-none tabular-nums">{num}</span>
        <span className="text-xl">{unit}</span>
      </p>
      <p className="mt-2 flex items-center gap-1 text-sm text-ink-2">{children}</p>
    </div>
  );
}
