import { describe, expect, it } from "vitest";
import { pageTitle } from "@/lib/analytics";

describe("pageTitle", () => {
  it("matches the browser title for each shareable page", () => {
    expect(pageTitle("/")).toBe("Ali Majed — Software Engineer");
    expect(pageTitle("/contact")).toBe("Contact — Ali Majed");
    expect(pageTitle("/projects/agent-orchestration-demo")).toBe(
      "Agent Orchestration Demo — Ali Majed",
    );
  });
});
