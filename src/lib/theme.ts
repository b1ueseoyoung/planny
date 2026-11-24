// 화면 테마(시스템, 다크, 라이트). 앱 데이터(AppData)와 따로 이 브라우저에만 저장한다.
// 그리기 전에 색을 맞추는 스크립트(THEME_INIT_SCRIPT)와 아래 함수들은 같은 규칙을 따라야 한다.

export type ThemePreference = "system" | "dark" | "light";
type ResolvedTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "planny:theme";
export const DEFAULT_THEME: ThemePreference = "dark";

/** 브라우저 상단 색 (viewport의 themeColor와 맞춘다) */
const THEME_COLOR: Record<ResolvedTheme, string> = { dark: "#0b0b0c", light: "#f4f4f1" };

export function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "system" || saved === "dark" || saved === "light") return saved;
  } catch {
    // 저장소를 못 쓰면 기본값
  }
  return DEFAULT_THEME;
}

/** '시스템'이면 기기 설정을 보고 실제로 쓸 테마를 정한다 */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference);
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}

export function saveThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // 저장 실패해도 지금 화면에는 적용한다
  }
  applyTheme(preference);
}

/** layout.tsx의 <head>에서 그리기 전에 실행한다 (처음 열 때 색이 깜빡이지 않게) */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(p!=="system"&&p!=="dark"&&p!=="light")p=${JSON.stringify(DEFAULT_THEME)};var t=p==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?${JSON.stringify(THEME_COLOR.light)}:${JSON.stringify(THEME_COLOR.dark)})}catch(e){}})()`;
