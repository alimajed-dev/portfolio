import Link from "next/link";
import { OWNER, PROJECTS, SKILLS } from "@/lib/site";

export function HomePane() {
  return (
    <div className="flex flex-1 overflow-auto px-6 py-10 sm:px-12 lg:px-20">
      <div className="m-auto w-full max-w-[600px]">
        <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-accent">Portfolio</p>
        <h1 className="mb-[18px] text-[32px] font-bold tracking-[-0.02em] sm:text-[40px]">
          {OWNER.name}
        </h1>
        <p className="max-w-[560px] text-[16px]/[1.6] text-ink/[0.85]">{OWNER.bio}</p>

        <div className="mt-9 flex flex-col gap-8">
          {SKILLS.map((skill) => (
            <section key={skill.eyebrow}>
              <p className="text-[11px] font-semibold tracking-[0.08em] text-accent">
                {skill.eyebrow}
              </p>
              <h2 className="mt-2 text-[16px] font-semibold">{skill.title}</h2>
              <p className="mt-2 max-w-[560px] text-[16px]/[1.6] text-ink/[0.85]">{skill.body}</p>
            </section>
          ))}
        </div>

        <hr className="my-10 border-0 border-t border-line" />

        <section>
          <p className="mb-4 text-[11px] font-semibold tracking-[0.08em] text-accent">Projects</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {PROJECTS.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group flex min-h-[220px] flex-col rounded-xl border border-line bg-bg p-5 transition-[background-color,border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface/40 active:translate-y-0"
              >
                <p className="text-[11px] font-semibold tracking-[0.08em] text-accent">
                  {project.cardEyebrow}
                </p>
                <h2 className="mt-2 text-[16px] font-semibold">{project.name}</h2>
                <p className="mt-2 text-[13px]/[1.55] text-neutral-700">{project.cardTitle}</p>
                <p className="mt-3 text-[13px]/[1.55] text-ink/[0.72]">{project.cardBody}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
