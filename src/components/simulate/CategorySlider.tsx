"use client";

import type { Category } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/categories";
import { formatCompact, formatWon } from "@/lib/format";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

/** 카테고리 하나를 0~50%까지 줄여 보는 슬라이더 */
export function CategorySlider({
  category,
  base,
  ratio,
  periodLabel,
  onChange,
}: {
  category: Category;
  /** 조정 전 예상 금액 */
  base: number;
  /** 0~1 */
  ratio: number;
  /** "남은 기간 예상" 또는 "한 달 예상" */
  periodLabel: string;
  onChange: (ratio: number) => void;
}) {
  const percent = Math.round(ratio * 100);
  const saving = Math.round(base * ratio);
  const id = `slider-${category}`;

  return (
    <li>
      <div className="flex items-center gap-3">
        <CategoryIcon category={category} />
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-[15px] font-semibold text-ink">
            {CATEGORY_LABEL[category]}
          </label>
          <p className="text-xs text-muted">
            {periodLabel} {formatCompact(base)}원
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-ink">{saving > 0 ? `−${formatCompact(saving)}원` : "그대로"}</p>
          <p className="text-xs text-muted">{percent}% 줄이기</p>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={50}
        step={5}
        value={percent}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-valuetext={`${percent}% 줄이기, ${formatWon(saving)} 절약`}
        className="mt-3 w-full accent-primary"
      />
    </li>
  );
}
