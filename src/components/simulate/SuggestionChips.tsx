"use client";

import type { Adjustments, Suggestion } from "@/lib/types";
import { formatCompact } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/** buildSuggestions가 만든 추천. 누르면 해당 카테고리 슬라이더가 그 비율로 맞춰진다. */
export function SuggestionChips({
  suggestions,
  adjustments,
  onPick,
  onApplyAll,
}: {
  suggestions: Suggestion[];
  adjustments: Adjustments;
  onPick: (suggestion: Suggestion) => void;
  onApplyAll: () => void;
}) {
  return (
    <Card>
      <CardTitle
        right={
          suggestions.length > 1 ? (
            <Button variant="ghost" onClick={onApplyAll}>
              모두 적용
            </Button>
          ) : undefined
        }
      >
        이렇게 줄여 보면 어때요?
      </CardTitle>
      <ul className="flex flex-wrap gap-2">
        {suggestions.map((s) => {
          const active = Math.abs((adjustments[s.category] ?? 0) - s.ratio) < 0.001;
          return (
            <li key={s.category}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onPick(s)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition ${
                  active ? "bg-primary text-white ring-primary" : "bg-surface-2 text-ink ring-line hover:brightness-95"
                }`}
              >
                {s.label} <span className={active ? "text-white/80" : "text-ink-2"}>−{formatCompact(s.amount)}원</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">누르면 아래 슬라이더가 그 비율로 맞춰져요.</p>
    </Card>
  );
}
