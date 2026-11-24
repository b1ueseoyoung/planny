"use client";

import { useState } from "react";
import { readThemePreference, saveThemePreference, type ThemePreference } from "@/lib/theme";
import { Card, CardTitle } from "@/components/ui/Card";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "시스템" },
  { value: "dark", label: "다크" },
  { value: "light", label: "라이트" },
];

/** 화면 테마 고르기. 기본은 다크, '시스템'은 기기 설정을 따라간다 */
export function ThemeSection() {
  const [preference, setPreference] = useState<ThemePreference>(readThemePreference);

  function choose(next: ThemePreference) {
    setPreference(next);
    saveThemePreference(next);
  }

  return (
    <Card>
      <CardTitle>화면 테마</CardTitle>
      <div role="radiogroup" aria-label="화면 테마" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={preference === value}
            onClick={() => choose(value)}
            className={`h-10 rounded-xl text-sm font-semibold transition ${
              preference === value ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink-2"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">시스템을 고르면 휴대폰이나 컴퓨터의 다크 모드 설정을 따라가요.</p>
    </Card>
  );
}
