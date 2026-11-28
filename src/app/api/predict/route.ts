// POST /api/predict — 일정 문장을 받아 예상 지출을 돌려준다.
import { predictEvent } from "@/lib/predict";
import { MAX_BODY_BYTES, parsePredictRequest } from "@/lib/predict/request";

export async function POST(request: Request) {
  // 너무 큰 본문은 읽기 전에 거른다 (Content-Length가 없거나 거짓이면 아래에서 한 번 더 본다)
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_BODY_BYTES) {
    return Response.json({ error: "요청 본문이 너무 커요" }, { status: 413 });
  }

  // Content-Length가 없거나 거짓이어도 한도를 넘으면 즉시 읽기를 멈춘다.
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BODY_BYTES) {
          await reader.cancel().catch(() => undefined);
          return Response.json({ error: "요청 본문이 너무 커요" }, { status: 413 });
        }
        chunks.push(value);
      }
    } catch {
      return Response.json({ error: "요청 본문을 읽지 못했어요" }, { status: 400 });
    } finally {
      reader.releaseLock();
    }
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const raw = new TextDecoder().decode(buffer);

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
