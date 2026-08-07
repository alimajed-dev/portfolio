/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.dataset.theme = "light";
});

afterEach(cleanup);

describe("ThemeToggle", () => {
  it("defaults to light and shows the moon action for switching to dark", () => {
    const { container } = render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeDefined();
    expect(container.querySelector(".lucide-moon")).not.toBeNull();
  });

  it("switches modes, swaps the icon action and remembers the choice", () => {
    const { container } = render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeDefined();
    expect(container.querySelector(".lucide-sun")).not.toBeNull();
  });

  it("restores a previously selected dark mode", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(<ThemeToggle />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeDefined(),
    );
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
