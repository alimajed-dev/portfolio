/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RadarExperience } from "@/components/experiences/RadarExperience";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("RadarExperience manual scan control", () => {
  it("disables manual scanning when the persistent monthly allowance is exhausted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      posts: [], lastRefreshedAt: "2026-08-17T12:00:00Z", nextRefreshAt: "2026-08-17T16:00:00Z",
      source: "x", stats: { scanned: 0, rejected: 0, opportunities: 0 },
      manualRefresh: { enabled: true, manualRemaining: 0, manualLimit: 50 },
    }), { status: 200, headers: { "content-type": "application/json" } })));

    render(<RadarExperience />);
    const button = await screen.findByRole("button", { name: "Monthly manual scan limit reached" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens an owner-token modal from the compact refresh icon", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      posts: [], lastRefreshedAt: "2026-08-17T12:00:00Z", nextRefreshAt: "2026-08-17T16:00:00Z",
      source: "x", stats: { scanned: 0, rejected: 0, opportunities: 0 },
      manualRefresh: { enabled: true, manualRemaining: 50, manualLimit: 50 },
    }), { status: 200, headers: { "content-type": "application/json" } })));

    render(<RadarExperience />);
    await user.click(await screen.findByRole("button", { name: "Run a manual scan" }));
    expect(screen.getByRole("dialog", { name: "Run a manual scan" })).toBeTruthy();
    expect(screen.getByText("50/50 manual scans left this month")).toBeTruthy();
    expect(screen.getByLabelText("Owner token")).toBe(document.activeElement);
  });

  it("top-aligns every cell in a candidate row", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      posts: [{ id: "p1", text: "A technical discussion", createdAt: "2026-08-17T12:00:00Z", author: { id: "a1", name: "Engineer", username: "engineer" }, metrics: { likes: 1, replies: 1, reposts: 0, quotes: 0 }, opportunityScore: 30, label: "Skip", signals: { relevance: 60, abilityToAddValue: 60, audienceValue: 50, engagement: 20, reach: 0, velocity: 30, freshness: 90, whyReply: "Useful", suggestedAngle: "Add context" }, whyReply: "Useful", suggestedAngle: "Add context", url: "https://x.com/engineer/status/p1" }],
      lastRefreshedAt: "2026-08-17T12:00:00Z", nextRefreshAt: "2026-08-17T16:00:00Z", source: "x",
      stats: { scanned: 1, rejected: 0, opportunities: 1 }, manualRefresh: { enabled: false, manualRemaining: 50, manualLimit: 50 },
    }), { status: 200, headers: { "content-type": "application/json" } })));

    render(<RadarExperience />);
    const row = (await screen.findByText("A technical discussion")).closest("li");
    expect(row?.className.split(" ")).toContain("items-start");
    expect(screen.queryByText("Why reply")).toBeNull();
    expect(screen.queryByText("Angle:")).toBeNull();
    await user.click(screen.getByLabelText(/Explain score .* for Engineer/));
    const breakdown = screen.getByText("Score breakdown").closest("div");
    expect(breakdown?.className).toContain("col-span-full");
    expect(breakdown?.className).toContain("bg-panel");
    expect(screen.getByText("View reach")).toBeTruthy();
    expect(screen.queryByText("Skip")).toBeNull();
    expect(screen.queryByText(/Green:/)).toBeNull();
  });
});
