"use client";

import type { ReactNode } from "react";
import { useIsClient } from "@/lib/store";

/**
 * 앱 데이터(localStorage)나 오늘 날짜를 쓰는 화면을 감싼다.
 * 서버와 첫 화면에선 fallback(뼈대)만 그리고, 브라우저에 올라온 뒤 진짜 화면을 그린다.
 */
export function ClientOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return useIsClient() ? children : (fallback ?? <ScreenSkeleton />);
}

export function ScreenSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-5" aria-busy="true" aria-label="불러오는 중">
      <div className="h-8 w-32 animate-pulse rounded-lg bg-surface-2" />
      <div className="h-44 animate-pulse rounded-3xl bg-surface-2" />
      <div className="h-80 animate-pulse rounded-3xl bg-surface-2" />
    </div>
  );
}
