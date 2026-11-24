import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClientOnly } from "@/components/layout/ClientOnly";
import { InsightsView } from "@/components/insights/InsightsView";

export const metadata: Metadata = {
  title: "소비 분석",
};

/** 분석 탭: 최근 소비 패턴 (카테고리·요일·자주 가는 곳·일정 종류별) */
export default function InsightsPage() {
  return (
    <>
      <PageHeader title="소비 분석" subtitle="최근 30일 동안 어디에, 언제 썼는지 보여줘요" />
      <ClientOnly>
        <InsightsView />
      </ClientOnly>
    </>
  );
}
