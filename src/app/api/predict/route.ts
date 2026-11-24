// POST /api/predict — 일정 문장을 받아 예상 지출을 돌려준다.
import type { PredictRequest } from "@/lib/types";
import { predictEvent } from "@/lib/predict";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 최소한의 모양 검사 (TODO: 필요하면 zod로 꼼꼼하게) */
function isPredictRequest(body: unknown): body is PredictRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  const history = b.history as Record<string, unknown> | undefined;
  return (
    typeof b.text === "string" &&
    b.text.trim().length > 0 &&
    b.text.length <= 300 &&
    typeof b.defaultDate === "string" &&
    DATE_RE.test(b.defaultDate) &&
    typeof b.today === "string" &&
    DATE_RE.test(b.today) &&
    typeof history === "object" &&
    history !== null &&
    Array.isArray(history.pastEvents) &&
    typeof history.dailyAverageByCategory === "object"
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON 본문이 필요해요" }, { status: 400 });
  }
  if (!isPredictRequest(body)) {
    return Response.json({ error: "text, defaultDate, today, history가 필요해요" }, { status: 400 });
  }
  return Response.json(await predictEvent(body));
}
