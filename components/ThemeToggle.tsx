"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DARK_THEME_COLOR,
  DEFAULT_THEME,
  isTheme,
  LIGHT_THEME_COLOR,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.content = theme === "light" ? LIGHT_THEME_COLOR : DARK_THEME_COLOR;
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!isTheme(savedTheme)) return;
    const restore = window.setTimeout(() => {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  const targetTheme: Theme = theme === "light" ? "dark" : "light";
  const label = `Switch to ${targetTheme} mode`;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        setTheme(targetTheme);
        applyTheme(targetTheme);
        window.localStorage.setItem(THEME_STORAGE_KEY, targetTheme);
      }}
      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutral-600 transition-[background-color,color,transform] duration-150 hover:scale-105 hover:bg-panel hover:text-accent active:scale-95 lg:size-8"
    >
      {targetTheme === "dark" ? (
        <Moon size={17} strokeWidth={1.8} aria-hidden />
      ) : (
        <Sun size={17} strokeWidth={1.8} aria-hidden />
      )}
    </button>
  );
}
