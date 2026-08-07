/**
 * @vitest-environment jsdom
 */
import { cleanup, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProcessPanel } from "@/components/ProcessPanel";
import { PROCESS_STEPS } from "@/lib/site";

afterEach(cleanup);

describe("ProcessPanel content", () => {
  it("uses one consistent tool category for every visible badge", () => {
    const { container } = render(<ProcessPanel />);
    const summaries = Array.from(container.querySelectorAll("summary"));

    expect(summaries).toHaveLength(5);
    summaries.forEach((summary, index) => {
      expect(within(summary).getByText(PROCESS_STEPS[index].tool, { exact: true })).toBeDefined();
      expect(summary.className).toContain("cursor-pointer");
    });
  });

  it("keeps every process explanation brief prose without numbered or bulleted formatting", () => {
    for (const step of PROCESS_STEPS) {
      expect(step.why).not.toMatch(/(?:^|\s)\d+\.\s/);
      expect(step.why).not.toMatch(/(?:^|\n)\s*[-*]\s/);
      expect(step.description).not.toMatch(/(?:^|\s)\d+\.\s/);
    }
  });
});
