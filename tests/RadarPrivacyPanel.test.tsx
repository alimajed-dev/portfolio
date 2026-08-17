/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RadarPrivacyPanel } from "@/components/RadarPrivacyPanel";

describe("RadarPrivacyPanel", () => {
  it("keeps Radar data handling and removal information beside the project", () => {
    render(<RadarPrivacyPanel />);
    expect(screen.getByText("Information processed")).toBeTruthy();
    expect(screen.getByText("Storage and removal")).toBeTruthy();
    expect(screen.getByRole("link", { name: /@/ }).getAttribute("href")).toContain("mailto:");
    expect(screen.getByRole("link", { name: "X Privacy Policy" }).getAttribute("target")).toBe("_blank");
  });
});
