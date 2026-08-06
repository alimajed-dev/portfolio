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
  it("uses orange while working and green when complete", () => {
    const { container } = render(
      <LiveTrace steps={[traceStep("running"), traceStep("done")]} running />,
    );

    expect(container.querySelector('[data-step-status="running"]')?.getAttribute("class")).toContain(
      "text-orange-500",
    );
    expect(container.querySelector('[data-step-status="done"]')?.getAttribute("class")).toContain(
      "text-emerald-400",
    );
    expect(container.textContent).toContain("Why this model: test");
  });
});
