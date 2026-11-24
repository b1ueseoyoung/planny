"use client";

import { Briefcase, CalendarDays, Heart, House, Plane, Repeat, Ticket, Users, type LucideIcon } from "lucide-react";
import type { EventType } from "@/lib/types";
import { useAppData } from "@/lib/store";
import { dDayLabel, formatDateKo } from "@/lib/date";
import { formatCompact } from "@/lib/format";
import { upcomingPayments } from "@/lib/home-summary";

const EVENT_ICON: Record<EventType, LucideIcon> = {
  friends: Users,
  date: Heart,
  travel: Plane,
  performance: Ticket,
  work: Briefcase,
  family: House,
  other: CalendarDays,
};

/** 30일 안에 나갈 돈: 일정(예상)과 정기결제를 가로로 넘기는 카드로 */
export function UpcomingEvents() {
  const { data, today } = useAppData();
  const items = upcomingPayments(data, today, 30).slice(0, 8);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="upcoming-title">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 id="upcoming-title" className="text-[15px] font-semibold text-ink">
          다가오는 지출
        </h2>
        <span className="text-xs text-muted">30일 안</span>
      </div>
      <ul className="scroll-row -mx-5 flex snap-x scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-1">
        {items.map((p) => {
          const isSubscription = p.kind === "subscription";
          const Icon = isSubscription ? Repeat : EVENT_ICON[p.eventType ?? "other"];
          return (
            <li key={p.id} className="w-[136px] shrink-0 snap-start rounded-3xl bg-surface p-3.5 ring-1 ring-line">
              <div className="flex items-center justify-between">
                <span
                  className={`grid size-9 place-items-center rounded-2xl ${
                    isSubscription ? "bg-ai/15 text-ai" : "bg-series-2/15 text-series-2"
                  }`}
                >
                  <Icon size={18} aria-hidden />
                </span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                  {dDayLabel(p.date, today)}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold leading-5">{p.title}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{formatCompact(p.amount)}원</p>
              <p className="text-[11px] text-muted">
                {formatDateKo(p.date, false)} {isSubscription ? "정기결제" : "일정 예상"}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
