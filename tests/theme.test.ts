import { describe, expect, it } from "vitest";
import {
  DARK_THEME_COLOR,
  DEFAULT_THEME,
  isTheme,
  LIGHT_THEME_COLOR,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

describe("site theme defaults", () => {
  it("uses the Figma light palette by default", () => {
    expect(DEFAULT_THEME).toBe("light");
    expect(LIGHT_THEME_COLOR).toBe("#ffffff");
    expect(DARK_THEME_COLOR).toBe("#111318");
    expect(THEME_STORAGE_KEY).toBe("portfolio-theme");
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(false);
  });
});
