// AI 프롬프트에 넣는 예시 (few-shot). SYSTEM_PROMPT의 규칙 중 AI가 자주 헷갈리는 것을 하나씩 보여준다.
// 예시는 응답 스키마(UnderstoodEventRaw)와 같은 모양이라 필드가 바뀌면 여기서 타입 오류가 난다.
// 금액은 2026년 한국 물가 기준 대략값이다. 고칠 땐 notes의 설명과 숫자가 맞는지도 같이 본다.
import { formatDateKo } from "../date";
import type { UnderstoodEventRaw } from "./schema";

interface PromptExample {
  /** 예시 속 '오늘'. 상대 날짜("이번 주 토요일")를 어떻게 바꾸는지 보여주려고 고정한다 (2026-11-26은 목요일) */
  today: string;
  defaultDate: string;
  text: string;
  output: UnderstoodEventRaw;
}

export const PROMPT_EXAMPLES: PromptExample[] = [
  // payer "me": 내가 쏘면 다른 사람 몫까지 넣는다. 사람 이름에서 조사·'이'를 뗀다.
  {
    today: "2026-11-26",
    defaultDate: "2026-11-26",
    text: "토요일에 채연이랑 민수 생일이라 홍대에서 내가 쏜다",
    output: {
      title: "민수 생일 모임",
      startDate: "2026-11-28",
      endDate: "2026-11-28",
      eventType: "friends",
      location: "홍대",
      people: ["채연", "민수"],
      headcount: 3,
      payer: "me",
      items: [
        { category: "meal", label: "저녁 식사 3인", estimate: 90000 },
        { category: "gift", label: "생일 케이크", estimate: 35000 },
        { category: "cafe", label: "카페", estimate: 20000 },
      ],
      notes: ["내가 쏘는 자리라 3명 몫을 다 넣었어요", "홍대 저녁은 1인 3만원쯤이에요"],
      savingTips: [{ label: "케이크 대신 조각 케이크로", amount: 20000 }],
    },
  },
  // payer "others": 회사가 내는 회식도 2차·귀가 교통처럼 본인이 낼 것은 넣는다. 묶음 말(팀원들)은 people에 넣지 않는다.
  {
    today: "2026-11-26",
    defaultDate: "2026-11-26",
    text: "다음 주 금요일 팀원들이랑 회식, 1차는 법카고 2차는 각자",
    output: {
      title: "팀 회식",
      startDate: "2026-12-04",
      endDate: "2026-12-04",
      eventType: "work",
      location: null,
      people: [],
      headcount: null,
      payer: "others",
      items: [
        { category: "meal", label: "2차 개인 부담", estimate: 25000 },
        { category: "transport", label: "귀가 택시", estimate: 18000 },
      ],
      notes: ["1차는 법카라 넣지 않았어요", "2차와 늦은 귀가 택시비만 잡았어요"],
      savingTips: [{ label: "2차 건너뛰고 지하철로 귀가", amount: 40000 }],
    },
  },
  // 여러 날 여행: endDate는 마지막 날. "친구 셋"은 이름이 아니라 people은 비우고 headcount에 본인 포함 4를 넣는다. 나눠 내는 항목은 본인 몫만 넣고, 숙박·교통처럼 큰 항목을 빠뜨리지 않는다.
  {
    today: "2026-11-26",
    defaultDate: "2026-11-26",
    text: "12월 19일부터 2박 3일 친구 셋이랑 제주도 여행, 숙소랑 렌터카는 n빵",
    output: {
      title: "제주도 여행",
      startDate: "2026-12-19",
      endDate: "2026-12-21",
      eventType: "travel",
      location: "제주도",
      people: [],
      headcount: 4,
      payer: "split",
      items: [
        { category: "transport", label: "왕복 항공권", estimate: 120000 },
        { category: "lodging", label: "숙소 2박 (내 몫)", estimate: 100000 },
        { category: "transport", label: "렌터카·주유 (내 몫)", estimate: 50000 },
        { category: "meal", label: "식비 3일", estimate: 150000 },
        { category: "culture", label: "관광·입장료", estimate: 30000 },
      ],
      notes: ["숙소와 렌터카는 4명이 나눈다고 보고 내 몫만 잡았어요", "12월 주말 제주 항공권은 왕복 12만원쯤이에요"],
      savingTips: [
        { label: "평일 출발 항공권으로", amount: 40000 },
        { label: "저녁 한 번은 숙소에서 해 먹기", amount: 30000 },
      ],
    },
  },
  // 문장에 날짜가 없으면 기본 날짜. 혼자 내는 경조사는 payer "unknown", 축의금 같은 큰 항목을 빠뜨리지 않는다.
  {
    today: "2026-11-26",
    defaultDate: "2026-12-12",
    text: "민지 결혼식",
    output: {
      title: "민지 결혼식",
      startDate: "2026-12-12",
      endDate: "2026-12-12",
      eventType: "other",
      location: null,
      people: ["민지"],
      headcount: null,
      payer: "unknown",
      items: [
        { category: "gift", label: "축의금", estimate: 100000 },
        { category: "transport", label: "왕복 교통", estimate: 10000 },
      ],
      notes: ["친한 친구 축의금은 보통 10만원이에요", "식사는 예식장에서 해서 따로 넣지 않았어요"],
      savingTips: [],
    },
  },
];

/** 예시를 프롬프트 글로 바꾼다. 실제 사용자 메시지와 같은 줄 형식(buildUserMessage)을 따른다 */
export function formatPromptExamples(): string {
  return PROMPT_EXAMPLES.map((example, i) =>
    [
      `예시 ${i + 1}`,
      `오늘: ${example.today} (${formatDateKo(example.today)})`,
      `기본 날짜: ${example.defaultDate}`,
      `일정: ${example.text}`,
      `답: ${JSON.stringify(example.output)}`,
    ].join("\n"),
  ).join("\n\n");
}
