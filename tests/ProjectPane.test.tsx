/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectPane } from "@/components/panes/ProjectPane";
import { PROJECTS } from "@/lib/site";

afterEach(cleanup);

describe("ProjectPane composer", () => {
  it("uses a padded rounded composer without the old add control", () => {
    const { container } = render(
      <ProjectPane
        project={PROJECTS[0]}
        messages={[]}
        running={false}
        onSend={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Message the agent" });
    const composer = input.parentElement;

    expect(composer?.className).toContain("rounded-xl");
    expect(composer?.className).toContain("px-4");
    expect(composer?.className).not.toContain("shadow-");
    expect(input.className).toContain("border-0");
    expect(input.className).toContain("p-0");
    expect(input.className).toContain("text-base");
    expect(input.className).toContain("md:text-sm");
    expect(input.hasAttribute("data-agent-composer-input")).toBe(true);
    expect(
      screen.getByRole("button", { name: /Research the top 3 competitors/ }).className,
    ).toContain("cursor-pointer");
    expect(screen.getByRole("button", { name: "Send message" }).className).toContain(
      "cursor-pointer",
    );
    expect(container.querySelector(".lucide-plus")).toBeNull();
    expect(container.querySelector(".lucide-corner-down-left")).not.toBeNull();
  });

  it("renders assistant Markdown bold markers as bold text", () => {
    const { container } = render(
      <ProjectPane
        project={PROJECTS[0]}
        messages={[
          {
            id: "critic-result",
            role: "assistant",
            label: "Critic",
            content: "Review **Missing target price:** Add a specific price point.",
          },
        ]}
        running={false}
        onSend={vi.fn()}
      />,
    );

    expect(screen.getByText("Missing target price:").tagName).toBe("STRONG");
    expect(container.textContent).not.toContain("**");
  });
});
