import { Mail } from "lucide-react";
import { CopyValueButton } from "@/components/CopyEmailButton";
import { OWNER, SOCIAL_LINKS, type SocialLink } from "@/lib/site";

/**
 * Brand marks are inlined (paths taken from the mockup) — lucide-react v1
 * dropped its brand icon set, and there is no X/Twitter mark in it at all.
 */
const svgProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function LinkIcon({ icon }: { icon: SocialLink["icon"] }) {
  switch (icon) {
    case "mail":
      return <Mail size={16} strokeWidth={1.6} aria-hidden />;
    case "linkedin":
      return (
        <svg {...svgProps}>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect width="4" height="12" x="2" y="9" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...svgProps}>
          <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
          <path d="m10 15 5-3-5-3z" />
        </svg>
      );
    case "github":
      return (
        <svg {...svgProps}>
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
      );
    case "x":
      return <span className="text-[13px] font-bold">X</span>;
  }
}

export function ContactPane() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:py-12">
      <div className="mx-auto w-full max-w-[680px]">
        <p className="mb-1 text-xs font-semibold uppercase text-accent sm:mb-2">Get in touch</p>
        <h1 className="mb-1 text-[28px] leading-tight font-bold tracking-[-0.02em] text-ink sm:mb-2 sm:text-[32px]">
          Let&apos;s build something.
        </h1>
        <p className="text-[14px]/[1.6] text-neutral-600 sm:text-[15px]/[1.6]">
          Got something on your mind? Send me a message. I&apos;m always happy to hear from new people.
        </p>

        <div className="mt-6 rounded-lg border border-line bg-panel p-4 pt-3 sm:mt-8 sm:p-6">
          <p className="mb-3 text-[13px] text-neutral-600 sm:mb-4 sm:text-sm">Primary Direct Channel</p>
          <a
            href={`mailto:${OWNER.email}`}
            className="flex w-full items-center justify-center gap-2.5 rounded-md bg-accent px-5 py-2.5 text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-accent-hover active:scale-[0.99] active:bg-accent-active sm:py-3.5"
          >
            <Mail size={16} strokeWidth={1.9} aria-hidden />
            Send an email
          </a>
        </div>

        <ul className="mt-7 flex flex-col gap-2 sm:mt-8">
          {SOCIAL_LINKS.map((link) => {
            const external = !link.href.startsWith("mailto:");
            const name = {
              mail: "Email",
              linkedin: "LinkedIn",
              x: "X (Twitter)",
              youtube: "YouTube",
              github: "GitHub",
            }[link.icon];

            return (
              <li
                key={link.id}
                className="group flex min-h-14 items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-ink transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px hover:border-line-strong hover:bg-panel-raised active:translate-y-0 sm:px-4 sm:py-3"
              >
                <a
                  href={link.href}
                  {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md"
                >
                  <span className="flex size-[18px] shrink-0 items-center justify-center text-accent transition-transform duration-150 group-hover:scale-110">
                    <LinkIcon icon={link.icon} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col sm:grid sm:grid-cols-[160px_1fr] sm:items-center">
                    <span className="text-[14px] font-medium text-ink">{name}</span>
                    <span className="truncate font-mono text-[12px] text-neutral-600 sm:text-[14px]">{link.label}</span>
                  </span>
                  {external && <span className="sr-only">(opens in a new tab)</span>}
                </a>
                <CopyValueButton value={link.label} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
