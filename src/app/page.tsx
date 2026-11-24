import { Suspense } from "react";
import { ClientOnly } from "@/components/layout/ClientOnly";
import { HomeScreen } from "@/components/home/HomeScreen";

// 홈: 이번 달 예산 요약 + 캘린더 + 고른 날의 일정·지출
export default function HomePage() {
  return (
    <ClientOnly>
      <Suspense>
        <HomeScreen />
      </Suspense>
    </ClientOnly>
  );
}
