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
    expect(container.querySelector(".lucide-plus")).toBeNull();
    expect(container.querySelector(".lucide-corner-down-left")).not.toBeNull();
  });
});
