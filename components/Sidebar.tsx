"use client";

import { ChevronsLeft, ChevronsRight, CircleX, Home, Mail, Radar, ScanLine, ShieldCheck, Terminal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./Avatar";
import { OWNER, PROJECTS } from "@/lib/site";

type Props = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  inert?: boolean;
  onNavigate?: () => void;
  mobile?: boolean;
};

const navBase =
  "group flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-sm transition-[background-color,color,border-color,transform] duration-150 ease-out hover:bg-panel active:scale-[0.98]";

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  inert,
  onNavigate,
  mobile = false,
}: Props) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isContact = pathname === "/contact";
  const isPrivacy = pathname === "/privacy";

  const itemClass = (active: boolean, compact = false) =>
    [
      navBase,
      compact ? "size-10 justify-center p-0" : "w-full",
      active
        ? "border-accent bg-accent-tint font-medium text-ink"
        : "border-transparent text-neutral-600 hover:text-ink",
    ].join(" ");

  return (
    <nav
      aria-label="Main"
      inert={inert}
      className={[
        "flex h-full shrink-0 flex-col justify-between border-r border-line bg-surface transition-[width] duration-200 ease-out",
        collapsed ? "w-[72px] items-center px-4 py-5" : mobile ? "w-[280px] p-4" : "w-[272px] p-5",
      ].join(" ")}
    >
      <div className={collapsed ? "flex w-full flex-col items-center gap-6" : "w-full"}>
        {mobile && !collapsed && (
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase text-neutral-500">Navigation</span>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Close navigation"
              className="flex size-8 items-center justify-center rounded-md text-neutral-600 transition hover:bg-panel hover:text-ink active:scale-95"
            >
              <CircleX size={17} strokeWidth={1.8} aria-hidden />
            </button>
          </div>
        )}

        <Link
          href="/"
          onClick={onNavigate}
          aria-label={`${OWNER.name} — home`}
          aria-current={isHome ? "page" : undefined}
          className={[
            "flex rounded-lg transition-transform duration-150 active:scale-[0.98]",
            collapsed ? "justify-center" : "items-center gap-3",
          ].join(" ")}
        >
          <Avatar
            src={OWNER.avatarSrc}
            initials={OWNER.initials}
            name={OWNER.name}
            size={collapsed ? "sm" : "md"}
          />
          {!collapsed && (
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[15px] font-semibold text-ink">{OWNER.name}</span>
              <span className="truncate text-xs text-neutral-600">Software Engineer</span>
            </span>
          )}
        </Link>

        <div className={collapsed ? "flex flex-col items-center gap-1" : "mt-6 flex flex-col gap-1"}>
          <Link
            href="/"
            onClick={onNavigate}
            className={itemClass(isHome, collapsed)}
            aria-current={isHome ? "page" : undefined}
            title={collapsed ? "Home" : undefined}
          >
            <Home size={16} strokeWidth={1.7} aria-hidden className="shrink-0 text-current" />
            {collapsed ? <span className="sr-only">Home</span> : <span>Home</span>}
          </Link>
          <Link
            href="/contact"
            onClick={onNavigate}
            className={itemClass(isContact, collapsed)}
            aria-current={isContact ? "page" : undefined}
            title={collapsed ? "Contact" : undefined}
          >
            <Mail size={16} strokeWidth={1.7} aria-hidden className="shrink-0" />
            {collapsed ? <span className="sr-only">Contact</span> : <span>Contact</span>}
          </Link>

          {collapsed ? (
            <h2 className="sr-only">Projects</h2>
          ) : (
            <h2 className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase text-neutral-400">
              Projects
            </h2>
          )}
          <ul className="flex flex-col gap-1">
            {PROJECTS.map((project) => {
              const active = pathname === `/projects/${project.id}`;
              const ProjectIcon = project.experience === "pixels" ? ScanLine : project.experience === "radar" ? Radar : Terminal;
              return (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    onClick={onNavigate}
                    className={itemClass(active, collapsed)}
                    aria-label={project.name}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? project.name : undefined}
                  >
                    <ProjectIcon size={16} strokeWidth={1.7} aria-hidden className="shrink-0" />
                    {collapsed ? <span className="sr-only">{project.name}</span> : <span className="truncate">{project.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className={collapsed ? "flex w-full flex-col items-center gap-4" : "w-full"}>
        <Link
          href="/privacy"
          onClick={onNavigate}
          aria-current={isPrivacy ? "page" : undefined}
          title={collapsed ? "Privacy" : undefined}
          className={itemClass(isPrivacy, collapsed)}
        >
          <ShieldCheck size={16} strokeWidth={1.7} aria-hidden className="shrink-0" />
          {collapsed ? <span className="sr-only">Privacy</span> : <span>Privacy</span>}
        </Link>
        {!collapsed && (
          <div className="mb-4 flex items-center gap-2 text-xs text-neutral-600">
            <span className="size-2 rounded-full bg-success" aria-hidden />
            <span className="hidden sm:inline">Systems fully operational</span>
            <span className="sm:hidden">Systems operational</span>
          </div>
        )}
        <div className={collapsed ? "flex flex-col items-center gap-3" : "flex items-center justify-between border-t border-line pt-3"}>
          {!collapsed && <span className="text-xs text-neutral-400">v3.3.93</span>}
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? "Expand sidebar" : mobile ? "Close navigation" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : mobile ? "Close navigation" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="flex size-8 items-center justify-center rounded-md text-neutral-500 transition-[transform,color,background-color] duration-150 hover:scale-105 hover:bg-panel hover:text-ink active:scale-95"
          >
            {collapsed ? <ChevronsRight size={17} aria-hidden /> : <ChevronsLeft size={17} aria-hidden />}
          </button>
        </div>
      </div>
    </nav>
  );
}
