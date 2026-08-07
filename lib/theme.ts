export const DEFAULT_THEME = "light" as const;
export const LIGHT_THEME_COLOR = "#ffffff" as const;
export const DARK_THEME_COLOR = "#111318" as const;
export const THEME_STORAGE_KEY = "portfolio-theme" as const;

export type Theme = "light" | "dark";

export function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}
