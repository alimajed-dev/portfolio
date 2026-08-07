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
    expect(composer?.className).toContain("px-3");
    expect(input.className).toContain("px-2");
    expect(container.querySelector(".lucide-plus")).toBeNull();
  });
});
