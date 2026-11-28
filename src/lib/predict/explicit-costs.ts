// 브라우저에서도 쓰는 순수 규칙. 항목을 명시한 본인 금액만 보존한다.
import type { UnderstoodEvent } from "./types";

type Item = UnderstoodEvent["items"][number];
const NUMBER = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
const WON = String.raw`(?:${NUMBER}\s*만(?:\s*${NUMBER}\s*천)?|${NUMBER}\s*천(?:\s*${NUMBER}\s*백)?|${NUMBER})\s*원`;
const PARTICLES = String.raw`\s*(?:은|는|이|가|을|를|:|=)?\s*`;
const FIELDS = [
  { subject: "축의금|축하금", category: "gift", label: /축의|축하금/ },
  { subject: "조의금|부의금", category: "gift", label: /조의|부의/ },
  { subject: "티켓값|티켓비|티켓|입장료|입장권|관람료|영화표|공연표", category: "culture", label: /티켓|입장|관람|영화|전시|공연/ },
] as const;

function parseWon(text: string): number | null {
  const units: Record<string, number> = { 만: 10000, 천: 1000, 백: 100 };
  const amount = [...text.replaceAll(",", "").matchAll(/(\d+(?:\.\d+)?)\s*(만|천|백)?/g)]
    .reduce((sum, part) => sum + Number(part[1]) * (part[2] ? units[part[2]] : 1), 0);
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= 100_000_000 ? amount : null;
}

/** 기본값을 만들고 결제 주체를 처리한 뒤 적용한다. 원본 항목 배열은 바꾸지 않는다. */
export function applyExplicitCosts(text: string, items: Item[]): Item[] {
  const clauses = text.split(/[,\n.!?](?!\d)/);
  return items.map((item) => {
    const field = FIELDS.find((f) => f.category === item.category && f.label.test(item.label));
    if (!field) return item;
    const values: number[] = [];
    for (const clause of clauses) {
      // 인당/총액/n빵은 내 부담액인지 불분명하다. 본인 몫이라고 적은 경우만 허용한다.
      const own = /내\s*(?:몫|티켓|입장|축의금|조의금|부의금)/.test(clause);
      if (!own && /인당|명당|1인|한\s*명|총|전체|합계|[nN]빵|더치|나눠/.test(clause)) continue;
      // 다른 사람 금액, 과거 금액, 부정/정정 문장을 확정값으로 오해하지 않는다.
      if (/(?:친구|동생|엄마|아빠|[가-힣]{2,3}의)\s*(?:티켓|축의금|조의금)/.test(clause) ||
          /아니|아닌|아님|아닙|말고|대신|였|이었|지난|할인|쿠폰|환불|환급|취소/.test(clause)) continue;
      if (/[~～]|원\s*(?:[-–]|대|부터|이상|이하|쯤|가량|정도)|사이/.test(clause)) continue;
      const pattern = new RegExp(`(?:${field.subject})${PARTICLES}(${WON})`, "g");
      for (const match of clause.matchAll(pattern)) {
        const amount = parseWon(match[1]);
        if (amount !== null) values.push(amount);
      }
      if (item.category === "culture" && (
        /(?:무료|공짜)\s*(?:입장|전시|공연|콘서트|영화|뮤지컬|관람)/.test(clause) ||
        new RegExp(`(?:${field.subject}|입장|전시|공연)${PARTICLES}(?:무료|공짜)(?!\\s*(?:배송|주차|음료|시음))`).test(clause)
      )) values.push(0);
    }
    // 상충하는 여러 금액은 임의로 하나를 고르지 않는다.
    const unique = [...new Set(values)];
    return unique.length === 1 ? { ...item, estimate: unique[0], amountSource: "user" } : item;
  });
}
