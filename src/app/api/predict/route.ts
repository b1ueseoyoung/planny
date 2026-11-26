// POST /api/predict — 일정 문장을 받아 예상 지출을 돌려준다.
import { predictEvent } from "@/lib/predict";
import { MAX_BODY_BYTES, parsePredictRequest } from "@/lib/predict/request";

export async function POST(request: Request) {
  // 너무 큰 본문은 읽기 전에 거른다 (Content-Length가 없거나 거짓이면 아래에서 한 번 더 본다)
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_BODY_BYTES) {
    return Response.json({ error: "요청 본문이 너무 커요" }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return Response.json({ error: "요청 본문을 읽지 못했어요" }, { status: 400 });
  }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return Response.json({ error: "요청 본문이 너무 커요" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "JSON 본문이 필요해요" }, { status: 400 });
  }

  const parsed = parsePredictRequest(body);
  if (!parsed.ok) {
    return Response.json({ error: "요청 형식이 올바르지 않아요", details: parsed.errors }, { status: 400 });
  }
  return Response.json(await predictEvent(parsed.data));
}
