"use client";

// TODO: 데이터 내보내기/가져오기 (JSON 파일)
// TODO: 여러 기기에서 쓰려면 서버 DB로 옮기기

import { RotateCcw } from "lucide-react";
import { useAppData } from "@/lib/store";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/** 저장된 데이터 요약 + 샘플 데이터로 초기화 */
export function DataSection({ onReset }: { onReset: () => void }) {
  const { data, resetToMock } = useAppData();

  function handleReset() {
    if (!window.confirm("저장된 데이터를 모두 지우고 샘플 데이터로 다시 시작할까요?\n되돌릴 수 없어요.")) return;
    resetToMock();
    onReset();
  }

  return (
    <Card>
      <CardTitle>데이터</CardTitle>
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-surface-2 p-4">
          <dt className="text-xs text-muted">소비 내역</dt>
          <dd className="mt-1 text-lg font-bold text-ink">{data.transactions.length.toLocaleString("ko-KR")}건</dd>
        </div>
        <div className="rounded-2xl bg-surface-2 p-4">
          <dt className="text-xs text-muted">일정</dt>
          <dd className="mt-1 text-lg font-bold text-ink">{data.events.length.toLocaleString("ko-KR")}개</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted">데이터는 지금 쓰는 브라우저에만 저장돼요.</p>
      <Button variant="secondary" full className="mt-4" onClick={handleReset}>
        <RotateCcw size={16} aria-hidden />
        샘플 데이터로 초기화
      </Button>
    </Card>
  );
}
