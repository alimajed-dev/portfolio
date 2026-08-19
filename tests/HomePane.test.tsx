/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePane } from "@/components/panes/HomePane";
import { PROJECTS } from "@/lib/site";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe("HomePane projects", () => {
  it("explains why only selected projects are public", () => {
    render(<HomePane />);

    expect(
      screen.getByText(
        "Most of my professional work is confidential, but here are a few things I’ve built for fun and exploration. Each project includes a concise Build Process view, so you can see how it was made.",
      ),
    ).toBeDefined();
  });

  it("gives the Pixels card its own title and sidebar-matching icon", () => {
    const { container } = render(<HomePane />);
    const pixelsCard = screen.getByRole("link", { name: /Learn how pixels create color/ });

    expect(pixelsCard.getAttribute("href")).toBe("/projects/how-pixels-create-color");
    expect(pixelsCard.textContent).not.toContain("Agent Orchestration");
    expect(pixelsCard.querySelector(".lucide-scan-line")).not.toBeNull();
    expect(container.querySelectorAll(".lucide-scan-line")).toHaveLength(1);
    expect(pixelsCard.className).not.toContain("hover:-translate-y");
  });

  it("registers Cursor Tiger with its own route and icon", () => {
    render(<HomePane />);
    const tigerCard = screen.getByRole("link", { name: /Cursor Tiger/ });

    expect(tigerCard.getAttribute("href")).toBe("/projects/cursor-tiger");
    expect(tigerCard.querySelector(".lucide-paw-print")).not.toBeNull();
  });

  it("marks Radar in progress, Cursor Tiger on hold, and completed projects done", () => {
    render(<HomePane />);

    const radarCard = screen.getByRole("link", { name: /Conversation Opportunity Radar/ });
    const tigerCard = screen.getByRole("link", { name: /Cursor Tiger/ });
    const inProgressTag = screen.getByText("In progress");
    const onHoldTag = screen.getByText("On hold");
    const doneTags = screen.getAllByText("Done");

    expect(radarCard.textContent).toContain("In progress");
    expect(tigerCard.textContent).toContain("On hold");
    expect(doneTags).toHaveLength(PROJECTS.length - 2);
    expect(inProgressTag.className).toContain("bg-warning/15");
    expect(onHoldTag.className).toContain("bg-neutral-500/15");
    expect(doneTags[0].className).toContain("bg-success/15");
  });
});
