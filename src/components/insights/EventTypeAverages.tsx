import type { InsightReport } from "@/lib/insights";
import { EVENT_TYPE_LABEL } from "@/lib/categories";
import { formatWon } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui/Card";

/** 지난 일정의 종류별 평균 실제 지출 (새 일정 예측의 기준이 되는 값) */
export function EventTypeAverages({ report }: { report: InsightReport }) {
  return (
    <Card>
      <CardTitle>일정마다 얼마나 쓸까</CardTitle>
      {report.eventTypes.length === 0 ? (
        <p className="py-2 text-sm text-muted">아직 실제 지출이 연결된 지난 일정이 없어요</p>
      ) : (
        <ul className="divide-y divide-line">
          {report.eventTypes.map((e) => (
            <li key={e.eventType} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <span>
                {EVENT_TYPE_LABEL[e.eventType]}
                <span className="text-muted"> · {e.count}번</span>
              </span>
              <span className="font-semibold tabular-nums">평균 {formatWon(e.average)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">새 일정의 예상 지출을 잡을 때 이 평균을 참고해요</p>
    </Card>
  );
}
