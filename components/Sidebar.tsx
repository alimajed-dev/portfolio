"use client";

import { Mail, MessageSquare, PanelLeft, PanelRight } from "lucide-react";
import { Avatar } from "./Avatar";
import { OWNER, PROJECTS } from "@/lib/site";
import type { View } from "@/lib/view";

type Props = {
  view: View;
  onSelect: (view: View) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Set while the mobile agent drawer is open, so the sidebar leaves the tab order. */
  inert?: boolean;
};

const itemBase =
  "flex items-center gap-2.5 rounded-lg text-sm font-semibold transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98]";

export function Sidebar({ view, onSelect, collapsed, onToggleCollapsed, inert }: Props) {
  const isContact = view.kind === "contact";

  const itemClass = (active: boolean) =>
    [
      itemBase,
      collapsed ? "size-10 justify-center" : "px-2.5 py-2.5",
      active
        ? "bg-accent-tint text-accent-ink"
        : "text-ink hover:bg-[rgb(32_30_29_/_0.05)]",
    ].join(" ");

  return (
    <nav
      aria-label="Main"
      inert={inert}
      className={[
        "flex h-full shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out",
        collapsed ? "w-[72px] items-center gap-6 px-0 py-6" : "w-[264px] px-4 py-6",
      ].join(" ")}
    >
      {collapsed ? (
        <>
          <button
            type="button"
            onClick={() => onSelect({ kind: "home" })}
            title={`${OWNER.name} — home`}
            aria-label={`${OWNER.name} — home`}
            aria-current={view.kind === "home" ? "page" : undefined}
            className="rounded-lg transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
          >
            <Avatar src={OWNER.avatarSrc} initials={OWNER.initials} name={OWNER.name} />
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            aria-expanded={false}
            className="flex size-9 items-center justify-center rounded-lg text-neutral-700 transition-[transform,color,background-color] duration-150 ease-out hover:scale-105 hover:bg-[rgb(32_30_29_/_0.05)] hover:text-ink active:scale-95"
          >
            <PanelRight size={17} strokeWidth={1.6} aria-hidden />
          </button>
        </>
      ) : (
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onSelect({ kind: "home" })}
            aria-label={`${OWNER.name} — home`}
            aria-current={view.kind === "home" ? "page" : undefined}
            className="flex items-center gap-2.5 rounded-lg text-left transition-transform duration-150 ease-out active:scale-[0.98]"
          >
            <Avatar src={OWNER.avatarSrc} initials={OWNER.initials} name={OWNER.name} />
            <span className="text-[15px] font-bold">{OWNER.name}</span>
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            aria-expanded
            className="flex size-8 items-center justify-center rounded-lg text-neutral-700 transition-[transform,color,background-color] duration-150 ease-out hover:scale-105 hover:bg-[rgb(32_30_29_/_0.05)] hover:text-ink active:scale-95"
          >
            <PanelLeft size={17} strokeWidth={1.6} aria-hidden />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => onSelect({ kind: "contact" })}
        className={itemClass(isContact)}
        aria-current={isContact ? "page" : undefined}
        title={collapsed ? "Contact" : undefined}
      >
        <Mail size={collapsed ? 17 : 16} strokeWidth={1.6} aria-hidden className="shrink-0" />
        {collapsed ? <span className="sr-only">Contact</span> : "Contact"}
      </button>

      <div className={collapsed ? "flex flex-col items-center gap-2" : "mt-7"}>
        {collapsed ? (
          <h2 className="sr-only">Projects</h2>
        ) : (
          <h2 className="mb-2 ml-2.5 text-[11px] font-semibold tracking-[0.07em] text-neutral-600">
            Projects
          </h2>
        )}
        <ul className={collapsed ? "flex flex-col items-center gap-2" : "flex flex-col gap-1"}>
          {PROJECTS.map((project) => {
            const active = view.kind === "project" && view.projectId === project.id;
            return (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => onSelect({ kind: "project", projectId: project.id })}
                  className={`${itemClass(active)} w-full text-left`}
                  aria-label={project.name}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? project.name : undefined}
                >
                  <MessageSquare
                    size={collapsed ? 17 : 16}
                    strokeWidth={1.6}
                    aria-hidden
                    className="shrink-0"
                  />
                  {collapsed ? (
                    <span className="sr-only">{project.name}</span>
                  ) : (
                    <span className="truncate">{project.name}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
