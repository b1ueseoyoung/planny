// 이해한 일정(UnderstoodEvent)에 최종 금액을 정한다.
// 원칙: 비슷한 지난 일정 기록이 있으면 기록이 먼저, 없으면 AI(또는 규칙)의 추정. 계산은 전부 코드로.
// TODO: 인원·기간이 다르면 기록을 비례해서 조정하기, 예상 vs 실제 지출을 비교해서 보정하기
import type { Category, EventPrediction, HistorySummary, PredictedItem } from "../types";
import { EVENT_TYPE_LABEL } from "../categories";
import { formatWon } from "../format";
import { josa } from "../korean";
import type { UnderstoodEvent, Understander } from "./types";

type PastEvent = HistorySummary["pastEvents"][number];

const round100 = (n: number) => Math.round(n / 100) * 100;

/** "성수동"과 "성수"를 같은 곳으로 보도록 끝의 '동'을 떼고 비교 */
const placeKey = (place: string) => place.trim().replace(/동$/, "");

/** 같은 장소의 지난 일정, 없으면 같은 종류의 지난 일정 */
function findSimilar(u: UnderstoodEvent, history: HistorySummary): { events: PastEvent[]; what: string } {
  if (u.location) {
    const key = placeKey(u.location);
    const byPlace = history.pastEvents.filter((e) => {
      if (!e.location) return false;
      const other = placeKey(e.location);
      return other.includes(key) || key.includes(other);
    });
    if (byPlace.length > 0) return { events: byPlace, what: `${u.location} 일정` };
  }
  const byType = history.pastEvents.filter((e) => e.eventType === u.eventType);
  return { events: byType, what: EVENT_TYPE_LABEL[u.eventType] };
}

/** 지난 일정들에서 이 카테고리에 쓴 금액의 평균. 그 카테고리에 쓴 적이 없으면 null */
function categoryAverage(events: PastEvent[], category: Category): number | null {
  const amounts = events
    .map((e) => e.items.filter((i) => i.category === category).reduce((sum, i) => sum + i.amount, 0))
    .filter((amount) => amount > 0);
  return amounts.length > 0 ? amounts.reduce((sum, a) => sum + a, 0) / amounts.length : null;
}

export function estimateCosts(u: UnderstoodEvent, history: HistorySummary, by: Understander): EventPrediction {
  const similar = findSimilar(u, history);
  // 여행(목적지·기간이 매번 다름)이나 한쪽이 다 내는 일정은 지난 기록과 사정이 달라서 추정 금액을 그대로 쓴다
  const canUseHistory =
    u.eventType !== "travel" && (u.payer === "split" || u.payer === "unknown") && similar.events.length > 0;

  const fromHistory: string[] = [];
  const fromEstimate: string[] = [];
  const items: PredictedItem[] = u.items.map((item) => {
    const average = canUseHistory ? categoryAverage(similar.events, item.category) : null;
    if (average !== null) {
      fromHistory.push(item.label);
      return { category: item.category, label: item.label, amount: round100(average) };
    }
    fromEstimate.push(item.label);
    return { category: item.category, label: item.label, amount: item.estimate };
  });

  const reasons: string[] = [];
  if (fromHistory.length > 0) {
    reasons.push(`${josa(fromHistory.join(", "), "은", "는")} 지난 ${similar.what} ${similar.events.length}번 평균으로 잡았어요`);
  }
  if (fromEstimate.length > 0) {
    reasons.push(`${josa(fromEstimate.join(", "), "은", "는")} ${by === "rules" ? "기본값" : "AI가 추정한 금액"}이에요`);
  }
  if (u.payer === "me" && u.headcount !== 1) {
    reasons.push(`내가 내기로 해서 ${u.headcount ? `${u.headcount}명` : "다른 사람"} 몫까지 넣었어요`);
  }
  if (u.payer === "others") reasons.push("다른 사람이 내는 부분은 뺐어요");
  if (u.eventType === "travel") {
    const lastTrip = history.pastEvents.find((e) => e.eventType === "travel");
    if (lastTrip) reasons.push(`참고로 지난 ${lastTrip.title}에 ${formatWon(lastTrip.total)}을 썼어요`);
  }
  reasons.push(...u.notes);

  return {
    title: u.title,
    startDate: u.startDate,
    endDate: u.endDate,
    eventType: u.eventType,
    location: u.location,
    people: u.people,
    items,
    reasons: [...new Set(reasons)].slice(0, 5),
    savingTips: u.savingTips,
  };
}
