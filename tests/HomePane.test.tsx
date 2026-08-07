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
});
