// 예산을 넘거나 빠듯할 때 "어떤 카테고리를 얼마나 줄이면 되는지" 제안
import type { Category, MonthForecast, Suggestion } from "./types";
import { ADJUSTABLE_CATEGORIES, CATEGORY_LABEL } from "./categories";
import { TIGHT_RATIO } from "./forecast";

const roundTo100 = (n: number) => Math.round(n / 100) * 100;

/**
 * 줄일 여지가 큰(남은 기간 예상 금액이 큰) 카테고리부터 30%씩 줄이기를 제안하고,
 * 30%로는 다 못 메우면 50%로 올린다.
 * TODO: 사용자가 "이건 못 줄여" 하는 카테고리 제외하기, AI가 제안 문구 다듬기
 */
export function buildSuggestions(forecast: MonthForecast): Suggestion[] {
  if (forecast.status === "safe") return [];

  // 넘으면 0원까지, 빠듯하면 '여유' 기준(예산의 10%)까지 메울 금액
  const need =
    forecast.status === "over"
      ? -forecast.projectedBalance
      : forecast.budget * TIGHT_RATIO - forecast.projectedBalance;
  if (need <= 0) return [];

  const candidates = ADJUSTABLE_CATEGORIES.map((category) => ({
    category,
    base: forecast.routineByCategory[category] ?? 0,
  }))
    .filter((c) => c.base > 0)
    .sort((a, b) => b.base - a.base);

  const canCoverAt30 = candidates.reduce((sum, c) => sum + c.base * 0.3, 0) >= need;
  const ratio = canCoverAt30 ? 0.3 : 0.5;

  const result: Suggestion[] = [];
  let covered = 0;
  for (const { category, base } of candidates) {
    if (covered >= need) break;
    const amount = roundTo100(base * ratio);
    if (amount <= 0) continue;
    result.push({ category, ratio, amount, label: cutLabel(category, ratio) });
    covered += amount;
  }
  return result;
}

function cutLabel(category: Category, ratio: number) {
  return `${CATEGORY_LABEL[category]} ${Math.round(ratio * 100)}% 줄이기`;
}
