/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RadarProcessPanel } from "@/components/RadarProcessPanel";

describe("RadarProcessPanel", () => {
  it("documents the compliance-first personalized filtering pipeline", () => {
    render(<RadarProcessPanel />);
    for (const phase of ["Approve", "Collect", "Minimize", "Understand", "Measure", "Filter", "Display", "Expire", "Remove", "Observe"]) expect(screen.getByText(phase)).toBeTruthy();
    expect(screen.getByText("Policy gate")).toBeTruthy();
    expect(screen.getByText("Official X API")).toBeTruthy();
    expect(screen.getByText("Local ranker")).toBeTruthy();
    expect(screen.getByText("Quality gates")).toBeTruthy();
    expect(screen.getByText("Owner purge")).toBeTruthy();
    expect(screen.getByText(/refuses to call X until the revised conversation-analysis use case/i)).toBeTruthy();
    expect(screen.getByText(/never scraping or browser automation/i)).toBeTruthy();
    expect(screen.getByText(/not sent to an external AI provider/i)).toBeTruthy();
    expect(screen.getByText(/never used to train or fine-tune a model/i)).toBeTruthy();
    expect(screen.getByText(/Only the six best qualifying conversations/i)).toBeTruthy();
    expect(screen.getByText(/Skip results are withheld/i)).toBeTruthy();
    expect(screen.getByText(/full unmodified post text/i)).toBeTruthy();
    expect(screen.getByText(/removes X Content within 24 hours/i)).toBeTruthy();
    expect(screen.getByText(/one-way hash/i)).toBeTruthy();
    expect(screen.getByText("Opportunity Score weights")).toBeTruthy();
    for (const label of ["Personal fit", "Conversation opening", "Reply momentum", "Reply density", "Brevity", "View reach"]) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getAllByText("22%")).toHaveLength(3);
    expect(screen.getByText("14%")).toBeTruthy();
    expect(screen.getByText("12%")).toBeTruthy();
    expect(screen.getByText("8%")).toBeTruthy();
    expect(screen.queryByText("Author authority")).toBeNull();
    expect(screen.queryByText("Reply prep")).toBeNull();
  });
});
