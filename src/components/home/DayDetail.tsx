"use client";

import { Plus } from "lucide-react";
import type { CalendarEvent, ISODate } from "@/lib/types";
import { useAppData } from "@/lib/store";
import { dDayLabel, formatDateKo, formatRangeKo } from "@/lib/date";
import { formatCompact, formatWon } from "@/lib/format";
import { eventCost } from "@/lib/forecast";
import { CATEGORY_LABEL, EVENT_TYPE_LABEL } from "@/lib/categories";
import { Card, CardTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

/** 캘린더에서 고른 날의 일정과 지출 내역 */
export function DayDetail({ date }: { date: ISODate }) {
  const { data, today } = useAppData();
  const events = data.events.filter((e) => e.startDate <= date && date <= e.endDate);
  const transactions = data.transactions.filter((t) => t.date === date);
  const dayTotal = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Card>
      <CardTitle
        right={
          <LinkButton href={`/events/new?date=${date}`} variant="secondary" className="!h-8 !px-3 !text-xs">
            <Plus size={14} aria-hidden />
            일정
          </LinkButton>
        }
      >
        {formatDateKo(date)}
        <span className="ml-1.5 text-sm font-medium text-muted">{dDayLabel(date, today)}</span>
      </CardTitle>

      {events.length > 0 && (
        <ul className="space-y-2">
          {events.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </ul>
      )}

      {transactions.length > 0 && (
        <div className={events.length > 0 ? "mt-4" : ""}>
          <p className="mb-2 text-xs font-medium text-muted">쓴 돈 · {formatWon(dayTotal)}</p>
          <ul className="space-y-2.5">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center gap-3">
                <CategoryIcon category={t.category} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.merchant}</p>
                  <p className="text-xs text-muted">{CATEGORY_LABEL[t.category]}</p>
                </div>
                <span className="text-sm font-medium tabular-nums">{formatWon(t.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {events.length === 0 && transactions.length === 0 && (
        <p className="py-4 text-center text-sm text-muted">
          {date > today ? "일정을 추가하면 예상 지출을 알려드려요" : "기록된 지출이 없어요"}
        </p>
      )}
      {/* TODO: 지출 직접 기록하기 (금액·카테고리·메모) */}
    </Card>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const { data, today, removeEvent } = useAppData();
  const cost = eventCost(data, event);

  return (
    <li className="rounded-2xl bg-surface-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted">
            {EVENT_TYPE_LABEL[event.eventType]}
            {event.location ? ` · ${event.location}` : ""}
          </p>
          <p className="truncate font-semibold">{event.title}</p>
          {event.startDate !== event.endDate && (
            <p className="text-xs text-muted">{formatRangeKo(event.startDate, event.endDate)}</p>
          )}
        </div>
        {cost.kind !== "none" && (
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted">{cost.kind === "actual" ? "실제" : "예상"}</p>
            <p className="font-semibold tabular-nums">{formatWon(cost.amount)}</p>
          </div>
        )}
      </div>

      {cost.kind === "predicted" && event.prediction && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {event.prediction.items.map((item, i) => (
            <span key={i} className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-2">
              {item.label} {formatCompact(item.amount)}
            </span>
          ))}
        </div>
      )}

      {event.endDate >= today && (
        <button
          type="button"
          onClick={() => window.confirm("이 일정을 삭제할까요?") && removeEvent(event.id)}
          className="mt-2 text-xs text-muted underline underline-offset-2"
        >
          삭제
        </button>
      )}
      {/* TODO: 일정 상세 화면(/events/[id])에서 예측 근거 보기, 금액 고치기, 끝난 일정에 실제 지출 연결하기 */}
    </li>
  );
}
