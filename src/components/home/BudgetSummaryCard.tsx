import type { ISODate, MonthForecast } from "@/lib/types";
import { monthKey } from "@/lib/date";
import { formatSignedWon, formatWon } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { StatusBadge, statusMessage } from "@/components/ui/StatusBadge";

/** 월말 예상 잔액 + 예산 구성 막대 */
export function BudgetSummaryCard({ forecast, today }: { forecast: MonthForecast; today: ISODate }) {
  const { month, budget, spent, routineProjected, eventsProjected, projectedBalance, status } = forecast;
  const currentMonth = monthKey(today);
  const m = Number(month.slice(5));
  const isPast = month < currentMonth;

  const label = isPast ? `${m}월 남은 예산` : month === currentMonth ? "이번 달 말 예상 잔액" : `${m}월 말 예상 잔액`;

  const parts = [
    { key: "spent", label: isPast ? "쓴 돈" : "지금까지 쓴 돈", amount: spent, color: "bg-primary" },
    { key: "routine", label: "남은 기간 예상 생활비", amount: routineProjected, color: "bg-series-3" },
    { key: "events", label: "예정된 일정", amount: eventsProjected, color: "bg-series-2" },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink-2">{label}</p>
        <StatusBadge status={status} />
      </div>
      <p className="mt-1 text-[40px] font-bold leading-tight tracking-tight">{formatSignedWon(projectedBalance)}</p>
      <p className="text-sm text-ink-2">{statusMessage(status, projectedBalance)}</p>

      <SegmentedBar parts={parts} budget={budget} />

      <ul className="mt-4 space-y-1.5 text-sm">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-ink-2">
              <span className={`size-2.5 rounded-full ${p.color}`} aria-hidden />
              {p.label}
            </span>
            <span className="font-medium tabular-nums">{formatWon(p.amount)}</span>
          </li>
        ))}
        <li className="flex items-center justify-between border-t border-line pt-1.5">
          <span className="text-ink-2">한 달 예산</span>
          <span className="font-medium tabular-nums">{formatWon(budget)}</span>
        </li>
      </ul>

      {status !== "safe" && !isPast && (
        <LinkButton href={`/simulate?month=${month}`} variant="secondary" full className="mt-4">
          조정 방법 보기
        </LinkButton>
      )}
    </Card>
  );
}

/** 예산 대비 [쓴 돈 | 남은 생활비 | 일정] 비율 막대. 예산을 넘으면 예산 위치에 선을 긋는다. */
function SegmentedBar({
  parts,
  budget,
}: {
  parts: { key: string; label: string; amount: number; color: string }[];
  budget: number;
}) {
  const total = parts.reduce((sum, p) => sum + p.amount, 0);
  const scale = Math.max(budget, total, 1);
  const budgetPos = (budget / scale) * 100;
  const description = [...parts.map((p) => `${p.label} ${formatWon(p.amount)}`), `예산 ${formatWon(budget)}`].join(", ");

  return (
    <div className="relative mt-4" role="img" aria-label={description}>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-2">
        {parts
          .filter((p) => p.amount > 0)
          .map((p) => (
            <div
              key={p.key}
              className={`h-full ${p.color}`}
              style={{ width: `${(p.amount / scale) * 100}%` }}
              title={`${p.label} ${formatWon(p.amount)}`}
            />
          ))}
      </div>
      {total > budget && (
        <div className="absolute -top-1.5 h-5 w-0.5 rounded-full bg-ink" style={{ left: `${budgetPos}%` }} aria-hidden />
      )}
    </div>
  );
}
