import type { MonthForecast, MonthKey } from "@/lib/types";
import { formatSignedWon, formatWon } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { StatusBadge, statusMessage } from "@/components/ui/StatusBadge";

/** 지금 예상 잔액과 조정했을 때의 잔액을 위아래로 비교 */
export function BalanceCompareCard({
  month,
  base,
  simulated,
}: {
  month: MonthKey;
  base: MonthForecast;
  simulated: MonthForecast;
}) {
  const saving = simulated.projectedBalance - base.projectedBalance;

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink-2">{Number(month.slice(5))}월 예상 잔액</p>
        <StatusBadge status={base.status} />
      </div>
      <p className="mt-1 text-4xl font-bold tracking-tight text-ink">{formatSignedWon(base.projectedBalance)}</p>
      <p className="mt-1 text-sm text-ink-2">{statusMessage(base.status, base.projectedBalance)}</p>

      <div className="mt-4 border-t border-line pt-4" aria-live="polite">
        {saving > 0 ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink-2">조정하면</p>
              <StatusBadge status={simulated.status} />
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-ink">
              {formatSignedWon(simulated.projectedBalance)}
            </p>
            <p className="mt-1 text-sm text-ink-2">
              <span className="font-semibold text-ink">{formatWon(saving)}</span> 아낄 수 있어요
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">아래에서 줄여 볼 항목을 골라 보세요. 결과가 바로 여기에 나와요.</p>
        )}
      </div>
    </Card>
  );
}
