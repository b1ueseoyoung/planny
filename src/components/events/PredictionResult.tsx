import { IconAlertTriangle, IconMapPin, IconSparkles, IconUsers } from "@tabler/icons-react";
import type { EventPrediction, ISODate, PredictResponse } from "@/lib/types";
import { addDays, diffDays, formatRangeKo, parseISODate, toISODate } from "@/lib/date";
import { formatWon } from "@/lib/format";
import { predictionTotal } from "@/lib/forecast";
import { tangibleLabel } from "@/lib/home-summary";
import { CATEGORY_LABEL, EVENT_TYPE_LABEL } from "@/lib/categories";
import { Card } from "@/components/ui/Card";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

// 날짜 계산과 월 이동이 지원하는 네 자리 연도 범위. 입력 중인 연도는 저장하지 않는다.
const MIN_DATE = "1000-01-01";
const MAX_DATE = "9998-12-31";

function isSupportedDate(date: ISODate): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < MIN_DATE || date > MAX_DATE) return false;
  const { y, m, d } = parseISODate(date);
  return toISODate(y, m, d) === date;
}

/** 실제로 있는 지원 범위의 날짜이고, 종료일이 시작일과 같거나 뒤인지 */
export function isDateRangeValid(prediction: EventPrediction): boolean {
  return isSupportedDate(prediction.startDate) && isSupportedDate(prediction.endDate) && prediction.endDate >= prediction.startDate;
}

/** 한 항목에 넣을 수 있는 가장 큰 금액 (잘못 눌러 0이 줄줄이 붙는 것 막기) */
const MAX_AMOUNT = 100_000_000;

/** 입력칸 글자에서 숫자만 뽑아 금액으로 바꾼다. "49,000원" → 49000, 빈칸 → 0 */
function parseAmount(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits ? Math.min(Number(digits), MAX_AMOUNT) : 0;
}

/**
 * AI(또는 목업)가 예측한 항목별 지출, 근거, 아끼는 방법.
 * onChange를 넘기면 저장 전에 날짜와 항목 금액을 고칠 수 있다.
 */
export function PredictionResult({
  response,
  onChange,
}: {
  response: PredictResponse;
  onChange?: (prediction: EventPrediction) => void;
}) {
  const { prediction: p, source, notice } = response;

  function setAmount(index: number, amount: number) {
    onChange?.({ ...p, items: p.items.map((item, i) => (i === index ? { ...item, amount } : item)) });
  }

  // 시작일을 옮기면 기간(며칠짜리인지)은 그대로 두고 종료일도 같이 옮긴다.
  // 종료일이 이미 잘못돼 있으면 그 기간은 믿을 수 없으니 시작일과 같은 날로 맞춘다.
  function setStartDate(startDate: ISODate) {
    const days = isDateRangeValid(p) ? diffDays(p.endDate, p.startDate) : 0;
    onChange?.({ ...p, startDate, endDate: isSupportedDate(startDate) ? addDays(startDate, days) : startDate });
  }

  // 종료일은 바로 고치지 않는다. 키보드로 "14"를 치면 중간에 "01"이 먼저 들어오는데,
  // 그때 시작일로 되돌리면 나머지 글자를 칠 수 없다. 대신 아래에 안내하고 저장을 막는다.
  function setEndDate(endDate: ISODate) {
    onChange?.({ ...p, endDate });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-2">{EVENT_TYPE_LABEL[p.eventType]}</span>
        {p.location && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-2 py-0.5 text-ink-2">
            <IconMapPin size={12} aria-hidden />
            {p.location}
          </span>
        )}
        {p.people && p.people.length > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-2 py-0.5 text-ink-2">
            <IconUsers size={12} aria-hidden />
            {p.people.join(", ")}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-ai/15 px-2 py-0.5 font-semibold text-ai">
          <IconSparkles size={12} aria-hidden />
          {source === "ai" ? "AI 예측" : "목업 예측"}
        </span>
      </div>

      <h2 className="mt-2 text-lg font-bold">{p.title}</h2>
      {onChange ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs text-muted">시작일</span>
            <input
              type="date"
              value={p.startDate}
              min={MIN_DATE}
              max={MAX_DATE}
              onChange={(e) => e.target.value && setStartDate(e.target.value)}
              className="mt-1 block h-10 w-full rounded-xl bg-surface-2 px-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">종료일</span>
            <input
              type="date"
              value={p.endDate}
              min={isSupportedDate(p.startDate) ? p.startDate : MIN_DATE}
              max={MAX_DATE}
              onChange={(e) => e.target.value && setEndDate(e.target.value)}
              className="mt-1 block h-10 w-full rounded-xl bg-surface-2 px-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          {isDateRangeValid(p) ? (
            <p className="col-span-2 text-xs text-muted">{formatRangeKo(p.startDate, p.endDate)}</p>
          ) : (
            <p role="alert" className="col-span-2 inline-flex items-center gap-1 text-xs font-medium text-critical">
              <IconAlertTriangle size={14} aria-hidden />
              {!isSupportedDate(p.startDate) || !isSupportedDate(p.endDate)
                ? "1000년부터 9998년 사이의 올바른 날짜를 입력해 주세요"
                : "종료일이 시작일보다 앞서요"}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">{formatRangeKo(p.startDate, p.endDate)}</p>
      )}
      {notice && <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-2">{notice}</p>}

      <ul className="mt-4 space-y-2.5">
        {p.items.map((item, i) => (
          <li key={i} className="flex items-center gap-3">
            <CategoryIcon category={item.category} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted">{CATEGORY_LABEL[item.category]}</p>
            </div>
            {onChange ? (
              <label className="flex shrink-0 items-center gap-1 rounded-xl bg-surface-2 px-2 focus-within:ring-2 focus-within:ring-primary">
                <span className="sr-only">{item.label} 금액</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={item.amount.toLocaleString("ko-KR")}
                  onChange={(e) => setAmount(i, parseAmount(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="h-9 w-24 bg-transparent text-right text-sm font-medium tabular-nums outline-none"
                />
                <span className="text-sm text-muted">원</span>
              </label>
            ) : (
              <span className="text-sm font-medium tabular-nums">{formatWon(item.amount)}</span>
            )}
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
