/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/AppShell";

const NARROW_QUERY = "max-width: 1023px";

/**
 * jsdom has no layout engine and no `matchMedia`, so the breakpoint the drawer
 * depends on is stubbed explicitly per test.
 */
function setViewport(size: "narrow" | "wide") {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes(NARROW_QUERY) && size === "narrow",
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

const openProject = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Agent Orchestration Demo" }));

const panel = () => screen.getByRole("complementary", { name: "Agent panel" });
const dialog = () => screen.getByRole("dialog", { name: "Agent panel" });
const tab = (name: "Live" | "Process") => screen.getByRole("tab", { name });
const activeTabName = () =>
  screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true")?.textContent;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});

afterEach(() => {
  // Vitest runs without `globals`, so RTL cannot install its own auto-cleanup.
  cleanup();
  vi.unstubAllGlobals();
});

describe("AppShell — panel tab default (F-007)", () => {
  beforeEach(() => setViewport("wide"));

  it("opens a project on Live", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);

    expect(activeTabName()).toBe("Live");
    expect(within(panel()).getByRole("heading", { name: "Agent trace" })).toBeDefined();
  });

  it("keeps Process selected while the visitor stays in the project", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);
    await user.click(tab("Process"));

    expect(activeTabName()).toBe("Process");
    expect(within(panel()).getByRole("heading", { name: "Case study" })).toBeDefined();
  });

  it("resets to Live after leaving the project and coming back", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await openProject(user);
    await user.click(tab("Process"));
    expect(activeTabName()).toBe("Process");

    await user.click(screen.getByRole("button", { name: "Contact" }));
    expect(screen.queryByRole("tab", { name: "Live" })).toBeNull();

    await openProject(user);
    expect(activeTabName()).toBe("Live");
    expect(within(panel()).getByRole("heading", { name: "Agent trace" })).toBeDefined();
  });
});

describe("AppShell — desktop panel is not modal", () => {
  beforeEach(() => setViewport("wide"));

  it("renders the panel as a plain column with no dialog semantics", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(panel().hasAttribute("aria-modal")).toBe(false);
    expect(screen.getByRole("navigation", { name: "Main" }).hasAttribute("inert")).toBe(false);
  });

  it("does not trap Tab in the panel", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);

    const closeButton = within(panel()).getByRole("button", { name: "Close panel" });
    closeButton.focus();
    // Not prevented — the browser's own tab order is left alone.
    expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(true);
  });
});

describe("AppShell — mobile drawer focus management (F-006)", () => {
  beforeEach(() => setViewport("narrow"));

  const openDrawer = async (user: ReturnType<typeof userEvent.setup>) => {
    const opener = screen.getByRole("button", { name: "Show agent trace" });
    await user.click(opener);
    return opener;
  };

  it("announces itself as a modal dialog and moves focus into it", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);
    await openDrawer(user);

    const drawer = dialog();
    expect(drawer.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(
      within(drawer).getByRole("button", { name: "Close panel" }),
    );
  });

  it("takes the background out of the tab order and the accessibility tree", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);

    const nav = screen.getByRole("navigation", { name: "Main" });
    const main = document.querySelector("main") as HTMLElement;
    expect(nav.hasAttribute("inert")).toBe(false);

    await openDrawer(user);
    expect(nav.hasAttribute("inert")).toBe(true);
    expect(main.hasAttribute("inert")).toBe(true);
  });

  it("wraps Tab from the last control back to the first", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);
    await openDrawer(user);

    const drawer = dialog();
    const close = within(drawer).getByRole("button", { name: "Close panel" });
    const live = within(drawer).getByRole("tab", { name: "Live" });

    close.focus(); // last control in the Live tab
    expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(false); // default prevented
    expect(document.activeElement).toBe(live);
  });

  it("wraps Shift+Tab from the first control back to the last", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);
    await openDrawer(user);

    const drawer = dialog();
    const live = within(drawer).getByRole("tab", { name: "Live" });
    const close = within(drawer).getByRole("button", { name: "Close panel" });

    live.focus();
    expect(fireEvent.keyDown(document, { key: "Tab", shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(close);
  });

  it("pulls focus back in if it somehow lands outside the drawer", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);
    await openDrawer(user);

    document.body.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(dialog().contains(document.activeElement)).toBe(true);
  });

  // The Process tab swaps the drawer's contents, so the trap has to look at the
  // live DOM rather than a list captured when the drawer opened.
  it("keeps trapping after the panel switches tabs", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);
    await openDrawer(user);
    await user.click(tab("Process"));

    const drawer = dialog();
    const disclosures = within(drawer).getAllByText("Why");
    const last = disclosures[disclosures.length - 1].closest("summary") as HTMLElement;

    last.focus();
    expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(false);
    expect(document.activeElement).toBe(within(drawer).getByRole("tab", { name: "Live" }));
  });

  it("closes on Escape and returns focus to the control that opened it", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);
    const opener = await openDrawer(user);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(screen.getByRole("navigation", { name: "Main" }).hasAttribute("inert")).toBe(false);
  });

  it("closes on a backdrop click and returns focus to the opener", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);
    const opener = await openDrawer(user);

    const backdrop = document.querySelector('[aria-hidden="true"].fixed.inset-0') as HTMLElement;
    await user.click(backdrop);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes on the close button and returns focus to the opener", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);
    const opener = await openDrawer(user);

    await user.click(within(dialog()).getByRole("button", { name: "Close panel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes the drawer when navigating away, without leaving focus stranded", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openProject(user);
    await openDrawer(user);

    // The sidebar is inert while the drawer is open, so close it the way a
    // visitor would before navigating.
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Contact" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("complementary", { name: "Agent panel" })).toBeNull();
  });
});
