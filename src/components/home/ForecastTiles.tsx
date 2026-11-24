import Link from "next/link";
import { IconArrowUpRight, IconFlame } from "@tabler/icons-react";
import type { AppData, ISODate, MonthForecast } from "@/lib/types";
import { monthEnd, monthKey, monthStart } from "@/lib/date";
import { formatCompact, formatSignedWon } from "@/lib/format";
import { dailySpend } from "@/lib/forecast";
import { budgetStreak } from "@/lib/home-summary";
import { StatusBadge, statusMessage } from "@/components/ui/StatusBadge";

const TILE = "rounded-3xl bg-surface p-4 ring-1 ring-line";

/** 예측 타일 묶음: 월말 예상 잔액(누적 그래프), 예산 초과 위험, 하루 예산 연속 기록 */
export function ForecastTiles({ data, today, forecast }: { data: AppData; today: ISODate; forecast: MonthForecast }) {
  const isPast = forecast.month < monthKey(today);

  return (
    <section aria-label="예산 예측" className="grid grid-cols-2 gap-3">
      <BalanceTile data={data} today={today} forecast={forecast} isPast={isPast} />
      <RiskTile forecast={forecast} isPast={isPast} />
      <StreakTile data={data} today={today} />
    </section>
  );
}

function BalanceTile({
  data,
  today,
  forecast,
  isPast,
}: {
  data: AppData;
  today: ISODate;
  forecast: MonthForecast;
  isPast: boolean;
}) {
  const { month, projectedBalance, status } = forecast;
  const m = Number(month.slice(5));

  return (
    <div className={`${TILE} col-span-2`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-2">{isPast ? `${m}월 남은 예산` : `${m}월 말 예상 잔액`}</p>
        <StatusBadge status={status} />
      </div>
      <p className="mt-1 text-[32px] font-bold leading-tight tracking-tight tabular-nums">
        {formatSignedWon(projectedBalance)}
      </p>
      <p className="text-sm text-ink-2">{statusMessage(status, projectedBalance)}</p>
      <ForecastChart data={data} today={today} forecast={forecast} />
      <p className="mt-1 text-[11px] text-muted">실선은 쓴 돈, 점선은 예상이에요. 가로 점선은 예산이에요.</p>
    </div>
  );
}

const W = 320;
const H = 120;
const TOP = 18;
const BOTTOM = 16;

/** 그 달 누적 지출 그래프 */
function ForecastChart({ data, today, forecast }: { data: AppData; today: ISODate; forecast: MonthForecast }) {
  const { month, budget } = forecast;
  const days = dailySpend(data, monthStart(month), monthEnd(month), today);
  const cumulative = [0];
  for (const d of days) cumulative.push(cumulative[cumulative.length - 1] + d.amount);

  const n = days.length;
  const actualCount = days.filter((d) => d.kind === "actual").length;
  const total = cumulative[n];
  const max = Math.max(budget, total, 1) * 1.1;
  const x = (i: number) => (i / n) * (W - 8);
  const y = (v: number) => TOP + (1 - v / max) * (H - TOP - BOTTOM);
  const path = (from: number, to: number) =>
    cumulative
      .slice(from, to + 1)
      .map((v, k) => `${k === 0 ? "M" : "L"}${x(from + k).toFixed(1)},${y(v).toFixed(1)}`)
      .join(" ");

  const actualPath = actualCount > 0 ? path(0, actualCount) : "";
  const predictedPath = actualCount < n ? path(actualCount, n) : "";
  const budgetY = y(budget);
  const endY = y(total);
  const labelsClash = Math.abs(endY - budgetY) < 16;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 w-full overflow-visible"
      role="img"
      aria-label={`누적 지출 ${formatCompact(total)}원 예상, 예산 ${formatCompact(budget)}원`}
    >
      <line x1={0} x2={W} y1={budgetY} y2={budgetY} stroke="var(--muted)" strokeDasharray="2 4" />
      <text
        x={labelsClash ? 0 : W}
        y={budgetY - 6}
        textAnchor={labelsClash ? "start" : "end"}
        fontSize={10}
        fill="var(--muted)"
      >
        예산 {formatCompact(budget)}
      </text>
      {actualPath && (
        <>
          <path d={`${actualPath} L${x(actualCount)},${y(0)} L0,${y(0)} Z`} fill="var(--primary)" opacity={0.14} />
          <path d={actualPath} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}
      {predictedPath && (
        <path d={predictedPath} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeDasharray="5 5" strokeLinecap="round" />
      )}
      {actualCount > 0 && actualCount < n && (
        <>
          <circle cx={x(actualCount)} cy={y(cumulative[actualCount])} r={4} fill="var(--surface)" stroke="var(--primary)" strokeWidth={2} />
          <text x={x(actualCount)} y={H - 2} textAnchor="middle" fontSize={10} fill="var(--muted)">
            오늘
          </text>
        </>
      )}
      <circle cx={x(n)} cy={endY} r={4.5} fill={total > budget ? "var(--critical)" : "var(--primary)"} />
      <text x={x(n) - 9} y={endY + (endY < TOP + 10 ? 16 : -9)} textAnchor="end" fontSize={11} fontWeight={700} fill="var(--ink)">
        {formatCompact(total)}
      </text>
    </svg>
  );
}

const RISK = {
  safe: { label: "낮음", steps: 1, bar: "bg-good" },
  tight: { label: "보통", steps: 2, bar: "bg-warning" },
  over: { label: "높음", steps: 3, bar: "bg-critical" },
} as const;

/** 예산 초과 위험: 3칸 막대 + 글자 (색만으로 구분하지 않음) */
function RiskTile({ forecast, isPast }: { forecast: MonthForecast; isPast: boolean }) {
  const { label, steps, bar } = RISK[forecast.status];

  return (
    <div className={TILE}>
      <p className="text-xs font-medium text-ink-2">예산 초과 위험</p>
      <p className="mt-2 text-2xl font-bold">{label}</p>
      <div className="mt-3 flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-2 flex-1 rounded-full ${i < steps ? bar : "bg-surface-2"}`} />
        ))}
      </div>
      {forecast.status !== "safe" && !isPast ? (
        <Link
          href={`/simulate?month=${forecast.month}`}
          className="mt-3 inline-flex items-center gap-0.5 text-xs font-semibold text-ink"
        >
          조정해 보기
          <IconArrowUpRight size={13} aria-hidden />
        </Link>
      ) : (
        <p className="mt-3 text-xs text-muted">{isPast ? "지난 달이에요" : "이대로면 괜찮아요"}</p>
      )}
    </div>
  );
}

/** 하루 예산 지킨 날 연속 기록 */
function StreakTile({ data, today }: { data: AppData; today: ISODate }) {
  const { streak, kept, passed, recent } = budgetStreak(data, today);

  return (
    <div className="rounded-3xl bg-flame p-4 text-on-accent">
      <p className="flex items-center gap-1 text-xs font-semibold opacity-75">
        <IconFlame size={14} aria-hidden />
        하루 예산 지킨 날
      </p>
      <p className="mt-2 text-2xl font-bold">{streak > 0 ? `연속 ${streak}일` : "오늘부터 다시"}</p>
      <div className="mt-3 flex gap-1" role="img" aria-label={`최근 7일 중 ${recent.filter(Boolean).length}일 지킴`}>
        {recent.map((ok, i) => (
          <span key={i} className={`h-2 flex-1 rounded-full ${ok ? "bg-on-accent" : "bg-on-accent/20"}`} />
        ))}
      </div>
      <p className="mt-3 text-xs font-medium opacity-75">
        이번 달 {passed}일 중 {kept}일
      </p>
    </div>
  );
}
