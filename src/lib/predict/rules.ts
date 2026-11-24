// AI 없이 규칙(키워드)으로 일정 문장을 이해한다. 브라우저·서버 양쪽에서 쓴다 (Node 전용 API 쓰지 않기).
// AI 키가 없거나 AI가 실패할 때, 서버에 닿지 못할 때 대신 쓰인다.
// 한계: 미리 넣어 둔 표현만 알아들어요. 처음 보는 표현은 AI(gemini.ts·claude.ts)가 맡는 게 기본이에요.
import type { Category, EventType, ISODate, PredictRequest } from "../types";
import { addDays, addMonths, dayOfWeek, monthKey, parseISODate, toISODate } from "../date";
import type { Payer, UnderstoodEvent } from "./types";
import { cleanPeople } from "./people";

type Item = UnderstoodEvent["items"][number];

const WEEKDAY: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
const WEEK_OFFSET: Record<string, number> = { 이번: 0, 다음: 7, 다다음: 14 };
const DAY_WORD: Record<string, number> = { 오늘: 0, 내일: 1, 모레: 2 };
const COUNT_WORD: Record<string, number> = { 둘: 2, 셋: 3, 넷: 4, 다섯: 5, 여섯: 6 };

/** 장소 키워드. trip = 왕복 교통비, lodging = 1박 숙소비, flight = 비행기로 가는 곳 */
const PLACES: { key: string; name: string; trip?: number; lodging?: number; flight?: boolean }[] = [
  { key: "부산", name: "부산", trip: 120_000 },
  { key: "제주", name: "제주", trip: 150_000, flight: true },
  { key: "강릉", name: "강릉", trip: 55_000 },
  { key: "속초", name: "속초", trip: 50_000 },
  { key: "여수", name: "여수", trip: 100_000 },
  { key: "경주", name: "경주", trip: 100_000 },
  { key: "전주", name: "전주", trip: 70_000 },
  { key: "대구", name: "대구", trip: 90_000 },
  { key: "대전", name: "대전", trip: 50_000 },
  { key: "가평", name: "가평", trip: 30_000 },
  { key: "도쿄", name: "도쿄", trip: 350_000, lodging: 150_000, flight: true },
  { key: "오사카", name: "오사카", trip: 300_000, lodging: 120_000, flight: true },
  { key: "후쿠오카", name: "후쿠오카", trip: 250_000, lodging: 110_000, flight: true },
  { key: "방콕", name: "방콕", trip: 450_000, lodging: 80_000, flight: true },
  { key: "다낭", name: "다낭", trip: 400_000, lodging: 80_000, flight: true },
  { key: "파리", name: "파리", trip: 1_300_000, lodging: 250_000, flight: true },
  { key: "뉴욕", name: "뉴욕", trip: 1_500_000, lodging: 300_000, flight: true },
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

/** 경조사처럼 정해진 큰 항목이 있는 일정 */
const SPECIAL: { re: RegExp; type: EventType; items: Item[]; note: string }[] = [
  {
    re: /결혼식|웨딩/,
    type: "other",
    items: [
      { category: "gift", label: "축의금", estimate: 100_000 },
      { category: "transport", label: "교통", estimate: 8_000 },
    ],
    note: "축의금은 보통 5~10만원이에요",
  },
  {
    re: /장례식|조문|빈소/,
    type: "other",
    items: [
      { category: "gift", label: "조의금", estimate: 100_000 },
      { category: "transport", label: "교통", estimate: 10_000 },
    ],
    note: "조의금은 보통 5~10만원이에요",
  },
  {
    re: /돌잔치/,
    type: "family",
    items: [
      { category: "gift", label: "돌 축하금·선물", estimate: 100_000 },
      { category: "transport", label: "교통", estimate: 8_000 },
    ],
    note: "돌잔치 축하금은 보통 5~10만원이에요",
  },
];

/** 위에서부터 먼저 걸리는 종류로 정한다 */
const TYPE_KEYWORDS: [EventType, RegExp][] = [
  ["travel", /여행|\d+\s*박|당일치기|휴가|트립/],
  ["date", /데이트|남친|여친|남자친구|여자친구|애인|기념일/],
  ["performance", /콘서트|공연|뮤지컬|연극|전시|페스티벌|팬미팅|영화/],
  ["work", /회식|워크숍|출장|송년회|송별회|환송회|팀\s*모임|팀장/],
  ["family", /가족|부모님|엄마|아빠|할머니|할아버지|동생|명절|생신/],
  ["friends", /친구|모임|동기|약속|생일|파티|술|동창|오마카세/],
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

/** "채연이랑", "민지랑" → 채연, 민지 */
function detectPeople(text: string): string[] {
  return cleanPeople([...text.matchAll(/([가-힣]{2,3}?)이?랑/g)].map((match) => match[1]));
}

/** "4명", "넷이서" → 인원. 없으면 이름이 나온 사람 수 + 본인 */
function detectHeadcount(text: string, people: string[]): number | null {
  const number = text.match(/(\d+)\s*명/);
  if (number) return Number(number[1]);
  const word = text.match(/(둘|셋|넷|다섯|여섯)이서/);
  if (word) return COUNT_WORD[word[1]];
  return people.length > 0 ? people.length + 1 : null;
}

function detectPayer(text: string): Payer {
  if (/내가\s*(쏘|쏜|살게|낼게|사기로|내기로)|쏘기로|한턱/.test(text)) return "me";
  if (/얻어먹|사준대|사주기로|법카|법인\s*카드|회사\s*카드/.test(text)) return "others";
  if (/더치|엔빵|[nN]빵|나눠\s*(내|서)|각자\s*(내|계산)/.test(text)) return "split";
  return "unknown";
}

/** 종류별 기본 항목 (1인 기준) */
function baseItems(type: EventType, text: string): Item[] {
  const has = (re: RegExp) => re.test(text);
  const item = (category: Category, label: string, estimate: number): Item => ({ category, label, estimate });
  switch (type) {
    case "friends": {
      const fancy = has(/오마카세|파인다이닝|코스\s*요리/);
      const drinks = has(/술|2차|포차/);
      return [
        item("meal", fancy ? "오마카세" : drinks ? "식사·술자리" : "식사", fancy ? 120_000 : drinks ? 40_000 : 30_000),
        ...(fancy ? [] : [item("cafe", "카페", 9_000)]),
        item("transport", "교통", 6_000),
        ...(has(/생일/) ? [item("gift", "생일 선물", 20_000)] : []),
      ];
    }
    case "date":
      return [
        item("meal", "식사", 40_000),
        item("cafe", "카페", 12_000),
        item("transport", "교통", 8_000),
        ...(has(/영화|전시|공연/) ? [item("culture", "영화·전시", 25_000)] : []),
      ];
    case "performance": {
      const big = has(/콘서트|팬미팅|뮤지컬/);
      return [
        item("culture", "티켓", big ? 132_000 : has(/영화/) ? 15_000 : 20_000),
        item("meal", "식사", 15_000),
        item("transport", "교통", 5_000),
        ...(has(/콘서트|팬미팅/) ? [item("shopping", "굿즈", 30_000)] : []),
      ];
    }
    case "work":
      return [item("meal", "2차·개인 부담", 15_000), item("transport", "귀가 택시", 15_000)];
    case "family":
      return [
        item("meal", "가족 외식", 35_000),
        item("transport", "교통", 10_000),
        ...(has(/생신|명절|용돈/) ? [item("gift", "선물·용돈", 50_000)] : []),
      ];
    default:
      return [item("meal", "식사", 15_000), item("transport", "교통", 5_000)];
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function understandByRules(req: PredictRequest): UnderstoodEvent {
  const text = req.text.trim();
  const { nights, phrase: nightsPhrase } = parseNights(text);
  // "2박 3일"의 "3일"을 날짜로 읽지 않도록 기간 표현을 빼고 날짜를 찾는다
  const { date, phrase: datePhrase } = parseStartDate(nightsPhrase ? text.replace(nightsPhrase, " ") : text, req.today);
  const startDate = date ?? req.defaultDate;
  const special = SPECIAL.find((s) => s.re.test(text));
  const people = detectPeople(text);
  // 종류 키워드가 없어도 같이 만나는 사람 이름이 나오면 친구 모임으로 본다
  const type: EventType =
    special?.type ?? TYPE_KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? (people.length > 0 ? "friends" : "other");
  const place = PLACES.find((p) => text.includes(p.key)) ?? null;
  const headcount = detectHeadcount(text, people);
  const payer = detectPayer(text);
  const notes: string[] = [];
  const savingTips: UnderstoodEvent["savingTips"] = [];
  let items: Item[];

  if (special) {
    items = special.items;
    notes.push(special.note);
  } else if (type === "travel") {
    const days = nights + 1;
    const trip = place?.trip ?? 80_000;
    const lodging = place?.lodging ?? 90_000;
    items = [
      { category: "transport", label: place?.flight ? "왕복 항공권" : "왕복 교통", estimate: trip },
      ...(nights > 0 ? [{ category: "lodging" as const, label: `숙소 ${nights}박`, estimate: lodging * nights }] : []),
      { category: "meal", label: "식비", estimate: 30_000 * days + 20_000 },
      { category: "etc", label: "관광·기념품", estimate: 20_000 * days + 10_000 },
    ];
    notes.push(`${place?.name ?? "여행지"} ${place?.flight ? "왕복 항공권" : "왕복 교통비"} 약 ${Math.round(trip / 10_000)}만원으로 잡았어요`);
    if (!place?.flight && trip >= 50_000) savingTips.push({ label: "KTX 대신 고속버스 타기", amount: Math.round((trip * 0.4) / 1000) * 1000 });
    if (nights > 0) savingTips.push({ label: "게스트하우스로 숙소 바꾸기", amount: Math.round(lodging * 0.4) * nights });
  } else {
    items = baseItems(type, text);
    const cafe = items.find((i) => i.category === "cafe");
    if (cafe) savingTips.push({ label: "카페 대신 산책으로 마무리하기", amount: cafe.estimate });
  }

  if (payer === "me") {
    const count = headcount ?? 2;
    items = items.map((i) =>
      i.category === "meal" || i.category === "cafe" ? { ...i, label: `${i.label} (${count}명분)`, estimate: i.estimate * count } : i,
    );
    if (!headcount) notes.push("인원을 몰라서 2명분으로 잡았어요");
  }
  if (payer === "others") items = items.filter((i) => i.category !== "meal" && i.category !== "cafe");

  // 제목: 날짜 표현과 조사를 뺀 나머지
  let title = text;
  if (datePhrase) title = title.replace(new RegExp(`${escapeRegExp(datePhrase)}\\s*(부터|까지|에)?`), " ");
  title = title.replace(/\s+/g, " ").replace(/^[,\s]+|[,\s]+$/g, "").trim() || text;

  return {
    title,
    startDate,
    endDate: addDays(startDate, type === "travel" ? nights : 0),
    eventType: type,
    location: place?.name ?? null,
    people,
    headcount,
    payer,
    items,
    notes,
    savingTips,
  };
}
