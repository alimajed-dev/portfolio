/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContactPane } from "@/components/panes/ContactPane";
import { OWNER } from "@/lib/site";

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

afterEach(cleanup);

describe("ContactPane copy actions", () => {
  it("uses the short contact greeting", () => {
    render(<ContactPane />);

    expect(screen.getByRole("heading", { name: "Hi" })).toBeDefined();
  });

  it("keeps the row link intact and copies its displayed value from the copy control", async () => {
    render(<ContactPane />);

    expect(screen.getByRole("link", { name: /Email/ }).getAttribute("href")).toBe(
      `mailto:${OWNER.email}`,
    );

    fireEvent.click(screen.getByRole("button", { name: `Copy ${OWNER.email}` }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(OWNER.email));
    expect(screen.getByRole("button", { name: `${OWNER.email} copied` }).textContent).toContain(
      "Copied",
    );
  });
});
