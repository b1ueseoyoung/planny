import type { InsightReport } from "@/lib/insights";
import { CATEGORY_LABEL } from "@/lib/categories";
import { formatWon } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui/Card";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

/** 자주 가는 곳 TOP 5 (교통·정기결제 제외) */
export function TopPlaces({ report }: { report: InsightReport }) {
  if (report.topMerchants.length === 0) return null;

  return (
    <Card>
      <CardTitle>자주 가는 곳</CardTitle>
      <ol className="space-y-2.5">
        {report.topMerchants.map((m, i) => (
          <li key={m.merchant} className="flex items-center gap-3">
            <span className="w-4 shrink-0 text-center text-sm font-semibold text-muted">{i + 1}</span>
            <CategoryIcon category={m.category} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.merchant}</p>
              <p className="text-xs text-muted">
                {m.count}번 · {CATEGORY_LABEL[m.category]}
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium tabular-nums">{formatWon(m.amount)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
