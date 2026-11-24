import { Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import type { InsightReport } from "@/lib/insights";
import { formatCompact, formatWon } from "@/lib/format";
import { Card } from "@/components/ui/Card";

/** 최근 N일 총지출, 이전 기간 대비 변화, 눈에 띄는 점 */
export function SummaryCard({ report }: { report: InsightReport }) {
  const diff = report.total - report.previousTotal;
  const more = diff > 0;

  return (
    <Card>
      <p className="text-sm font-medium text-ink-2">최근 {report.days}일 쓴 돈</p>
      <p className="mt-1 text-[40px] font-bold leading-tight tracking-tight">{formatWon(report.total)}</p>

      {report.previousTotal > 0 && diff !== 0 && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
          {more ? (
            <TrendingUp size={16} className="text-critical" aria-hidden />
          ) : (
            <TrendingDown size={16} className="text-good" aria-hidden />
          )}
          이전 {report.days}일보다 {formatCompact(Math.abs(diff))}원 {more ? "더 썼어요" : "덜 썼어요"}
        </p>
      )}

      {report.highlights.length > 0 && (
        <ul className="mt-4 space-y-2">
          {report.highlights.map((line) => (
            <li key={line} className="flex gap-2 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm">
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
