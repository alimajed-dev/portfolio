/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/AppShell";
import { PROJECTS } from "@/lib/site";
import { ProjectPageClient } from "@/app/projects/[projectId]/project-page-client";

const NARROW_QUERY = "max-width: 1023px";
const PROJECT = PROJECTS[0];
const PROJECT_PATH = `/projects/${PROJECT.id}`;

/**
 * AppShell reads the route via `usePathname()` and no longer decides which
 * pane to render — that's real Next.js routing now (F- URLs are shareable).
 * A unit test has no router to swap `children` on navigation, so each test
 * sets this before rendering, and `rerender` simulates a route change by
 * updating it and re-rendering with the children the *new* route would have
 * mounted — mirroring what `app/page.tsx`, `app/contact/page.tsx`, and
 * `app/projects/[projectId]/page.tsx` actually render.
 */
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));
// Real `next/link` requires an App Router context this test harness doesn't
// provide. An anchor is all these tests need: real href, real aria-current.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

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

const HOME = <div>Home content</div>;
const CONTACT = <div>Contact content</div>;
const PROJECT_PAGE = <ProjectPageClient project={PROJECT} />;

function renderAt(pathname: string, children: React.ReactNode) {
  mockPathname = pathname;
  return render(<AppShell>{children}</AppShell>);
}

const panel = () => screen.getByRole("complementary", { name: "Agent panel" });
const dialog = () => screen.getByRole("dialog", { name: "Agent panel" });
const tab = (name: "Live" | "Build Process") => screen.getByRole("tab", { name });
const activeTabName = () =>
  screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true")?.getAttribute("aria-label");

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});

afterEach(() => {
  // Vitest runs without `globals`, so RTL cannot install its own auto-cleanup.
  cleanup();
  vi.unstubAllGlobals();
  mockPathname = "/";
});

describe("Sidebar — real, shareable per-route URLs", () => {
  beforeEach(() => setViewport("wide"));

  it("links home, contact and the project to their own URLs", () => {
    renderAt("/", HOME);

    expect(screen.getByRole("link", { name: "Ali Majed — home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Contact" }).getAttribute("href")).toBe("/contact");
    expect(screen.getByRole("link", { name: PROJECT.name }).getAttribute("href")).toBe(
      PROJECT_PATH,
    );
  });

  it("marks the current route with aria-current, and only that one", () => {
    renderAt(PROJECT_PATH, PROJECT_PAGE);

    expect(screen.getByRole("link", { name: PROJECT.name }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("link", { name: "Contact" }).hasAttribute("aria-current")).toBe(false);
    expect(
      screen.getByRole("link", { name: "Ali Majed — home" }).hasAttribute("aria-current"),
    ).toBe(false);
  });

  it("marks Contact current on /contact", () => {
    renderAt("/contact", CONTACT);
    expect(screen.getByRole("link", { name: "Contact" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });
});

describe("AppShell — right panel only exists on a project route", () => {
  beforeEach(() => setViewport("wide"));

  it("renders no panel on the home route", () => {
    renderAt("/", HOME);
    expect(screen.queryByRole("complementary", { name: "Agent panel" })).toBeNull();
  });

  it("uses the same borderless style for the desktop header actions", () => {
    renderAt("/", HOME);

    const contactActions = screen.getAllByRole("link", { name: "Open contact page" });
    const themeAction = screen.getByRole("button", { name: "Switch to dark mode" });

    for (const contactAction of contactActions) {
      expect(contactAction.className.split(" ")).not.toContain("border");
    }
    expect(themeAction.className.split(" ")).not.toContain("border");
  });

  it("renders no panel on the contact route", () => {
    renderAt("/contact", CONTACT);
    expect(screen.queryByRole("complementary", { name: "Agent panel" })).toBeNull();
  });

  it("renders the panel on a project route", () => {
    renderAt(PROJECT_PATH, PROJECT_PAGE);
    expect(panel()).toBeDefined();
  });

  it("404s (renders nothing project-shaped) for an unknown project id — handled by notFound() in the real route", () => {
    // ProjectPageClient itself assumes a valid project; the unknown-id case is
    // rejected one level up, in app/projects/[projectId]/page.tsx, before this
    // component is ever reached. Confirm AppShell alone doesn't render a panel
    // for a path it doesn't recognise as a real project.
    renderAt("/projects/does-not-exist", <div>never rendered by the real route</div>);
    expect(screen.queryByRole("complementary", { name: "Agent panel" })).toBeNull();
  });
});

describe("AppShell — panel tab default (F-007)", () => {
  beforeEach(() => setViewport("wide"));

  it("opens a project on Live", () => {
    renderAt(PROJECT_PATH, PROJECT_PAGE);
    expect(activeTabName()).toBe("Live");
    expect(within(panel()).getByRole("heading", { name: "Agent trace" })).toBeDefined();
  });

  it("keeps Build Process selected while the visitor stays on the same project route", async () => {
    const user = userEvent.setup();
    renderAt(PROJECT_PATH, PROJECT_PAGE);
    await user.click(tab("Build Process"));

    expect(activeTabName()).toBe("Build Process");
    expect(
      within(panel()).getByRole("heading", { name: "How this site was built" }),
    ).toBeDefined();
  });

  it("resets to Live after navigating away and back to the project", async () => {
    const user = userEvent.setup();
    const { rerender } = renderAt(PROJECT_PATH, PROJECT_PAGE);
    await user.click(tab("Build Process"));
    expect(activeTabName()).toBe("Build Process");

    mockPathname = "/contact";
    rerender(<AppShell>{CONTACT}</AppShell>);
    expect(screen.queryByRole("tab", { name: "Live" })).toBeNull();

    mockPathname = PROJECT_PATH;
    rerender(<AppShell>{PROJECT_PAGE}</AppShell>);
    expect(activeTabName()).toBe("Live");
    expect(within(panel()).getByRole("heading", { name: "Agent trace" })).toBeDefined();
  });
});

describe("AppShell — desktop panel is not modal", () => {
  beforeEach(() => setViewport("wide"));

  it("renders the panel as a plain column with no dialog semantics", () => {
    renderAt(PROJECT_PATH, PROJECT_PAGE);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(panel().hasAttribute("aria-modal")).toBe(false);
    expect(screen.getByRole("navigation", { name: "Main" }).hasAttribute("inert")).toBe(false);
  });

  it("does not trap Tab in the panel", () => {
    renderAt(PROJECT_PATH, PROJECT_PAGE);

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
    renderAt(PROJECT_PATH, PROJECT_PAGE);
    await openDrawer(user);

    const drawer = dialog();
    expect(drawer.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(
      within(drawer).getByRole("button", { name: "Close panel" }),
    );
  });

  it("shows both panel tabs in the mobile drawer", async () => {
    const user = userEvent.setup();
    renderAt(PROJECT_PATH, PROJECT_PAGE);
    await openDrawer(user);

    const drawer = dialog();
    const live = within(drawer).getByRole("tab", { name: "Live" });
    const process = within(drawer).getByRole("tab", { name: "Build Process" });

    expect(live.className).not.toContain("sr-only");
    expect(process.className).not.toContain("sr-only");
    expect(live.className).toContain("cursor-pointer");
    expect(process.className).toContain("cursor-pointer");
    expect(within(drawer).getByRole("heading", { name: "Agent trace" })).toBeDefined();
  });

  it("takes the background out of the tab order and the accessibility tree", async () => {
    const user = userEvent.setup();
    renderAt(PROJECT_PATH, PROJECT_PAGE);

    const nav = screen.getByRole("navigation", { name: "Main" });
    const main = document.querySelector("main") as HTMLElement;
    expect(nav.hasAttribute("inert")).toBe(false);

    await openDrawer(user);
    expect(nav.hasAttribute("inert")).toBe(true);
    expect(main.hasAttribute("inert")).toBe(true);
  });

  it("wraps Tab from the last control back to the first", async () => {
    const user = userEvent.setup();
    renderAt(PROJECT_PATH, PROJECT_PAGE);
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
    renderAt(PROJECT_PATH, PROJECT_PAGE);
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
    renderAt(PROJECT_PATH, PROJECT_PAGE);
    await openDrawer(user);

    document.body.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(dialog().contains(document.activeElement)).toBe(true);
  });

  // The Build Process tab swaps the drawer's contents, so the trap has to look at the
  // live DOM rather than a list captured when the drawer opened.
  it("keeps trapping after the panel switches tabs", async () => {
    const user = userEvent.setup();
    renderAt(PROJECT_PATH, PROJECT_PAGE);
    await openDrawer(user);
    await user.click(tab("Build Process"));

    const drawer = dialog();
    const disclosures = Array.from(drawer.querySelectorAll("summary"));
    const last = disclosures[disclosures.length - 1] as HTMLElement;

    last.focus();
    expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(false);
    expect(document.activeElement).toBe(within(drawer).getByRole("tab", { name: "Live" }));
  });

  it("closes on Escape and returns focus to the control that opened it", async () => {
    const user = userEvent.setup();
    renderAt(PROJECT_PATH, PROJECT_PAGE);
    const opener = await openDrawer(user);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(screen.getByRole("navigation", { name: "Main" }).hasAttribute("inert")).toBe(false);
  });

  it("closes on a backdrop click and returns focus to the opener", async () => {
    const user = userEvent.setup();
    renderAt(PROJECT_PATH, PROJECT_PAGE);
    const opener = await openDrawer(user);

    const backdrop = document.querySelector('[aria-hidden="true"].fixed.inset-0') as HTMLElement;
    await user.click(backdrop);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes on the close button and returns focus to the opener", async () => {
    const user = userEvent.setup();
    renderAt(PROJECT_PATH, PROJECT_PAGE);
    const opener = await openDrawer(user);

    await user.click(within(dialog()).getByRole("button", { name: "Close panel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes the drawer when the route changes, without leaving focus stranded", async () => {
    const user = userEvent.setup();
    const { rerender } = renderAt(PROJECT_PATH, PROJECT_PAGE);
    await openDrawer(user);

    mockPathname = "/contact";
    rerender(<AppShell>{CONTACT}</AppShell>);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("complementary", { name: "Agent panel" })).toBeNull();
  });
});
