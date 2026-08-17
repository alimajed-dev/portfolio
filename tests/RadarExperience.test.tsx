/** @vitest-environment jsdom */
import { cleanup, render, screen, within } from "@testing-library/react";
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
    expect(screen.getByText(/ranked for my fit: higher scores signal stronger reach, active interaction, and more room for me to add value/i)).toBeTruthy();
    expect(row?.className.split(" ")).toContain("items-start");
    expect(screen.queryByText("Why reply")).toBeNull();
    expect(screen.queryByText("Angle:")).toBeNull();
    await user.click(screen.getByLabelText(/Explain score .* for Engineer/));
    const dialog = screen.getByRole("dialog", { name: "Score breakdown" });
    expect(within(dialog).getByText("What drives this score")).toBeTruthy();
    expect(within(dialog).getByText("View reach")).toBeTruthy();
    expect(within(dialog).getByText("Author authority")).toBeTruthy();
    expect(screen.getByText("/100")).toBeTruthy();
    expect(screen.getByText(/Last scan .*(?:UTC|GMT(?:[+-]\d+)?)/)).toBeTruthy();
    expect(screen.queryByText("Skip")).toBeNull();
    expect(screen.queryByText(/Green:/)).toBeNull();
    expect(screen.queryByText("Sort by")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("Open on X")).toBeTruthy();
    expect(screen.getByText("Copy reply prompt")).toBeTruthy();
  });

  it("copies a concise contextual reply-writing prompt without another API request", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const apiFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      posts: [{ id: "p1", text: "A concrete AI engineering trade-off", createdAt: "2026-08-17T12:00:00Z", author: { id: "a1", name: "Engineer", username: "engineer" }, metrics: { likes: 20, replies: 4, reposts: 2, quotes: 1, impressions: 1000 }, opportunityScore: 72, label: "Check", signals: { relevance: 80, abilityToAddValue: 75, audienceValue: 60, engagement: 55, reach: 70, velocity: 65, freshness: 90, whyReply: "Useful", suggestedAngle: "Add context" }, whyReply: "Useful", suggestedAngle: "Add context", url: "https://x.com/engineer/status/p1" }],
      lastRefreshedAt: "2026-08-17T12:00:00Z", nextRefreshAt: "2026-08-17T16:00:00Z", source: "x", stats: { scanned: 1, rejected: 0, opportunities: 1 }, manualRefresh: { enabled: false, manualRemaining: 50, manualLimit: 50 },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", apiFetch);

    render(<RadarExperience />);
    await user.click(await screen.findByRole("button", { name: /Copy a reply prompt/ }));
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain("strongest replies, and relevant quote posts");
    expect(writeText.mock.calls[0][0]).toContain("40–80 words");
    expect(writeText.mock.calls[0][0]).toContain("Sound human, not AI-generated");
    expect(apiFetch).toHaveBeenCalledOnce();
  });
});
