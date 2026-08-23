/** @vitest-environment jsdom */
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildReplyPrompt, formatRadarCountdown, RadarExperience } from "@/components/experiences/RadarExperience";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const rankedPost = {
  id: "123", text: "Should @engineer always review #AgentCode?", createdAt: "2026-08-19T08:00:00Z",
  entities: [
    { start: 7, end: 16, kind: "mention", value: "engineer", href: "https://x.com/engineer" },
    { start: 31, end: 41, kind: "hashtag", value: "AgentCode", href: "https://x.com/hashtag/AgentCode" },
  ],
  author: { id: "456", name: "Engineer", username: "engineer", profileImageUrl: "https://example.com/avatar.jpg" },
  metrics: { likes: 140, replies: 35, reposts: 10, quotes: 3, bookmarks: 8, impressions: 8_000 },
  opportunityScore: 88, label: "Check", exceptionalTrend: false,
  signals: { personalFit: 94, conversationOpening: 96, brevity: 100, momentum: 90, replyDensity: 72, reach: 78, whyReply: "Useful", suggestedAngle: "Add context" },
  whyReply: "A direct question creates an explicit opening. 35 replies at about 8/hour.",
  suggestedAngle: "Explain the review trade-off.", url: "https://x.com/engineer/status/123",
};

function response(posts: unknown[] = [], manualRemaining = 50) {
  return new Response(JSON.stringify({
    posts, lastRefreshedAt: "2026-08-19T09:00:00Z", nextRefreshAt: "2026-08-29T09:00:00Z", source: "x",
    stats: { scanned: posts.length + 12, rejected: 12, opportunities: posts.length },
    manualRefresh: { enabled: true, manualRemaining, manualLimit: 50 },
  }), { status: 200, headers: { "content-type": "application/json" } });
}

describe("RadarExperience", () => {
  it("shows days for the retained ten-day automatic cadence", () => {
    const now = new Date("2026-08-19T00:00:00Z").getTime();
    expect(formatRadarCountdown(new Date(now + 240 * 3_600_000).toISOString(), now)).toBe("Next scan in 10 days 00:00:00");
    expect(formatRadarCountdown(new Date(now + 25 * 3_600_000).toISOString(), now)).toBe("Next scan in 1 day 01:00:00");
    expect(formatRadarCountdown("not-a-date", now)).toBe("Scheduling next scan…");
  });

  it("disables manual scanning when the persistent monthly allowance is exhausted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([], 0)));
    render(<RadarExperience />);
    expect((await screen.findByRole("button", { name: "Monthly manual scan limit reached" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("opens an owner-token modal from the compact refresh icon", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response()));
    render(<RadarExperience />);
    await user.click(await screen.findByRole("button", { name: "Run a manual scan" }));
    expect(screen.getByRole("dialog", { name: "Run a manual scan" })).toBeTruthy();
    expect(screen.getByLabelText("Owner token")).toBe(document.activeElement);
  });

  it("renders only qualifying posts with X-compliant attribution and full text", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([rankedPost])));
    render(<RadarExperience />);

    const text = await screen.findByText(/Should/);
    expect(text.className.split(" ")).not.toContain("line-clamp-5");
    expect(text.className.split(" ")).toContain("whitespace-pre-wrap");
    expect(screen.getByRole("heading", { name: "Best current conversations" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Engineer@engineer" }).getAttribute("href")).toBe("https://x.com/engineer");
    expect(screen.getByTitle("Open @engineer's X profile")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /View on X/ })).toBeNull();
    expect(screen.getByRole("img", { name: "X" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Engineer's post on X in a new tab" }).getAttribute("href")).toBe(rankedPost.url);
    expect(screen.getByTitle("Open post on X")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy a suggested reply prompt for Engineer's post" })).toBeTruthy();
    expect(screen.getByTitle("Copy suggested reply prompt")).toBeTruthy();
    expect(screen.queryByText("Suggest reply")).toBeNull();
    expect(screen.getByTitle("Explain opportunity score")).toBeTruthy();
    expect(screen.getByRole("link", { name: "#AgentCode" }).getAttribute("href")).toContain("/hashtag/AgentCode");
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent?.includes("12 withheld") === true)).toBeTruthy();

    await user.click(screen.getByLabelText(/Explain score .* for Engineer/));
    const dialog = screen.getByRole("dialog", { name: "Score breakdown" });
    expect(within(dialog).getByText("Personal fit")).toBeTruthy();
    expect(within(dialog).getByText("Conversation opening")).toBeTruthy();
    expect(within(dialog).getByText("Reply momentum")).toBeTruthy();
    expect(within(dialog).getByText("Reply density")).toBeTruthy();
    expect(within(dialog).getByText("Brevity")).toBeTruthy();
    expect(within(dialog).queryByText("Author authority")).toBeNull();
  });

  it("returns an honest empty state instead of displaying weak candidates", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));
    render(<RadarExperience />);
    expect(await screen.findByText("No conversation cleared the quality gates.")).toBeTruthy();
    expect(screen.getByText(/rather return nothing/i)).toBeTruthy();
  });

  it("builds a concise, contextual reply brief in Ali's voice", () => {
    const prompt = buildReplyPrompt(rankedPost as Parameters<typeof buildReplyPrompt>[0]);
    expect(prompt).toContain(rankedPost.url);
    expect(prompt).toContain(rankedPost.text);
    expect(prompt).toContain(rankedPost.suggestedAngle);
    expect(prompt).toContain(rankedPost.whyReply);
    expect(prompt).toContain("Write in my voice");
    expect(prompt).toContain("writing examples I have already shared");
    expect(prompt).toContain("concise, simple, direct, and human");
    expect(prompt).toContain("Return only the reply");
  });
});
