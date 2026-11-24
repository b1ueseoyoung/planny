import type { InsightReport } from "@/lib/insights";
import { CATEGORY_LABEL } from "@/lib/categories";
import { formatCompact, formatWon } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui/Card";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

const VISIBLE = 6;

/** 카테고리별 지출 막대 (많이 쓴 순, 나머지는 한 줄로 묶음) */
export function CategoryBreakdown({ report }: { report: InsightReport }) {
  const rows = report.byCategory.slice(0, VISIBLE);
  const rest = report.byCategory.slice(VISIBLE);
  const max = rows[0]?.amount || 1;

  return (
    <Card>
      <CardTitle>어디에 썼을까</CardTitle>
      <ul className="space-y-3.5">
        {rows.map((c) => {
          const label = CATEGORY_LABEL[c.category];
          const percent = Math.round(c.share * 100);
          const change = c.amount - c.previous;
          return (
            <li key={c.category} className="flex items-center gap-3">
              <CategoryIcon category={c.category} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{label}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{formatWon(c.amount)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
                    role="img"
                    aria-label={`${label} ${formatWon(c.amount)}, 전체의 ${percent}%`}
                  >
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(c.amount / max) * 100}%` }} />
                  </div>
                  <span className="w-9 shrink-0 text-right text-xs text-muted tabular-nums">{percent}%</span>
                </div>
                {c.previous > 0 && Math.abs(change) >= 1_000 && (
                  <p className="mt-1 text-xs text-muted">
                    이전 {report.days}일보다 {change > 0 ? "+" : "-"}
                    {formatCompact(Math.abs(change))}원
                  </p>
                )}
              </div>
            </li>
          );
        })}
        {rest.length > 0 && (
          <li className="flex justify-between border-t border-line pt-3 text-sm text-ink-2">
            <span>나머지 {rest.length}개</span>
            <span className="tabular-nums">{formatWon(rest.reduce((s, c) => s + c.amount, 0))}</span>
          </li>
        )}
      </ul>
    </Card>
  );
}
