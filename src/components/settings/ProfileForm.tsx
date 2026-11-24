"use client";

import { useState } from "react";
import { useAppData } from "@/lib/store";
import { Card, CardTitle } from "@/components/ui/Card";

/** 화면에 보이는 이름. 비워 두면 '나'로 저장된다. */
export function ProfileForm() {
  const { data, setUserName } = useAppData();
  const [draft, setDraft] = useState(data.userName);

  function update(value: string) {
    setDraft(value);
    setUserName(value.trim() || "나");
  }

  return (
    <Card>
      <CardTitle>이름</CardTitle>
      <label htmlFor="user-name" className="sr-only">
        이름
      </label>
      <input
        id="user-name"
        value={draft}
        maxLength={20}
        onChange={(e) => update(e.target.value)}
        placeholder="나"
        className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-base font-medium text-ink outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-primary"
      />
      <p className="mt-2 text-xs text-muted">화면에 보이는 이름이에요. 비워 두면 ‘나’로 보여요.</p>
    </Card>
  );
}
