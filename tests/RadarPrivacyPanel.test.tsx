/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RadarPrivacyPanel } from "@/components/RadarPrivacyPanel";

describe("RadarPrivacyPanel", () => {
  it("keeps Radar data handling and removal information beside the project", () => {
    render(<RadarPrivacyPanel />);
    expect(screen.getByText("Information processed")).toBeTruthy();
    expect(screen.getByText("Storage and removal")).toBeTruthy();
    expect(screen.getByText(/follower and posting-activity signals/i)).toBeTruthy();
    expect(screen.getByText(/plus quoted-source context returned in the same response/i)).toBeTruthy();
    expect(screen.getByText(/interaction depth and velocity/i)).toBeTruthy();
    expect(screen.getByText(/latest successful result set and usage counters/i)).toBeTruthy();
    expect(screen.getByText("Operational monitoring")).toBeTruthy();
    expect(screen.getByText(/post text, post and author IDs, credentials, owner tokens, and visitor data are never included/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /@/ }).getAttribute("href")).toContain("mailto:");
    expect(screen.getByRole("link", { name: "X Privacy Policy" }).getAttribute("target")).toBe("_blank");
  });
});
