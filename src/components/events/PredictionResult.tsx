import { MapPin, Sparkles } from "lucide-react";
import type { PredictResponse } from "@/lib/types";
import { formatRangeKo } from "@/lib/date";
import { formatWon } from "@/lib/format";
import { predictionTotal } from "@/lib/forecast";
import { tangibleLabel } from "@/lib/home-summary";
import { CATEGORY_LABEL, EVENT_TYPE_LABEL } from "@/lib/categories";
import { Card } from "@/components/ui/Card";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

/** AI(또는 목업)가 예측한 항목별 지출, 근거, 아끼는 방법 */
export function PredictionResult({ response }: { response: PredictResponse }) {
  const { prediction: p, source, notice } = response;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-2">{EVENT_TYPE_LABEL[p.eventType]}</span>
        {p.location && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-2 py-0.5 text-ink-2">
            <MapPin size={12} aria-hidden />
            {p.location}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-ai/15 px-2 py-0.5 font-semibold text-ai">
          <Sparkles size={12} aria-hidden />
          {source === "ai" ? "AI 예측" : "목업 예측"}
        </span>
      </div>

      <h2 className="mt-2 text-lg font-bold">{p.title}</h2>
      <p className="text-sm text-muted">{formatRangeKo(p.startDate, p.endDate)}</p>
      {notice && <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-2">{notice}</p>}

      <ul className="mt-4 space-y-2.5">
        {p.items.map((item, i) => (
          <li key={i} className="flex items-center gap-3">
            <CategoryIcon category={item.category} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted">{CATEGORY_LABEL[item.category]}</p>
            </div>
            <span className="text-sm font-medium tabular-nums">{formatWon(item.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="font-semibold">총 예상 비용</span>
        <span className="text-xl font-bold tabular-nums">{formatWon(predictionTotal(p))}</span>
      </div>

      {p.reasons.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold text-muted">이렇게 예측했어요</p>
          <ul className="list-disc space-y-1 pl-4 text-sm text-ink-2">
            {p.reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {p.savingTips.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold text-muted">아낄 수 있는 방법</p>
          <ul className="space-y-1 text-sm">
            {p.savingTips.map((tip, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="text-ink-2">
                  {tip.label} <span className="text-xs font-semibold text-flame">{tangibleLabel(tip.amount)} 값</span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">-{formatWon(tip.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* TODO: 비슷한 지난 일정 카드로 보여주기 (실제로 얼마 썼는지) */}
    </Card>
  );
}
