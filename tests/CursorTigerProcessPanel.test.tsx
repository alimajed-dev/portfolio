/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CursorTigerProcessPanel } from "@/components/CursorTigerProcessPanel";

afterEach(cleanup);

describe("CursorTigerProcessPanel", () => {
  it("matches the concise two-section project process style", () => {
    render(<CursorTigerProcessPanel />);

    expect(screen.getByText("How the tiger follows the cursor")).toBeDefined();
    expect(screen.getByText("Video timeline")).toBeDefined();
    expect(screen.getByText("Interaction details")).toBeDefined();
    expect(screen.getByText("Cursor mapping")).toBeDefined();
    expect(screen.getByText("Smooth seeking")).toBeDefined();
    expect(screen.getByText("Touch controls")).toBeDefined();
    expect(screen.queryByText("Deployment")).toBeNull();
  });
});
