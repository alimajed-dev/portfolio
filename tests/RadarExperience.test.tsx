/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RadarExperience } from "@/components/experiences/RadarExperience";

afterEach(() => vi.unstubAllGlobals());

describe("RadarExperience manual scan control", () => {
  it("disables manual scanning when the persistent monthly allowance is exhausted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      posts: [], lastRefreshedAt: "2026-08-17T12:00:00Z", nextRefreshAt: "2026-08-17T16:00:00Z",
      source: "x", stats: { scanned: 0, rejected: 0, opportunities: 0 },
      manualRefresh: { enabled: true, manualRemaining: 0, manualLimit: 50 },
    }), { status: 200, headers: { "content-type": "application/json" } })));

    render(<RadarExperience />);
    const button = await screen.findByRole("button", { name: "Monthly limit reached" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("0/50 manual scans left this month")).toBeTruthy();
  });
});
