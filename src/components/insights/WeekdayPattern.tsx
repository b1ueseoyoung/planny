import type { InsightReport } from "@/lib/insights";
import { WEEKDAYS_KO } from "@/lib/date";
import { formatCompact, formatWon } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui/Card";

const BAR_MAX_PX = 96;

/** 요일별 하루 평균 지출 막대. 가장 많이 쓰는 요일만 진하게 + 금액 표시 */
export function WeekdayPattern({ report }: { report: InsightReport }) {
  const values = report.weekdayAverage;
  const max = Math.max(...values, 1);
  const peak = values.indexOf(Math.max(...values));
  const description = WEEKDAYS_KO.map((w, i) => `${w}요일 ${formatWon(values[i])}`).join(", ");

  return (
    <Card>
      <CardTitle>무슨 요일에 많이 쓸까</CardTitle>
      <p className="-mt-2 mb-4 text-xs text-muted">요일별 하루 평균</p>
      <div className="flex items-end gap-2" role="img" aria-label={`요일별 하루 평균 지출: ${description}`}>
        {values.map((value, i) => (
          <div key={WEEKDAYS_KO[i]} className="flex flex-1 flex-col items-center gap-1.5" title={`${WEEKDAYS_KO[i]}요일 하루 평균 ${formatWon(value)}`}>
            <span className={`text-[11px] tabular-nums ${i === peak ? "font-semibold text-ink" : "invisible"}`}>
              {formatCompact(value)}
            </span>
            <div
              className={`w-full max-w-9 rounded-t ${i === peak ? "bg-primary" : "bg-primary/35"}`}
              style={{ height: `${Math.max(4, (value / max) * BAR_MAX_PX)}px` }}
            />
            <span className="text-xs text-muted">{WEEKDAYS_KO[i]}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
