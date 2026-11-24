import {
  IconCloud,
  IconCloudRain,
  IconHaze,
  IconInfoCircle,
  IconSparkles,
  IconSun,
  type TablerIcon,
} from "@tabler/icons-react";
import type { AppData, CalendarEvent, ISODate, MonthForecast } from "@/lib/types";
import { dDayLabel } from "@/lib/date";
import { formatCompact } from "@/lib/format";
import { predictionTotal } from "@/lib/forecast";
import { buildSuggestions } from "@/lib/suggestions";
import {
  biggestUpcomingEvent,
  spendWeather,
  tangibleLabel,
  WEATHER_LABEL,
  type SpendWeather,
  type WeekSummary,
} from "@/lib/home-summary";

const WEATHER_ICON: Record<SpendWeather, TablerIcon> = {
  clear: IconSun,
  partly: IconHaze,
  cloudy: IconCloud,
  rain: IconCloudRain,
};

/** 예측 카드: 이번 주 소비 날씨, 다가오는 가장 큰 지출과 근거, 아끼는 방법(체감 금액으로) */
export function AiInsightCard({
  data,
  today,
  week,
  forecast,
}: {
  data: AppData;
  today: ISODate;
  week: WeekSummary;
  forecast: MonthForecast;
}) {
  const weather = spendWeather(week.total, week.usual);
  const WeatherIcon = WEATHER_ICON[weather];
  const event = biggestUpcomingEvent(data, today);
  const suggestion = buildSuggestions(forecast)[0];
  const chip = event ? (event.source === "ai" ? "AI 예측" : "목업 예측") : "예측 요약";

  return (
    <section aria-label="예측 요약" className="rounded-3xl bg-linear-to-br from-ai/25 via-surface to-surface p-5 ring-1 ring-ai/25">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-ai/15 px-2.5 py-1 text-xs font-bold text-ai">
          <IconSparkles size={13} aria-hidden />
          {chip}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
          <WeatherIcon size={15} className="text-warning" aria-hidden />
          이번 주 소비 날씨
          <b className="font-semibold text-ink">{WEATHER_LABEL[weather]}</b>
        </span>
      </div>

      {event ? (
        <EventInsight event={event} today={today} />
      ) : suggestion ? (
        <p className="mt-4 text-sm leading-6 text-ink-2">
          이번 달은 <b className="text-ink">{suggestion.label}</b>를 해 보세요. {formatCompact(suggestion.amount)}원,{" "}
          <b className="text-flame">{tangibleLabel(suggestion.amount)}</b> 값을 아낄 수 있어요.
        </p>
      ) : (
        <p className="mt-4 text-sm leading-6 text-ink-2">다가오는 큰 지출이 없어요. 지금처럼만 쓰면 돼요.</p>
      )}
    </section>
  );
}

function EventInsight({ event, today }: { event: CalendarEvent; today: ISODate }) {
  const p = event.prediction!;
  const tip = [...p.savingTips].sort((a, b) => b.amount - a.amount)[0];

  return (
    <>
      <p className="mt-4 text-xs text-muted">{dDayLabel(event.startDate, today)}, 다가오는 가장 큰 지출</p>
      <p className="mt-1 text-lg font-bold">{event.title}</p>
      <p className="text-[28px] font-bold leading-tight tracking-tight tabular-nums">
        예상 {formatCompact(predictionTotal(p))}원
      </p>
      {p.reasons[0] && (
        <p className="mt-3 flex gap-1.5 text-xs leading-5 text-ink-2">
          <IconInfoCircle size={14} className="mt-0.5 shrink-0" aria-hidden />
          {p.reasons[0]}
        </p>
      )}
      {tip && (
        <div className="mt-4 rounded-2xl bg-page/60 p-3">
          <p className="text-xs text-muted">아끼는 방법</p>
          <p className="mt-1 text-sm font-semibold">{tip.label}</p>
          <p className="mt-0.5 text-sm text-ink-2">
            -{formatCompact(tip.amount)}원, <b className="text-flame">{tangibleLabel(tip.amount)}</b> 값
          </p>
        </div>
      )}
    </>
  );
}
