import { ArrowRight, ScanLine, Terminal } from "lucide-react";
import Link from "next/link";
import { OWNER, PROJECTS, SKILLS } from "@/lib/site";

export function HomePane() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:py-12">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-8">
        <section className="flex flex-col items-start gap-3">
          <p className="text-xs font-semibold uppercase text-accent">Portfolio</p>
          <h1 className="text-[34px] leading-none font-bold tracking-[-0.02em] text-ink sm:text-[40px]">
            {OWNER.name}
          </h1>
          <p className="text-[14px]/[1.6] text-neutral-600 sm:text-[15px]/[1.6]">{OWNER.bio}</p>
        </section>

        <hr className="border-0 border-t border-line" />

        <div className="flex flex-col gap-5 sm:gap-6">
          {SKILLS.map((skill) => (
            <section key={skill.eyebrow} className="flex flex-col items-start gap-1 sm:gap-2">
              <p className="text-xs leading-none font-semibold uppercase text-accent sm:leading-normal">{skill.eyebrow}</p>
              <h2 className="text-[16px] font-semibold text-ink sm:text-[18px]">{skill.title}</h2>
              <p className="text-[13px]/[1.55] text-neutral-600 sm:text-[14px]/[1.5]">{skill.body}</p>
            </section>
          ))}
        </div>

        <hr className="border-0 border-t border-line" />

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-ink">Projects</h2>
            <p className="text-[13px]/[1.55] text-neutral-600 sm:text-[14px]/[1.5]">
              Most of my professional work is confidential, but here are a few things I’ve built for fun and exploration.
            </p>
          </div>
          {PROJECTS.map((project) => {
            const ProjectIcon = project.experience === "pixels" ? ScanLine : Terminal;
            const displayName =
              project.experience === "pixels" ? "Learn how pixels create color" : project.name;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group flex min-h-[68px] items-center gap-3 rounded-lg border border-line bg-panel p-3 shadow-[0_4px_6px_rgb(0_0_0_/_0.25)] transition-[background-color,border-color] duration-150 hover:border-line-strong hover:bg-panel-raised sm:min-h-[80px] sm:gap-4 sm:p-5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md border-l-2 border-accent bg-panel-raised text-accent transition-transform duration-150 group-hover:scale-105">
                  <ProjectIcon size={18} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[14px] font-semibold text-ink sm:text-[15px]">
                      {displayName}
                    </span>
                    <span className="shrink-0 text-xs text-accent">
                      <span className="sm:hidden">Demo inside</span>
                      <span className="hidden sm:inline">{project.cardTitle}</span>
                    </span>
                  </span>
                  <span className="truncate text-[12px] text-neutral-600 sm:text-[13px]">{project.cardBody}</span>
                </span>
                <ArrowRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-neutral-600 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
