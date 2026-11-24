import type { ReactNode } from "react";

/** 기본 카드. 화면의 덩어리 하나를 감싼다. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-surface p-5 ring-1 ring-line ${className}`}>{children}</section>;
}

/** 카드 안 작은 제목 */
export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-[15px] font-semibold text-ink">{children}</h2>
      {right}
    </div>
  );
}
