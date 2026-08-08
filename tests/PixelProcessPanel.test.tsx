/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PixelProcessPanel } from "@/components/PixelProcessPanel";

afterEach(cleanup);

describe("PixelProcessPanel", () => {
  it("keeps the project process concise and 3D-specific", () => {
    render(<PixelProcessPanel />);

    expect(screen.getByText("How the 3D models were built")).toBeDefined();
    expect(screen.getByText(/without downloaded 3D assets/)).toBeDefined();
    expect(screen.getByText("3D & animation stack")).toBeDefined();
    expect(screen.queryByText("Requirements")).toBeNull();
    expect(screen.queryByText("Deployment")).toBeNull();
  });
});
