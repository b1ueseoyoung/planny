// API 키 없이도 돌아가는 키워드 기반 목업 예측. 브라우저·서버 양쪽에서 쓴다 (Node 전용 API 쓰지 않기).
// TODO: AI 예측(claude.ts)이 기본이 되면 오프라인 대비용으로만 남기기
import type { EventPrediction, EventType, ISODate, PredictRequest, PredictedItem } from "../types";
import { EVENT_TYPE_LABEL } from "../categories";
import { addDays, addMonths, dayOfWeek, monthKey, parseISODate, toISODate } from "../date";
import { formatWon } from "../format";

const round100 = (n: number) => Math.round(n / 100) * 100;
const WEEKDAY: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
const WEEK_OFFSET: Record<string, number> = { 이번: 0, 다음: 7, 다다음: 14 };
const DAY_WORD: Record<string, number> = { 오늘: 0, 내일: 1, 모레: 2 };

/** 장소 키워드. trip은 여행지까지 왕복 교통비 */
const PLACES: { key: string; name: string; trip?: number }[] = [
  { key: "부산", name: "부산", trip: 120_000 },
  { key: "제주", name: "제주", trip: 150_000 },
  { key: "강릉", name: "강릉", trip: 55_000 },
  { key: "속초", name: "속초", trip: 50_000 },
  { key: "여수", name: "여수", trip: 100_000 },
  { key: "경주", name: "경주", trip: 100_000 },
  { key: "전주", name: "전주", trip: 70_000 },
  { key: "대구", name: "대구", trip: 90_000 },
  { key: "대전", name: "대전", trip: 50_000 },
  { key: "가평", name: "가평", trip: 30_000 },
  { key: "성수", name: "성수동" },
  { key: "홍대", name: "홍대" },
  { key: "합정", name: "합정" },
  { key: "연남", name: "연남동" },
  { key: "강남", name: "강남" },
  { key: "잠실", name: "잠실" },
  { key: "이태원", name: "이태원" },
  { key: "한남", name: "한남동" },
  { key: "을지로", name: "을지로" },
  { key: "여의도", name: "여의도" },
  { key: "신촌", name: "신촌" },
  { key: "망원", name: "망원동" },
];

/** 위에서부터 먼저 걸리는 종류로 정한다 */
const TYPE_KEYWORDS: [EventType, RegExp][] = [
  ["travel", /여행|\d+\s*박|당일치기|휴가|트립/],
  ["date", /데이트|남친|여친|남자친구|여자친구|애인|기념일/],
  ["performance", /콘서트|공연|뮤지컬|연극|전시|페스티벌|팬미팅|영화/],
  ["work", /회식|워크숍|출장|송년회|팀\s*모임/],
  ["family", /가족|부모님|엄마|아빠|할머니|할아버지|동생|명절|생신/],
  ["friends", /친구|모임|동기|약속|생일|파티|술|동창/],
];

/** 문장에서 날짜를 찾는다. 찾은 표현은 제목에서 지우려고 같이 돌려준다 */
function parseStartDate(text: string, today: ISODate): { date: ISODate | null; phrase: string | null } {
  const { y, m } = parseISODate(today);
  const monday = addDays(today, -((dayOfWeek(today) + 6) % 7));
  const futureDate = (month: number, day: number) => {
    const date = toISODate(y, month, day);
    return date < today ? toISODate(y + 1, month, day) : date; // 지난 날짜면 내년으로
  };
  let match: RegExpMatchArray | null;

  if ((match = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/))) return { date: futureDate(+match[1], +match[2]), phrase: match[0] };
  if ((match = text.match(/(\d{1,2})\/(\d{1,2})/))) return { date: futureDate(+match[1], +match[2]), phrase: match[0] };
  if ((match = text.match(/다음\s*달\s*(\d{1,2})\s*일/))) {
    const [ny, nm] = addMonths(monthKey(today), 1).split("-").map(Number);
    return { date: toISODate(ny, nm, +match[1]), phrase: match[0] };
  }
  if ((match = text.match(/(이번|다음|다다음)\s*주\s*([일월화수목금토])요일/))) {
    return { date: addDays(monday, WEEK_OFFSET[match[1]] + ((WEEKDAY[match[2]] + 6) % 7)), phrase: match[0] };
  }
  if ((match = text.match(/(이번|다음)\s*주말/))) return { date: addDays(monday, (match[1] === "다음" ? 7 : 0) + 5), phrase: match[0] };
  if ((match = text.match(/([일월화수목금토])요일/))) {
    return { date: addDays(today, (WEEKDAY[match[1]] - dayOfWeek(today) + 7) % 7), phrase: match[0] };
  }
  if ((match = text.match(/오늘|내일|모레/))) return { date: addDays(today, DAY_WORD[match[0]]), phrase: match[0] };
  if ((match = text.match(/(\d{1,2})\s*일/))) {
    const thisMonth = toISODate(y, m, +match[1]);
    return { date: thisMonth < today ? toISODate(y, m + 1, +match[1]) : thisMonth, phrase: match[0] };
  }
  return { date: null, phrase: null };
}

/** "2박 3일" → 2, "1박" → 1, 없으면 0 */
function parseNights(text: string): { nights: number; phrase: string | null } {
  const match = text.match(/(\d+)\s*박(?:\s*\d+\s*일)?/);
  return match ? { nights: Number(match[1]), phrase: match[0] } : { nights: 0, phrase: null };
}

/** 종류별 기본 항목 (1인 기준) */
function baseItems(type: EventType, text: string): PredictedItem[] {
  const has = (re: RegExp) => re.test(text);
  switch (type) {
    case "friends":
      return [
        { category: "meal", label: has(/술|2차|포차/) ? "식사·술자리" : "식사", amount: has(/술|2차|포차/) ? 40_000 : 30_000 },
        { category: "cafe", label: "카페", amount: 9_000 },
        { category: "transport", label: "교통", amount: 6_000 },
        ...(has(/생일/) ? [{ category: "gift" as const, label: "생일 선물", amount: 20_000 }] : []),
      ];
    case "date":
      return [
        { category: "meal", label: "식사", amount: 40_000 },
        { category: "cafe", label: "카페", amount: 12_000 },
        { category: "transport", label: "교통", amount: 8_000 },
        ...(has(/영화|전시|공연/) ? [{ category: "culture" as const, label: "영화·전시", amount: 25_000 }] : []),
      ];
    case "performance": {
      const big = has(/콘서트|팬미팅|뮤지컬/);
      return [
        { category: "culture", label: "티켓", amount: big ? 132_000 : has(/영화/) ? 15_000 : 20_000 },
        { category: "meal", label: "식사", amount: 15_000 },
        { category: "transport", label: "교통", amount: 5_000 },
        ...(has(/콘서트|팬미팅/) ? [{ category: "shopping" as const, label: "굿즈", amount: 30_000 }] : []),
      ];
    }
    case "work":
      return [
        { category: "meal", label: "2차·개인 부담", amount: 15_000 },
        { category: "transport", label: "귀가 택시", amount: 15_000 },
      ];
    case "family":
      return [
        { category: "meal", label: "가족 외식", amount: 35_000 },
        { category: "transport", label: "교통", amount: 10_000 },
        ...(has(/생신|명절|용돈/) ? [{ category: "gift" as const, label: "선물·용돈", amount: 50_000 }] : []),
      ];
    default:
      return [
        { category: "meal", label: "식사", amount: 15_000 },
        { category: "transport", label: "교통", amount: 5_000 },
      ];
  }
}

export function mockPredict(req: PredictRequest): EventPrediction {
  const text = req.text.trim();
  const { nights, phrase: nightsPhrase } = parseNights(text);
  // "2박 3일"의 "3일"을 날짜로 읽지 않도록 기간 표현을 빼고 날짜를 찾는다
  const { date, phrase: datePhrase } = parseStartDate(nightsPhrase ? text.replace(nightsPhrase, " ") : text, req.today);
  const startDate = date ?? req.defaultDate;
  const type = TYPE_KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? "other";
  const place = PLACES.find((p) => text.includes(p.key)) ?? null;
  const typeLabel = EVENT_TYPE_LABEL[type];
  const reasons: string[] = [];
  const savingTips: EventPrediction["savingTips"] = [];
  let items: PredictedItem[];

  if (type === "travel") {
    const days = nights + 1;
    const trip = place?.trip ?? 80_000;
    items = [
      { category: "transport", label: "왕복 교통", amount: trip },
      ...(nights > 0 ? [{ category: "lodging" as const, label: `숙소 ${nights}박`, amount: 90_000 * nights }] : []),
      { category: "meal", label: "식비", amount: 30_000 * days + 20_000 },
      { category: "etc", label: "관광·기념품", amount: 20_000 * days + 10_000 },
    ];
    const lastTrip = req.history.pastEvents.find((e) => e.eventType === "travel");
    if (lastTrip) reasons.push(`지난 ${lastTrip.title}에 ${formatWon(lastTrip.total)}을 썼어요`);
    reasons.push(`${place?.name ?? "여행지"} 왕복 교통비 약 ${formatWon(trip)}`);
    if (nights > 0) reasons.push(`숙소는 1박 9만원 × ${nights}박으로 잡았어요`);
    if (trip >= 50_000) savingTips.push({ label: "KTX 대신 고속버스 타기", amount: Math.round((trip * 0.4) / 1000) * 1000 });
    if (nights > 0) savingTips.push({ label: "게스트하우스로 숙소 바꾸기", amount: 40_000 * nights });
  } else {
    items = baseItems(type, text);
    // 같은 장소의 지난 일정, 없으면 같은 종류의 지난 일정을 참고해서 금액을 그쪽으로 당긴다
    const byPlace = place ? req.history.pastEvents.filter((e) => e.location?.includes(place.key)) : [];
    const pool = byPlace.length ? byPlace : req.history.pastEvents.filter((e) => e.eventType === type);
    if (pool.length) {
      const average = pool.reduce((sum, e) => sum + e.total, 0) / pool.length;
      const templateTotal = items.reduce((sum, i) => sum + i.amount, 0);
      const factor = (templateTotal + average) / 2 / templateTotal;
      items = items.map((i) => ({ ...i, amount: round100(i.amount * factor) }));
      const what = byPlace.length ? `${place?.name} 일정` : typeLabel;
      reasons.push(`지난 ${what} ${pool.length}번 평균 ${formatWon(round100(average))}을 참고했어요`);
    } else {
      reasons.push("비슷한 지난 일정이 없어서 기본값으로 잡았어요");
    }
    reasons.push(`${typeLabel} 기본 항목(${items.map((i) => i.label).join("·")}) 기준이에요`);
    const cafe = items.find((i) => i.category === "cafe");
    if (cafe) savingTips.push({ label: "카페 대신 산책으로 마무리하기", amount: cafe.amount });
  }

  // 제목: 날짜 표현과 조사를 뺀 나머지
  let title = text;
  if (datePhrase) title = title.replace(new RegExp(`${escapeRegExp(datePhrase)}\\s*(부터|까지|에)?`), " ");
  title = title.replace(/\s+/g, " ").trim() || typeLabel;

  return {
    title,
    startDate,
    endDate: addDays(startDate, type === "travel" ? nights : 0),
    eventType: type,
    location: place?.name ?? null,
    items,
    reasons,
    savingTips,
  };
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
