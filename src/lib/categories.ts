import type { Category, EventType } from "./types";

export const CATEGORY_LABEL: Record<Category, string> = {
  meal: "식사",
  cafe: "카페·간식",
  delivery: "배달",
  grocery: "장보기·편의점",
  transport: "교통",
  lodging: "숙박",
  shopping: "쇼핑",
  culture: "문화·여가",
  gift: "선물·경조사",
  subscription: "정기결제",
  etc: "기타",
};

/** 시뮬레이션에서 줄여볼 수 있는 카테고리 (고정비·필수 지출 제외) */
export const ADJUSTABLE_CATEGORIES: Category[] = ["delivery", "cafe", "shopping", "meal", "culture"];

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  friends: "친구 모임",
  date: "데이트",
  travel: "여행",
  performance: "공연·전시",
  work: "회사·회식",
  family: "가족",
  other: "기타",
};
