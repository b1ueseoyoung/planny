"use client";

import { IconArrowRight } from "@tabler/icons-react";
import type { EventPrediction } from "@/lib/types";
import { useAppData } from "@/lib/store";
import { monthKey } from "@/lib/date";
import { formatSignedWon, formatWon } from "@/lib/format";
import { computeMonthForecast } from "@/lib/forecast";
import { buildSuggestions } from "@/lib/suggestions";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatusBadge, statusMessage } from "@/components/ui/StatusBadge";

/** 이 일정을 추가하면 그 달 예상 잔액이 어떻게 바뀌는지 */
export function BudgetImpactCard({ prediction }: { prediction: EventPrediction }) {
  const { data, today } = useAppData();
  const month = monthKey(prediction.startDate);
  const before = computeMonthForecast(data, month, today);
  const after = computeMonthForecast(data, month, today, { extraEvent: prediction });
  const suggestions = buildSuggestions(after).slice(0, 3);

  return (
    <Card>
      <CardTitle right={<StatusBadge status={after.status} />}>{Number(month.slice(5))}월 예산에 미치는 영향</CardTitle>

      <div className="flex items-end gap-3">
        <div>
          <p className="text-xs text-muted">추가 전</p>
          <p className="text-base font-semibold text-ink-2 tabular-nums">{formatSignedWon(before.projectedBalance)}</p>
        </div>
        <IconArrowRight size={18} className="mb-1 text-muted" aria-hidden />
        <div>
          <p className="text-xs text-muted">추가 후 월말 예상 잔액</p>
          <p className="text-2xl font-bold tabular-nums">{formatSignedWon(after.projectedBalance)}</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-ink-2">{statusMessage(after.status, after.projectedBalance)}</p>

      {suggestions.length > 0 && (
        <div className="mt-4 rounded-2xl bg-surface-2 p-3">
          <p className="mb-1.5 text-xs font-semibold text-muted">이렇게 줄이면 맞출 수 있어요</p>
          <ul className="space-y-1 text-sm">
            {suggestions.map((s) => (
              <li key={s.category} className="flex justify-between gap-2">
                <span className="text-ink-2">{s.label}</span>
                <span className="shrink-0 font-medium tabular-nums">-{formatWon(s.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* TODO: 일정이 이미 지난 날짜면 '이미 지난 일정' 안내하기 */}
    </Card>
  );
}
