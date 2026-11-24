import type { AppData, ISODate, MonthForecast } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/categories";
import { formatCompact } from "@/lib/format";
import { categoryOutlook } from "@/lib/home-summary";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

const TONES = [
  "bg-primary/15 text-primary",
  "bg-series-2/15 text-series-2",
  "bg-series-3/15 text-series-3",
  "bg-ai/15 text-ai",
];

/** 카테고리별 쓴 돈과 남은 기간 예상 (금액이 큰 4개) */
export function CategoryCards({ data, today, forecast }: { data: AppData; today: ISODate; forecast: MonthForecast }) {
  const list = categoryOutlook(data, forecast, today).slice(0, 4);
  if (list.length === 0) return null;

  return (
    <section aria-labelledby="category-title">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 id="category-title" className="text-[15px] font-semibold text-ink">
          카테고리별
        </h2>
        <span className="text-xs text-muted">쓴 돈 / 남은 기간 예상</span>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {list.map((c, i) => {
          const total = c.spent + c.projected;
          return (
            <li key={c.category} className="rounded-3xl bg-surface p-4 ring-1 ring-line">
              <CategoryIcon category={c.category} size={36} className={TONES[i % TONES.length]} />
              <p className="mt-3 text-sm text-ink-2">{CATEGORY_LABEL[c.category]}</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">{formatCompact(c.spent)}원</p>
              <p className="text-xs text-muted">+{formatCompact(c.projected)}원 예상</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <div className="h-full rounded-full bg-primary" style={{ width: `${total ? (c.spent / total) * 100 : 0}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
