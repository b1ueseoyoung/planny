import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

// Wanted Sans (OFL-1.1, 라이선스 전문은 fonts/WantedSans-OFL.txt)
const wantedSans = localFont({
  src: "./fonts/WantedSansVariable.woff2",
  variable: "--font-wanted-sans",
  weight: "400 1000",
  display: "swap",
});

export const metadata: Metadata = {
  // 페이지마다 title: "설정" 처럼만 쓰면 "설정 | Planny"가 된다
  title: { default: "Planny", template: "%s | Planny" },
  applicationName: "Planny",
  description: "일정을 넣으면 AI가 예상 지출과 이번 달 예산에 미치는 영향을 알려주는 미래 소비 캘린더",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme은 <head> 스크립트가 저장된 테마로 바꾸므로 suppressHydrationWarning이 필요하다
    <html
      lang="ko"
      data-theme="dark"
      suppressHydrationWarning
      className={`${wantedSans.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-page font-sans text-ink">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
