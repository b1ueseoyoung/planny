import { Suspense } from "react";
import { ClientOnly } from "@/components/layout/ClientOnly";
import { NewEventScreen } from "@/components/events/NewEventScreen";

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
