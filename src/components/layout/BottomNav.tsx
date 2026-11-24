"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartColumn, Settings, SlidersHorizontal } from "lucide-react";

const TABS = [
  { href: "/", label: "캘린더", icon: CalendarDays },
  { href: "/insights", label: "분석", icon: ChartColumn },
  { href: "/simulate", label: "조정", icon: SlidersHorizontal },
  { href: "/settings", label: "설정", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[440px] border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="grid grid-cols-4">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-medium ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
