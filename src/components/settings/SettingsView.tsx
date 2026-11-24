"use client";

import { useState } from "react";
import { BudgetForm } from "./BudgetForm";
import { ProfileForm } from "./ProfileForm";
import { DataSection } from "./DataSection";
import { ComingSoonList } from "./ComingSoonList";

export function SettingsView() {
  // 샘플 데이터로 초기화하면 입력칸도 새 값으로 다시 그리기 위한 키
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="space-y-4 px-5">
      <BudgetForm key={`budget-${formKey}`} />
      <ProfileForm key={`profile-${formKey}`} />
      <DataSection onReset={() => setFormKey((k) => k + 1)} />
      <ComingSoonList />
    </div>
  );
}
