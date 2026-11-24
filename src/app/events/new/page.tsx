import { Suspense } from "react";
import type { Metadata } from "next";
import { ClientOnly } from "@/components/layout/ClientOnly";
import { NewEventScreen } from "@/components/events/NewEventScreen";

export const metadata: Metadata = {
  title: "일정 추가",
};

// 일정 추가: 문장 입력 → AI 예상 지출 → 예산 영향 확인 → 캘린더에 저장
export default function NewEventPage() {
  return (
    <ClientOnly>
      <Suspense>
        <NewEventScreen />
      </Suspense>
    </ClientOnly>
  );
}
