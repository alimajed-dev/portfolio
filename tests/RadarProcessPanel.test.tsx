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
  });
});
