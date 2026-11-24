import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

/** 화면 상단 제목줄. backHref가 있으면 뒤로가기 버튼을 보여준다. */
export function PageHeader({
  title,
  subtitle,
  backHref,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  backHref?: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-page/90 px-5 pb-3 pt-5 backdrop-blur">
      {backHref && (
        <Link
          href={backHref}
          aria-label="뒤로"
          className="-ml-2 grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
        >
          <ChevronLeft size={24} aria-hidden />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
