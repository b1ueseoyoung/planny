"use client";

import { useLayoutEffect } from "react";
import { applyTheme, readThemePreference } from "@/lib/theme";

/**
 * 저장된 테마를 <html>에 다시 적용하고, '시스템'이면 기기 설정이 바뀔 때 따라간다.
 * 개발 모드(Strict Mode)는 다시 마운트할 때 <head> 스크립트가 붙인 data-theme를 지워서 여기서 다시 붙인다.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme(readThemePreference());
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (readThemePreference() === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return null;
}
