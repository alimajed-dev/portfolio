/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RadarProcessPanel } from "@/components/RadarProcessPanel";

describe("RadarProcessPanel", () => {
  it("explains the hybrid ranking pipeline and weights", () => {
    render(<RadarProcessPanel />);
    expect(screen.getByText("Collect")).toBeTruthy();
    expect(screen.getByText("Understand")).toBeTruthy();
    expect(screen.getByText("Rank")).toBeTruthy();
    expect(screen.getByText("Cache")).toBeTruthy();
    expect(screen.getByText("Railway volume")).toBeTruthy();
    expect(screen.getByText(/environment variable controls the scan cadence/i)).toBeTruthy();
    expect(screen.getByText("Opportunity Score weights")).toBeTruthy();
    expect(screen.getByText("Professional relevance")).toBeTruthy();
    expect(screen.getByText("View reach")).toBeTruthy();
    expect(screen.getByText("32%")).toBeTruthy();
    expect(screen.getByText("Existing interactions")).toBeTruthy();
    expect(screen.getByText("28%")).toBeTruthy();
    expect(screen.getByText(/generic tool-choice polls/i)).toBeTruthy();
    expect(screen.getByText(/launches, outages, incidents/i)).toBeTruthy();
    expect(screen.getByText(/build-versus-dependency trade-offs/i)).toBeTruthy();
    expect(screen.getByText(/discussion-style matches must be link-free/i)).toBeTruthy();
    expect(screen.getByText(/70\+ fit Ali best/i)).toBeTruthy();
    expect(screen.getByText("Author authority")).toBeTruthy();
    expect(screen.getByText("5%")).toBeTruthy();
    expect(screen.getByText("Reply prep")).toBeTruthy();
    expect(screen.getByText(/clearly labeled, clickable actions to open the post/i)).toBeTruthy();
    expect(screen.getByText(/makes no additional X request/i)).toBeTruthy();
    expect(screen.queryByText(/green means check/i)).toBeNull();
  });
});
