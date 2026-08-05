import { Mail } from "lucide-react";
import { OWNER, SKILLS } from "@/lib/site";

export function HomePane({ onContact }: { onContact: () => void }) {
  return (
    <div className="flex-1 overflow-auto px-6 py-12 sm:px-12 lg:px-20 lg:py-[72px]">
      <div className="max-w-[600px]">
        <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-accent">Portfolio</p>
        <h1 className="mb-[18px] text-[32px] font-bold tracking-[-0.02em] sm:text-[40px]">
          {OWNER.name}
        </h1>
        <p className="max-w-[560px] text-[16px]/[1.6] text-ink/[0.85]">{OWNER.bio}</p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          {SKILLS.map((skill) => (
            <div
              key={skill.eyebrow}
              className="flex flex-1 flex-col gap-1.5 rounded-xl border border-line bg-bg p-5"
            >
              <p className="text-[11px] font-semibold tracking-[0.06em] text-accent uppercase">
                {skill.eyebrow}
              </p>
              <h2 className="text-[16px] font-semibold">{skill.title}</h2>
              <p className="text-[13px]/[1.55] text-ink/[0.72]">{skill.body}</p>
              {skill.stack && (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {skill.stack.map((tech) => (
                    <li
                      key={tech}
                      className="rounded-md bg-badge px-2 py-[3px] text-[11px] text-neutral-800"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <hr className="mt-10 mb-6 border-0 border-t border-line" />

        <button
          type="button"
          onClick={onContact}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-[11px] text-sm font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-accent-hover active:scale-[0.98] active:bg-accent-active"
        >
          <Mail size={15} strokeWidth={1.8} aria-hidden />
          Get in touch
        </button>
      </div>
    </div>
  );
}
