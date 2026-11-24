import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClientOnly } from "@/components/layout/ClientOnly";
import { SimulateView } from "@/components/simulate/SimulateView";

export const metadata: Metadata = {
  title: "소비 조정",
};

/** 조정 탭: 카테고리별로 줄여 보면 월말 잔액이 어떻게 바뀌는지 미리 보는 화면 */
export default function SimulatePage() {
  return (
    <>
      <PageHeader title="소비 조정" subtitle="줄여 보면 월말 잔액이 어떻게 바뀌는지 미리 볼 수 있어요" />
      {/* 앱 데이터는 브라우저에만 있어서 ClientOnly, ?month= 를 읽어서(useSearchParams) Suspense */}
      <ClientOnly fallback={<SimulateSkeleton />}>
        <Suspense fallback={<SimulateSkeleton />}>
          <SimulateView />
        </Suspense>
      </ClientOnly>
    </>
  );
}

function SimulateSkeleton() {
  return (
    <div className="space-y-4 px-5" aria-busy="true" aria-label="불러오는 중">
      <div className="h-12 animate-pulse rounded-2xl bg-surface-2" />
      <div className="h-48 animate-pulse rounded-3xl bg-surface-2" />
      <div className="h-64 animate-pulse rounded-3xl bg-surface-2" />
    </div>
  );
}
