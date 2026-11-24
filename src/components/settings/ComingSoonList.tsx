// 아직 만들지 않은 기능 자리. 하나씩 만들면 이 목록에서 빼고 진짜 설정으로 바꾸면 된다.
// TODO: 카드 내역 CSV 가져오기 → 카드사별 양식 파서 만들고 Transaction으로 변환
// TODO: 고정 지출 관리 → 정기결제 타입을 추가하고 forecast에서 결제일 기준으로 반영
// TODO: AI 연결 상태 → GET /api/status 같은 라우트로 키 설정 여부를 받아 보여주기

import { FileSpreadsheet, Repeat, Sparkles, type LucideIcon } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";

const ITEMS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: FileSpreadsheet,
    title: "카드 내역 CSV 가져오기",
    description: "카드사·은행 앱에서 받은 내역 파일을 올리면 소비 기록으로 바꿔 줘요.",
  },
  {
    icon: Repeat,
    title: "고정 지출(월세·구독) 관리",
    description: "매달 같은 날 나가는 돈을 따로 등록해서 예측을 더 정확하게 해요.",
  },
  {
    icon: Sparkles,
    title: "AI 연결 상태",
    description:
      "프로젝트 폴더의 .env.local에 ANTHROPIC_API_KEY를 넣으면 목업 대신 실제 AI가 일정 비용을 예측해요.",
  },
];

export function ComingSoonList() {
  return (
    <Card>
      <CardTitle>준비 중인 기능</CardTitle>
      <ul className="divide-y divide-line">
        {ITEMS.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
              <Icon size={18} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] font-semibold text-ink">{title}</p>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                  준비 중
                </span>
              </div>
              <p className="mt-0.5 text-sm text-ink-2">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
