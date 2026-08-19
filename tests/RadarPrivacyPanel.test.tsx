/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RadarPrivacyPanel } from "@/components/RadarPrivacyPanel";

describe("RadarPrivacyPanel", () => {
  it("keeps Radar data handling and removal information beside the project", () => {
    render(<RadarPrivacyPanel />);
    expect(screen.getByText("Information processed")).toBeTruthy();
    expect(screen.getByText("Storage and removal")).toBeTruthy();
    expect(screen.getByText(/official X API/i)).toBeTruthy();
    expect(screen.getByText(/author name, @username and profile image/i)).toBeTruthy();
    expect(screen.getByText(/reply momentum and density/i)).toBeTruthy();
    expect(screen.getByText(/not sent to an external AI provider/i)).toBeTruthy();
    expect(screen.getByText(/never used to train or fine-tune a model/i)).toBeTruthy();
    expect(screen.getByText(/removes X Content within 24 hours/i)).toBeTruthy();
    expect(screen.getByText(/one-way hash/i)).toBeTruthy();
    expect(screen.getByText(/removal requests are handled within 24 hours/i)).toBeTruthy();
    expect(screen.getByText("Operational monitoring")).toBeTruthy();
    expect(screen.getByText(/post text, post and author IDs, credentials, owner tokens, and visitor data are never included/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /@/ }).getAttribute("href")).toContain("mailto:");
    expect(screen.getByRole("link", { name: "X Privacy Policy" }).getAttribute("target")).toBe("_blank");
  });
});
