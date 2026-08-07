/**
 * @vitest-environment jsdom
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LiveTrace } from "@/components/LiveTrace";
import type { TraceStep } from "@/lib/agent-types";

afterEach(cleanup);

function traceStep(status: TraceStep["status"]): TraceStep {
  return {
    id: status,
    name: status === "running" ? "Planner" : "Researcher",
    model: "Test model",
    description: "Doing useful work",
    reason: "test",
    status,
  };
}

describe("LiveTrace status colors", () => {
  it("uses the theme warning color while working and success color when complete", () => {
    const { container } = render(
      <LiveTrace steps={[traceStep("running"), traceStep("done")]} running />,
    );

    expect(container.querySelector('[data-step-status="running"]')?.getAttribute("class")).toContain(
      "text-warning",
    );
    expect(container.querySelector('[data-step-status="done"]')?.getAttribute("class")).toContain(
      "text-success",
    );
    expect(container.textContent).toContain("Why this model: test");
  });
});
