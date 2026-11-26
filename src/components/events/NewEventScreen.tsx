"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconLoader2, IconSparkles } from "@tabler/icons-react";
import type { PredictResponse } from "@/lib/types";
import { useAppData } from "@/lib/store";
import { fetchPrediction } from "@/lib/api";
import { buildHistorySummary } from "@/lib/history";
import { formatDateKo } from "@/lib/date";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { PredictionResult, isDateRangeValid } from "./PredictionResult";
import { BudgetImpactCard } from "./BudgetImpactCard";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const EXAMPLES = ["이번 주 토요일 성수동 친구 모임", "다음 달 5일부터 부산 2박 3일 여행", "금요일 저녁 회사 회식"];

type Step = "input" | "loading" | "result";

export function NewEventScreen() {
  const { data, today, addEvent } = useAppData();
  const router = useRouter();
  const dateParam = useSearchParams().get("date");

  const [text, setText] = useState("");
  // 날짜칸을 직접 바꾸기 전까지는 주소의 ?date=를 따른다.
  // 화면이 살아 있는 채로 다른 날에서 '일정 추가'를 눌러 들어와도 그 날짜가 보이게 한다.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [lastDateParam, setLastDateParam] = useState(dateParam);
  if (dateParam !== lastDateParam) {
    setLastDateParam(dateParam);
    setPickedDate(null);
    // 저장하지 않은 결과는 이전 날짜로 만든 예측이라 버리고 입력 단계로 돌아간다 (입력한 문장은 둔다)
    if (step === "result") {
      setStep("input");
      setResult(null);
    }
  }
  const date = pickedDate ?? (dateParam && ISO_DATE.test(dateParam) ? dateParam : today);
  /** 저장하고 떠나는 중인지. 두 번 눌러도 한 번만 저장하고, 화면이 숨겨질 때 비우는 데 쓴다 */
  const savedRef = useRef(false);

  // Next 16(cacheComponents)은 떠난 화면을 지우지 않고 <Activity>로 숨겨서 state가 그대로 남는다.
  // 저장하고 떠났으면 숨겨질 때 비워서, 다음에 들어오면 빈 화면에서 시작하게 한다 (저장 안 한 초안은 둔다).
  // 참고: node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md
  useLayoutEffect(() => {
    return () => {
      if (!savedRef.current) return;
      savedRef.current = false;
      setText("");
      setPickedDate(null);
      setStep("input");
      setResult(null);
    };
  }, []);

  async function analyze(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;
    setText(trimmed);
    setStep("loading");
    const response = await fetchPrediction({
      text: trimmed,
      defaultDate: date,
      today,
      history: buildHistorySummary(data, today),
    });
    setResult(response);
    setStep("result");
  }

  function save() {
    // 두 번 눌러도 한 번만 저장한다
    if (!result || !isDateRangeValid(result.prediction) || savedRef.current) return;
    savedRef.current = true;
    addEvent(result.prediction, result.source);
    router.push(`/?date=${result.prediction.startDate}`);
  }

  return (
    <div>
      <PageHeader title="일정 추가" subtitle="일정을 문장으로 적으면 예상 지출을 계산해 드려요" backHref="/" />

      <div className="space-y-4 px-5">
        {step !== "result" && (
          <Card>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                analyze(text);
              }}
              className="space-y-4"
            >
              <label className="block">
                <span className="text-sm font-medium text-ink-2">어떤 일정인가요?</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="예: 다음 주 토요일 성수동 친구 모임"
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-2xl bg-surface-2 p-3 text-base outline-none placeholder:text-muted focus:ring-2 focus:ring-primary"
                />
              </label>

              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => analyze(example)}
                    disabled={step === "loading"}
                    className="rounded-full bg-surface-2 px-3 py-1.5 text-xs text-ink-2 hover:brightness-95"
                  >
                    {example}
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="text-sm font-medium text-ink-2">날짜</span>
                <span className="ml-1 text-xs text-muted">문장에 날짜가 없을 때 이 날로 잡아요</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => e.target.value && setPickedDate(e.target.value)}
                  className="mt-1.5 block h-12 w-full rounded-2xl bg-surface-2 px-3 text-base outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="mt-1 block text-xs text-muted">{formatDateKo(date)}</span>
              </label>

              <Button type="submit" size="lg" full disabled={!text.trim() || step === "loading"}>
                {step === "loading" ? (
                  <>
                    <IconLoader2 size={18} className="animate-spin" aria-hidden />
                    과거 소비와 비슷한 일정을 살펴보는 중…
                  </>
                ) : (
                  <>
                    <IconSparkles size={18} aria-hidden />
                    예상 지출 분석하기
                  </>
                )}
              </Button>
            </form>
          </Card>
        )}

        {step === "result" && result && (
          <>
            <PredictionResult
              response={result}
              onChange={(prediction) => setResult({ ...result, prediction })}
            />
            <BudgetImpactCard prediction={result.prediction} />
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <Button variant="secondary" size="lg" onClick={() => setStep("input")}>
                다시 입력
              </Button>
              <Button size="lg" onClick={save} disabled={!isDateRangeValid(result.prediction)}>
                캘린더에 추가
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
