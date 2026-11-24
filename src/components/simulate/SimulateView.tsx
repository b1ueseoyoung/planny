"use client";

// 조정 화면 본체. 이번 달/다음 달을 골라 카테고리별로 줄여 보고, 월말 잔액 변화를 바로 보여준다.
// TODO: 조정값을 '이번 달 목표'로 저장해서 홈 화면 예측에도 반영하기
// TODO: 일정 자체를 바꿔 보는 시뮬레이션 (예: 여행 숙소 바꾸기 → prediction.savingTips 활용)
// TODO: 카테고리별 실천 팁 보여주기 (예: 배달 대신 장보기)

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lightbulb, PiggyBank, RotateCcw } from "lucide-react";
import { useAppData } from "@/lib/store";
import { addMonths, monthKey } from "@/lib/date";
import { computeMonthForecast } from "@/lib/forecast";
import { buildSuggestions } from "@/lib/suggestions";
import { ADJUSTABLE_CATEGORIES } from "@/lib/categories";
import type { Adjustments, Category, MonthKey, Suggestion } from "@/lib/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MonthToggle } from "./MonthToggle";
import { BalanceCompareCard } from "./BalanceCompareCard";
import { SuggestionChips } from "./SuggestionChips";
import { CategorySlider } from "./CategorySlider";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 주소의 ?month=YYYY-MM 을 읽어서 시뮬레이터를 연다. 주소의 달이 바뀌면 처음부터 다시 그린다. */
export function SimulateView() {
  const searchParams = useSearchParams();
  const param = searchParams.get("month");
  const initialMonth = param && MONTH_PATTERN.test(param) ? param : null;
  return <Simulator key={initialMonth ?? "default"} initialMonth={initialMonth} />;
}

function Simulator({ initialMonth }: { initialMonth: MonthKey | null }) {
  const { data, today } = useAppData();
  const thisMonth = monthKey(today);
  const nextMonth = addMonths(thisMonth, 1);

  const [month, setMonth] = useState<MonthKey>(initialMonth ?? thisMonth);
  const [adjustments, setAdjustments] = useState<Adjustments>({});

  const base = useMemo(() => computeMonthForecast(data, month, today), [data, month, today]);
  const simulated = useMemo(
    () => computeMonthForecast(data, month, today, { adjustments }),
    [data, month, today, adjustments],
  );
  const suggestions = useMemo(() => buildSuggestions(base), [base]);

  const categories = ADJUSTABLE_CATEGORIES.filter((c) => (base.routineByCategory[c] ?? 0) > 0);
  const hasAdjustments = Object.values(adjustments).some((ratio) => (ratio ?? 0) > 0);
  const isPast = month < thisMonth;
  const monthOptions = [thisMonth, nextMonth].includes(month) ? [thisMonth, nextMonth] : [thisMonth, nextMonth, month];

  function changeMonth(next: MonthKey) {
    setMonth(next);
    setAdjustments({}); // 달이 바뀌면 조정값도 처음부터
  }

  function setRatio(category: Category, ratio: number) {
    setAdjustments((prev) => ({ ...prev, [category]: ratio }));
  }

  function applyAll(list: Suggestion[]) {
    setAdjustments((prev) => {
      const next = { ...prev };
      for (const s of list) next[s.category] = s.ratio;
      return next;
    });
  }

  return (
    <div className="space-y-4 px-5">
      <MonthToggle options={monthOptions} value={month} thisMonth={thisMonth} onChange={changeMonth} />
      <BalanceCompareCard month={month} base={base} simulated={simulated} />

      {isPast ? (
        <Card>
          <p className="text-[15px] font-semibold text-ink">지난 달은 이미 끝나서 조정할 수 없어요</p>
          <p className="mt-1 text-sm text-ink-2">이번 달이나 다음 달을 골라 보세요.</p>
          <Button variant="secondary" className="mt-4" onClick={() => changeMonth(thisMonth)}>
            이번 달 보기
          </Button>
        </Card>
      ) : categories.length === 0 ? (
        <Card className="text-center">
          <PiggyBank size={32} className="mx-auto text-ink-2" aria-hidden />
          <p className="mt-2 text-[15px] font-semibold text-ink">아직 줄여 볼 생활비 기록이 없어요</p>
          <p className="mt-1 text-sm text-ink-2">소비 내역이 쌓이면 항목별로 줄여 볼 수 있어요.</p>
        </Card>
      ) : (
        <>
          {suggestions.length > 0 ? (
            <SuggestionChips
              suggestions={suggestions}
              adjustments={adjustments}
              onPick={(s) => setRatio(s.category, s.ratio)}
              onApplyAll={() => applyAll(suggestions)}
            />
          ) : (
            base.status === "safe" && (
              <Card className="flex gap-3">
                <Lightbulb size={20} className="mt-0.5 shrink-0 text-ink-2" aria-hidden />
                <p className="text-sm text-ink-2">
                  이 달은 예산 안이라 꼭 줄이지 않아도 괜찮아요. 더 모으고 싶다면 아래에서 줄여 보세요.
                </p>
              </Card>
            )
          )}

          <Card>
            <CardTitle
              right={
                <Button variant="ghost" onClick={() => setAdjustments({})} disabled={!hasAdjustments}>
                  <RotateCcw size={16} aria-hidden />
                  초기화
                </Button>
              }
            >
              항목별로 줄여 보기
            </CardTitle>
            <ul className="space-y-6">
              {categories.map((category) => (
                <CategorySlider
                  key={category}
                  category={category}
                  base={base.routineByCategory[category] ?? 0}
                  ratio={adjustments[category] ?? 0}
                  periodLabel={month === thisMonth ? "남은 기간 예상" : "한 달 예상"}
                  onChange={(ratio) => setRatio(category, ratio)}
                />
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
