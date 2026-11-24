import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClientOnly } from "@/components/layout/ClientOnly";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = {
  title: "설정",
};

/** 설정 탭: 예산·이름·데이터 관리 */
export default function SettingsPage() {
  return (
    <>
      <PageHeader title="설정" subtitle="예산과 데이터를 관리해요" />
      <ClientOnly>
        <SettingsView />
      </ClientOnly>
    </>
  );
}
