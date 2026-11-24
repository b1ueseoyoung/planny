import { IconCheck } from "@tabler/icons-react";
import type { DaySpend } from "@/lib/forecast";
import { formatDateKo } from "@/lib/date";
import { formatCompact } from "@/lib/format";

const SIZE = { s: "size-[7px]", m: "size-[11px]", l: "size-[15px]" } as const;

/** 하루 예산 대비 크기 3단계: 절반 이하, 1.5배 이하, 그 이상 */
function dotSize(amount: number, dailyBudget: number): keyof typeof SIZE {
  const ratio = amount / dailyBudget;
  if (ratio <= 0.5) return "s";
  if (ratio <= 1.5) return "m";
  return "l";
}

/**
 * 캘린더 칸의 점 하나. 채운 점은 실제로 쓴 돈, 점선 테두리는 예상 금액, 주황은 일정이 있는 날.
 * 금액은 점 크기로도 보여 줘서 색만으로 구분하지 않는다. 지난 날 무지출은 체크 표시.
 */
export function DayDot({
  day,
  dailyBudget,
  isToday = false,
  onAccent = false,
}: {
  day: DaySpend;
  dailyBudget: number;
  isToday?: boolean;
  /** 파란 바탕(오늘) 위에 그릴 때 */
  onAccent?: boolean;
}) {
  if (day.amount <= 0) {
    if (day.kind === "actual" && !isToday) return <IconCheck size={12} stroke={3} className="text-good" aria-hidden />;
    return <span className={`size-[5px] rounded-full ${onAccent ? "bg-white/60" : "bg-surface-2"}`} aria-hidden />;
  }

  const size = SIZE[dotSize(day.amount, dailyBudget)];
  const hasEvent = day.events.length > 0;
  if (day.kind === "actual") {
    const fill = onAccent ? "bg-white" : hasEvent ? "bg-series-2" : "bg-primary";
    return <span className={`${size} rounded-full ${fill}`} aria-hidden />;
  }
  const ring = hasEvent ? "border-series-2 bg-series-2/20" : "border-primary bg-primary/15";
  return <span className={`${size} rounded-full border-[1.5px] border-dashed ${ring}`} aria-hidden />;
}

/** 스크린 리더용 설명: "11월 28일 (토), 예상 9만원, 홍대 친구 생일 모임" */
export function daySpendLabel(day: DaySpend): string {
  const money =
    day.amount > 0 ? `${day.kind === "actual" ? "쓴 돈" : "예상"} ${formatCompact(day.amount)}원` : day.kind === "actual" ? "지출 없음" : "";
  return [formatDateKo(day.date), money, ...day.events.map((e) => e.title)].filter(Boolean).join(", ");
}
