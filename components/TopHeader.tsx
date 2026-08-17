"use client";

import { Home, Mail, Menu, Radar, ScanLine, Terminal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROJECTS } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  onOpenSidebar: () => void;
  onOpenPanel: () => void;
  running: boolean;
};

export function TopHeader({ onOpenSidebar, onOpenPanel, running }: Props) {
  const pathname = usePathname();
  const projectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const project = PROJECTS.find((item) => item.id === projectId);
  const contact = pathname === "/contact";

  const title = project ? project.name : contact ? "workspace/contact" : "workspace/home";
  const mobileTitle = project ? project.name : contact ? "Contact" : "Portfolio";
  const subtitle = project ? project.subtitle : contact ? "Direct channels" : "Overview";
  const Icon = project?.experience === "pixels" ? ScanLine : project?.experience === "radar" ? Radar : project ? Terminal : contact ? Mail : Home;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-bg px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink transition-[background-color,transform] duration-150 hover:bg-panel active:scale-95 lg:hidden"
        >
          <Menu size={20} strokeWidth={1.9} aria-hidden />
        </button>
        <Icon size={18} strokeWidth={1.8} aria-hidden className="hidden shrink-0 text-accent lg:block" />
        <div className="min-w-0">
          <p className={`${project ? "max-w-[190px]" : ""} truncate text-[16px] font-semibold text-ink lg:hidden`}>{mobileTitle}</p>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-0.5 text-[11px] text-neutral-600">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />

        {!project && !contact && (
          <Link
            href="/contact"
            aria-label="Open contact page"
            title="Contact"
            className="flex size-9 items-center justify-center rounded-md text-neutral-600 transition-[background-color,color,transform] duration-150 hover:scale-105 hover:bg-panel hover:text-accent active:scale-95 lg:hidden"
          >
            <Mail size={20} strokeWidth={1.7} aria-hidden />
          </Link>
        )}

        {project && (
          <button
            type="button"
            onClick={onOpenPanel}
            aria-label={project.experience === "agent" ? "Show agent trace" : project.experience === "radar" ? "Show ranking process" : "Show project details"}
            className="relative flex size-9 cursor-pointer items-center justify-center rounded-md text-accent transition-[background-color,transform] duration-150 hover:scale-105 hover:bg-accent-tint active:scale-95 lg:hidden"
          >
            <Icon size={20} strokeWidth={1.8} aria-hidden />
            {project.experience === "agent" && running && <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-warning" aria-hidden />}
          </button>
        )}

        <Link
          href="/contact"
          aria-label="Open contact page"
          title="Contact"
          className="hidden size-8 items-center justify-center rounded-md text-neutral-600 transition-[background-color,color,transform] duration-150 hover:scale-105 hover:bg-panel hover:text-ink active:scale-95 lg:flex"
        >
          <Mail size={15} strokeWidth={1.8} aria-hidden />
        </Link>
      </div>
    </header>
  );
}
