// 처음 써볼 때 보여줄 샘플 데이터. 같은 today면 항상 같은 데이터가 나온다.
// TODO: 카드사 내역 CSV 가져오기가 생기면 이 샘플 대신 실제 데이터로 시작하기
import type { AppData, CalendarEvent, Category, EventPrediction, EventType, ISODate, Transaction } from "./types";
import { addDays, addMonths, dayOfWeek, monthKey, parseISODate } from "./date";

const HISTORY_DAYS = 60;

/** 문자열 시드로 만드는 작은 난수 생성기 (mulberry32) */
function createRng(seedText: string) {
  let seed = 0;
  for (const ch of seedText) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 평소 생활비 규칙: 평일/주말에 이 확률로 min~max원을 쓴다 */
const ROUTINE_RULES: {
  category: Category;
  merchants: string[];
  min: number;
  max: number;
  weekday: number;
  weekend: number;
}[] = [
  { category: "transport", merchants: ["지하철·버스"], min: 3_100, max: 3_100, weekday: 0.95, weekend: 0 },
  { category: "meal", merchants: ["회사 앞 김치찌개", "샐러드 가게", "분식집", "국밥집", "돈가스집"], min: 9_000, max: 12_000, weekday: 0.9, weekend: 0 },
  { category: "cafe", merchants: ["메가커피", "컴포즈커피", "스타벅스"], min: 2_000, max: 6_000, weekday: 0.6, weekend: 0.45 },
  { category: "meal", merchants: ["동네 브런치", "라멘집", "쌀국수집"], min: 12_000, max: 20_000, weekday: 0, weekend: 0.35 },
  { category: "transport", merchants: ["지하철·버스"], min: 2_800, max: 5_600, weekday: 0, weekend: 0.5 },
  { category: "delivery", merchants: ["배달의민족", "쿠팡이츠"], min: 18_000, max: 30_000, weekday: 0.2, weekend: 0.3 },
  { category: "grocery", merchants: ["GS25", "CU", "세븐일레븐"], min: 3_000, max: 12_000, weekday: 0.25, weekend: 0.25 },
  { category: "grocery", merchants: ["동네 마트", "이마트"], min: 25_000, max: 50_000, weekday: 0, weekend: 0.2 },
  { category: "shopping", merchants: ["무신사", "올리브영", "쿠팡", "다이소"], min: 12_000, max: 60_000, weekday: 0.05, weekend: 0.05 },
  { category: "culture", merchants: ["CGV", "교보문고"], min: 12_000, max: 18_000, weekday: 0.02, weekend: 0.06 },
  { category: "transport", merchants: ["카카오T 택시"], min: 8_000, max: 15_000, weekday: 0.04, weekend: 0.04 },
];

/** 매달 같은 날 나가는 정기결제 */
const SUBSCRIPTIONS = [
  { day: 3, merchant: "넷플릭스", amount: 13_500 },
  { day: 10, merchant: "유튜브 프리미엄", amount: 14_900 },
  { day: 18, merchant: "멜론", amount: 10_900 },
  { day: 25, merchant: "통신비", amount: 55_000 },
];

/** 지난 일정과 그날 실제로 쓴 돈 (날짜는 '가장 최근 토요일'에서 몇 주 전인지로 정함) */
const PAST_EVENTS: {
  weeksAgo: number;
  title: string;
  eventType: EventType;
  location: string;
  nights: number;
  spend: [Category, string, number][];
}[] = [
  {
    weeksAgo: 6,
    title: "성수동 친구 모임",
    eventType: "friends",
    location: "성수동",
    nights: 0,
    spend: [
      ["meal", "성수 파스타집", 29_000],
      ["cafe", "성수 카페", 8_500],
      ["transport", "지하철", 6_200],
    ],
  },
  {
    weeksAgo: 4,
    title: "강릉 1박 2일 여행",
    eventType: "travel",
    location: "강릉",
    nights: 1,
    spend: [
      ["transport", "KTX 왕복", 54_000],
      ["lodging", "강릉 게스트하우스", 65_000],
      ["meal", "초당순두부", 24_000],
      ["meal", "회센터", 44_000],
      ["cafe", "안목해변 카페", 12_000],
      ["etc", "기념품", 15_000],
    ],
  },
  {
    weeksAgo: 2,
    title: "성수동 친구 모임",
    eventType: "friends",
    location: "성수동",
    nights: 0,
    spend: [
      ["meal", "성수 고깃집", 33_000],
      ["cafe", "성수 디저트 카페", 9_800],
      ["transport", "지하철", 7_400],
    ],
  },
  {
    weeksAgo: 0,
    title: "한남동 전시 데이트",
    eventType: "date",
    location: "한남동",
    nights: 0,
    spend: [
      ["culture", "전시 티켓", 34_000],
      ["meal", "한남동 비스트로", 42_000],
      ["cafe", "카페", 12_000],
      ["transport", "택시", 9_800],
    ],
  },
];

/** 오늘보다 앞선 가장 최근 토요일 */
function previousSaturday(today: ISODate): ISODate {
  return addDays(today, -(((dayOfWeek(today) + 1) % 7) || 7));
}

/** 오늘 이후 첫 토요일 */
function nextSaturday(today: ISODate): ISODate {
  return addDays(today, ((6 - dayOfWeek(today) + 7) % 7) || 7);
}

/** 오늘 기준 샘플 데이터 (최근 60일 거래 내역 + 지난 일정 + 다가오는 일정) */
export function createMockData(today: ISODate): AppData {
  const rng = createRng(today);
  const pick = <T,>(list: T[]) => list[Math.floor(rng() * list.length)];
  const transactions: Transaction[] = [];
  const add = (date: ISODate, category: Category, merchant: string, amount: number, eventId?: string) =>
    transactions.push({ id: `tx_${String(transactions.length + 1).padStart(4, "0")}`, date, category, merchant, amount, eventId });

  // 1) 지난 일정 + 그날 쓴 돈
  const lastSaturday = previousSaturday(today);
  const events: CalendarEvent[] = PAST_EVENTS.map((e, i) => {
    const startDate = addDays(lastSaturday, -7 * e.weeksAgo);
    const id = `evt_past_${i + 1}`;
    for (const [category, merchant, amount] of e.spend) add(startDate, category, merchant, amount, id);
    return {
      id,
      title: e.title,
      startDate,
      endDate: addDays(startDate, e.nights),
      eventType: e.eventType,
      location: e.location,
      prediction: null,
      source: null,
    };
  });
  const eventDays = new Set(events.map((e) => e.startDate));

  // 2) 최근 60일 평소 생활비
  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset--) {
    const date = addDays(today, -offset);
    const weekend = dayOfWeek(date) === 0 || dayOfWeek(date) === 6;
    for (const rule of ROUTINE_RULES) {
      // 일정이 있는 날은 식사·카페·교통을 일정 쪽에서 썼다고 본다
      if (eventDays.has(date) && ["meal", "cafe", "transport"].includes(rule.category)) continue;
      if (rng() >= (weekend ? rule.weekend : rule.weekday)) continue;
      const amount = Math.round((rule.min + rng() * (rule.max - rule.min)) / 100) * 100;
      add(date, rule.category, pick(rule.merchants), amount);
    }
    const sub = SUBSCRIPTIONS.find((s) => s.day === parseISODate(date).d);
    if (sub) add(date, "subscription", sub.merchant, sub.amount);
  }
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  // 3) 다가오는 일정 (예측 포함)
  const birthdayDate = nextSaturday(today);
  let busanStart: ISODate = `${addMonths(monthKey(today), 1)}-05`;
  if (busanStart <= birthdayDate) busanStart = `${addMonths(monthKey(today), 1)}-12`;
  events.push(
    toEvent("evt_birthday", "mock", {
      title: "홍대 친구 생일 모임",
      startDate: birthdayDate,
      endDate: birthdayDate,
      eventType: "friends",
      location: "홍대",
      items: [
        { category: "meal", label: "저녁 식사", amount: 28_000 },
        { category: "cafe", label: "카페", amount: 8_000 },
        { category: "gift", label: "생일 선물 (친구들과 나눠서)", amount: 20_000 },
        { category: "transport", label: "지하철", amount: 5_000 },
      ],
      reasons: ["지난 친구 모임 2번 평균 47,000원을 기준으로 했어요", "생일 선물은 친구들과 나눠서 2만원으로 잡았어요"],
      savingTips: [{ label: "2차는 카페 대신 산책하기", amount: 8_000 }],
    }),
    toEvent("evt_busan", "mock", {
      title: "부산 2박 3일 여행",
      startDate: busanStart,
      endDate: addDays(busanStart, 2),
      eventType: "travel",
      location: "부산",
      items: [
        { category: "transport", label: "KTX 왕복", amount: 120_000 },
        { category: "lodging", label: "숙소 2박", amount: 180_000 },
        { category: "meal", label: "식비", amount: 110_000 },
        { category: "etc", label: "관광·기념품", amount: 70_000 },
      ],
      reasons: [
        "지난 강릉 1박 2일 여행에 214,000원을 썼어요",
        "부산은 KTX 왕복 12만원 정도예요",
        "숙소는 1박 9만원으로 잡았어요",
      ],
      savingTips: [
        { label: "KTX 대신 고속버스 타기", amount: 50_000 },
        { label: "게스트하우스로 숙소 바꾸기", amount: 80_000 },
      ],
    }),
  );

  return { userName: "나", budget: 1_200_000, transactions, events };
}

function toEvent(id: string, source: "mock", prediction: EventPrediction): CalendarEvent {
  return {
    id,
    title: prediction.title,
    startDate: prediction.startDate,
    endDate: prediction.endDate,
    eventType: prediction.eventType,
    location: prediction.location,
    prediction,
    source,
  };
}
