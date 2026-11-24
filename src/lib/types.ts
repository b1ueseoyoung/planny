// 앱 전체에서 함께 쓰는 타입 (모듈 사이의 계약).
// 필드 이름을 바꾸면 이 타입을 쓰는 화면·로직이 함께 바뀌어야 하니, 바꿀 땐 같이 맞춰 주세요.

/** 'YYYY-MM-DD' 형식의 날짜 (시간대 없는 로컬 날짜) */
export type ISODate = string;
/** 'YYYY-MM' 형식의 월 */
export type MonthKey = string;

export const CATEGORIES = [
  "meal", // 식사(외식)
  "cafe", // 카페·간식
  "delivery", // 배달
  "grocery", // 장보기·편의점
  "transport", // 교통
  "lodging", // 숙박
  "shopping", // 쇼핑
  "culture", // 문화·여가
  "gift", // 선물·경조사
  "subscription", // 정기결제
  "etc", // 기타
] as const;
export type Category = (typeof CATEGORIES)[number];

export const EVENT_TYPES = [
  "friends", // 친구 모임
  "date", // 데이트
  "travel", // 여행
  "performance", // 공연·전시
  "work", // 회사·회식
  "family", // 가족
  "other", // 기타
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** 실제로 쓴 돈 한 건 */
export interface Transaction {
  id: string;
  date: ISODate;
  /** 원 단위, 항상 양수 */
  amount: number;
  category: Category;
  merchant: string;
  /** 일정 중에 쓴 돈이면 그 일정의 id */
  eventId?: string;
}

/** 예측된 지출 항목 하나 (예: 저녁 식사 32,000원) */
export interface PredictedItem {
  category: Category;
  label: string;
  amount: number;
}

/** AI(또는 목업)가 일정 문장을 보고 만든 예측 */
export interface EventPrediction {
  title: string;
  startDate: ISODate;
  /** 하루 일정이면 startDate와 같음 */
  endDate: ISODate;
  eventType: EventType;
  location: string | null;
  items: PredictedItem[];
  /** "지난 성수동 모임 3번 평균 47,000원"처럼 예측 근거 */
  reasons: string[];
  /** 이 일정에서 아낄 수 있는 방법 */
  savingTips: { label: string; amount: number }[];
}

export type PredictionSource = "ai" | "mock";

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: ISODate;
  endDate: ISODate;
  eventType: EventType;
  location: string | null;
  /** 다가오는 일정의 예상 비용. 지난 일정은 연결된 Transaction으로 실제 비용을 계산 */
  prediction: EventPrediction | null;
  source: PredictionSource | null;
}

/** 브라우저(localStorage)에 저장되는 앱 데이터 전체 */
export interface AppData {
  userName: string;
  /** 한 달 생활비 예산 (원) */
  budget: number;
  transactions: Transaction[];
  events: CalendarEvent[];
}

export type BudgetStatus = "safe" | "tight" | "over";

/** 한 달 예산 예측 결과 */
export interface MonthForecast {
  month: MonthKey;
  budget: number;
  /** 오늘까지 실제로 쓴 돈 */
  spent: number;
  /** 남은 기간 예상 생활비 (평소 소비 패턴 기준, 조정 반영 후) */
  routineProjected: number;
  /** 남은 일정들의 예상 비용 합 */
  eventsProjected: number;
  /** budget - (spent + routineProjected + eventsProjected) */
  projectedBalance: number;
  status: BudgetStatus;
  /** 남은 기간 예상 생활비를 카테고리별로 (조정 반영 전, 시뮬레이션 기준값) */
  routineByCategory: Partial<Record<Category, number>>;
}

/** 카테고리별로 줄여볼 비율 (0~1, 0.3이면 30% 줄이기) */
export type Adjustments = Partial<Record<Category, number>>;

/** 예산을 맞추기 위한 조정 제안 */
export interface Suggestion {
  category: Category;
  ratio: number;
  /** 이렇게 줄이면 아낄 수 있는 금액 */
  amount: number;
  /** "배달 30% 줄이기" */
  label: string;
}

/** AI 예측에 넘기는 과거 소비 요약 */
export interface HistorySummary {
  /** 카테고리별 하루 평균 지출 (일정 제외 평소 생활비) */
  dailyAverageByCategory: Partial<Record<Category, number>>;
  pastEvents: {
    id: string;
    title: string;
    startDate: ISODate;
    location: string | null;
    eventType: EventType;
    total: number;
    items: PredictedItem[];
  }[];
}

/** POST /api/predict 요청 본문 */
export interface PredictRequest {
  /** "다음 주 토요일 성수동 친구 모임" */
  text: string;
  /** 문장에 날짜가 없으면 쓸 날짜 (캘린더에서 고른 날) */
  defaultDate: ISODate;
  today: ISODate;
  history: HistorySummary;
}

/** POST /api/predict 응답 본문 */
export interface PredictResponse {
  prediction: EventPrediction;
  source: PredictionSource;
  /** "API 키가 없어 목업 예측을 보여줘요" 같은 안내, 없으면 null */
  notice: string | null;
}
