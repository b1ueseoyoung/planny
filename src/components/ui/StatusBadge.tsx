import { CircleCheck, CircleExclamationPoint, TriangleExclamationPoint } from "lucide-react";
import type { BudgetStatus } from "@/lib/types";

/** 예산 상태 표시. 색만으로 구분하지 않도록 아이콘과 글자를 항상 같이 보여준다. */
const STATUS = {
  safe: { label: "여유", icon: CircleCheck, className: "text-good" },
  tight: { label: "빠듯", icon: CircleExclamationPoint, className: "text-warning" },
  over: { label: "초과 예상", icon: TriangleExclamationPoint, className: "text-critical" },
} as const;

export function StatusBadge({ status }: { status: BudgetStatus }) {
  const { label, icon: Icon, className } = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink">
      <Icon size={14} className={className} aria-hidden />
      {label}
    </span>
  );
}

export function statusMessage(status: BudgetStatus, balance: number): string {
  if (status === "over") return `예산을 ${Math.round(-balance / 10_000)}만원쯤 넘을 것 같아요`;
  if (status === "tight") return "예산 안이지만 빠듯해요";
  return "예산 안에서 여유 있게 생활할 수 있어요";
}
