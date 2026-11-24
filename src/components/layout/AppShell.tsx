"use client";

import type { ReactNode } from "react";
import { AppDataProvider } from "@/lib/store";
import { BottomNav } from "./BottomNav";
import { ThemeSync } from "./ThemeSync";

/** 모바일 화면 폭(440px)의 앱 틀. 데스크톱에서는 가운데 폰 화면처럼 보인다. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-page sm:border-x sm:border-line">
      <ThemeSync />
      <AppDataProvider>
        <main className="flex-1 pb-28">{children}</main>
      </AppDataProvider>
      <BottomNav />
    </div>
  );
}
