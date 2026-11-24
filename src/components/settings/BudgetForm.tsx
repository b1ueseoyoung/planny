"use client";

// TODO: 달마다 다른 예산 설정하기 (예: 여행 가는 달만 늘리기)

import { useState } from "react";
import { useAppData } from "@/lib/store";
import { formatWon } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui/Card";

const PRESETS = [1_000_000, 1_200_000, 1_500_000];

/** 한 달 생활비 예산 입력. 숫자가 바뀔 때마다 바로 저장된다. */
export function BudgetForm() {
  const { data, setBudget } = useAppData();
  const [draft, setDraft] = useState(String(data.budget));

  function update(raw: string) {
    const digits = raw.replace(/[^\d]/g, "");
    setDraft(digits);
    if (digits) setBudget(Number(digits));
  }

  return (
    <Card>
      <CardTitle>한 달 생활비 예산</CardTitle>
      <label htmlFor="monthly-budget" className="sr-only">
        한 달 생활비 예산 (원)
      </label>
      <div className="flex items-center gap-2 rounded-2xl bg-surface-2 px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-primary">
        <input
          id="monthly-budget"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          onChange={(e) => update(e.target.value)}
          placeholder="1200000"
          className="h-12 min-w-0 flex-1 bg-transparent text-lg font-semibold text-ink outline-none placeholder:text-muted"
        />
        <span className="text-sm font-medium text-ink-2">원</span>
      </div>
      <p className="mt-2 text-sm text-ink-2" aria-live="polite">
        {draft ? formatWon(Number(draft)) : "금액을 입력해 주세요"}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {PRESETS.map((amount) => {
          const active = data.budget === amount;
          return (
            <button
              key={amount}
              type="button"
              aria-pressed={active}
              onClick={() => update(String(amount))}
              className={`h-10 rounded-xl text-sm font-semibold ring-1 transition ${
                active ? "bg-primary text-white ring-primary" : "bg-surface-2 text-ink ring-line hover:brightness-95"
              }`}
            >
              {amount / 10_000}만
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">월세·저축처럼 월급날 미리 빠지는 돈을 뺀, 한 달 동안 쓸 수 있는 돈을 넣어 주세요.</p>
    </Card>
  );
}
