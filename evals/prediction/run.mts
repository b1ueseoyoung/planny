import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CASES } from "./cases";
import { scoreCase, summarize } from "./score";
import { understandByRules } from "../../src/lib/predict/rules";
import { understandWithGemini } from "../../src/lib/predict/gemini";
import { SYSTEM_PROMPT } from "../../src/lib/predict/schema";
import type { UnderstoodEvent } from "../../src/lib/predict/types";
import type { CaseResult, EvaluationCase } from "./types";

type Provider = "rules" | "gemini";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function parseArgs(args: string[]) {
  const values: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    if (!["--provider", "--limit", "--ids", "--out"].includes(flag) || !args[i + 1] || args[i + 1].startsWith("--") || values[flag]) {
      throw new Error(`알 수 없거나 잘못된 옵션: ${flag}`);
    }
    values[flag] = args[i + 1];
  }
  const provider = values["--provider"] ?? "rules";
  if (!["rules", "gemini", "both"].includes(provider)) throw new Error("provider는 rules, gemini, both 중 하나예요");
  const ids = values["--ids"]?.split(",");
  if (ids && (new Set(ids).size !== ids.length || ids.some((id) => !CASES.some((c) => c.id === id)))) throw new Error("존재하지 않거나 중복된 평가 문장 ID예요");
  const limit = values["--limit"] === undefined ? (provider === "rules" ? CASES.length : 3) : Number(values["--limit"]);
  if (!Number.isInteger(limit) || limit < 1 || limit > CASES.length) throw new Error(`limit은 1~${CASES.length} 사이 정수예요`);
  const examples = (ids ? ids.map((id) => CASES.find((c) => c.id === id)!) : CASES).slice(0, limit);
  return { provider: provider as Provider | "both", examples, out: values["--out"] };
}

function errorKind(error: unknown): string {
  // SDK 오류 메시지는 요청/키를 포함할 수 있어서 이름·HTTP 상태만 허용한다.
  if (typeof error === "object" && error !== null) {
    if ("status" in error && typeof error.status === "number") return `HTTP_${error.status}`;
    if ("name" in error && (error.name === "AbortError" || error.name === "TimeoutError")) return "TIMEOUT";
  }
  return "PROVIDER_ERROR";
}

export async function evaluate(examples: EvaluationCase[], provider: Provider,
  understand: (request: EvaluationCase["request"]) => UnderstoodEvent | Promise<UnderstoodEvent>,
  pause: () => Promise<void> = async () => undefined): Promise<CaseResult[]> {
  const results: CaseResult[] = [];
  let stopped = false;
  for (const example of examples) {
    const start = performance.now();
    if (stopped) {
      results.push({ id: example.id, group: example.group, provider, status: "skipped", durationMs: 0, passed: false, checks: [] });
      continue;
    }
    try {
      const output = await understand(example.request);
      const checks = scoreCase(example, output);
      results.push({ id: example.id, group: example.group, provider, status: "completed", durationMs: Math.round(performance.now() - start), passed: checks.length > 0 && checks.every((c) => c.passed), checks });
    } catch (error) {
      results.push({ id: example.id, group: example.group, provider, status: "error", durationMs: Math.round(performance.now() - start), passed: false, checks: [], errorKind: errorKind(error) });
      // 무료 사용량을 소모하며 계속 실패하지 않도록 첫 호출 오류에서 중단한다.
      stopped = true;
    }
    if (provider === "gemini" && !stopped && results.length < examples.length) await pause();
  }
  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const providers: Provider[] = options.provider === "both" ? ["rules", "gemini"] : [options.provider];
  if (providers.includes("gemini")) {
    const envPath = resolve(root, ".env.local");
    if (existsSync(envPath)) {
      const env = parseEnv(readFileSync(envPath, "utf8"));
      for (const key of ["GEMINI_API_KEY", "GEMINI_MODEL"]) {
        if (process.env[key] === undefined && env[key] !== undefined) process.env[key] = env[key];
      }
    }
    if (!process.env.GEMINI_API_KEY?.trim()) throw new Error("GEMINI_API_KEY가 없어요. .env.local에 설정해 주세요 (규칙 버전은 키가 필요 없어요).");
  }
  const results: Record<string, { summary: ReturnType<typeof summarize>; cases: CaseResult[] }> = {};
  for (const provider of providers) {
    console.log(`${provider}: ${options.examples.length}문장 평가 중`);
    // predictEvent는 호출 실패를 규칙으로 대체하므로 사용하지 않는다. Gemini 자체 결과만 평가한다.
    const cases = await evaluate(options.examples, provider, provider === "rules" ? understandByRules : understandWithGemini,
      () => new Promise((r) => setTimeout(r, 1500)));
    const summary = summarize(cases);
    results[provider] = { summary, cases };
    console.log(`${provider}: 문장 전체 통과 ${summary.passedCases}/${summary.totalCases}, 응답 ${summary.completed}, 오류 ${summary.errors}, 미실행 ${summary.skipped}`);
    console.log(`필드 점수(응답 완료분): ${summary.passedChecks}/${summary.totalChecks}`);
    for (const row of cases) if (!row.passed) console.log(`  ${row.id}: ${row.status === "completed" ? row.checks.filter((c) => !c.passed).map((c) => c.field).join(", ") : row.errorKind ?? row.status}`);
  }
  let commit: string | null = null;
  let workingTreeDirty: boolean | null = null;
  try { commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    workingTreeDirty = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim().length > 0; } catch { /* 배포된 코드 등 .git이 없으면 null */ }
  const report = {
    createdAt: new Date().toISOString(), commit, workingTreeDirty,
    suiteSha256: createHash("sha256").update(JSON.stringify(CASES)).digest("hex"),
    promptSha256: createHash("sha256").update(SYSTEM_PROMPT).digest("hex"),
    scope: "문장 이해 평가. 추정 시장가격의 정확도나 최종 예산 계산의 정확도를 보장하지 않음",
    geminiModelPolicy: providers.includes("gemini") ? { configuredFirstModel: process.env.GEMINI_MODEL || null, usesProductionFallbackChain: true } : null,
    caseIds: options.examples.map((c) => c.id), results,
  };
  const path = resolve(options.out ?? resolve(root, "evals/prediction/results", `${new Date().toISOString().replace(/[:.]/g, "-")}-${options.provider}.json`));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(report, null, 2) + "\n");
  console.log(`보고서: ${path}`);
  // 품질 오답은 측정값이다. 실행/호출 실패만 종료 코드 1로 구분한다.
  if (Object.values(results).some((r) => r.summary.errors > 0)) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => { console.error("평가 실행에 실패했어요. 옵션·GEMINI_API_KEY 설정을 확인해 주세요. 오류 본문과 키는 출력하지 않아요."); process.exitCode = 1; });
}
