/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePane } from "@/components/panes/HomePane";

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
        "Most of my professional work is confidential, but here are a few things I’ve built for fun and exploration.",
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
});
