import { ExternalLink, Mail } from "lucide-react";
import { CopyEmailButton } from "@/components/CopyEmailButton";
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
    <div className="flex-1 overflow-auto px-6 py-12 sm:px-12 lg:px-20 lg:py-[72px]">
      <div className="max-w-[520px]">
        <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-accent">Get in touch</p>
        <h1 className="mb-3.5 text-[30px] font-bold tracking-[-0.02em] sm:text-[36px]">
          Let&apos;s build something.
        </h1>
        <p className="mb-7 text-[15px]/[1.6] text-ink/80">
          Email is the easiest way to reach me — whether it&apos;s actual work, a half-formed idea,
          or you just want to talk shop.
        </p>

        <a
          href={`mailto:${OWNER.email}`}
          className="mb-8 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-[11px] text-sm font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-accent-hover active:scale-[0.98] active:bg-accent-active"
        >
          <Mail size={15} strokeWidth={1.8} aria-hidden />
          Send an email
        </a>

        <ul className="border-b border-line-soft">
          {SOCIAL_LINKS.map((link) => {
            const external = !link.href.startsWith("mailto:");

            // The email row keeps its mailto but pairs it with a copy button, so
            // it still works on desktops with no mail client configured.
            if (link.icon === "mail") {
              return (
                <li
                  key={link.id}
                  className="flex items-center gap-2 border-t border-line-soft pr-2"
                >
                  <a
                    href={link.href}
                    className="group flex min-w-0 flex-1 items-center gap-3.5 rounded-[10px] px-2 py-3.5 text-ink transition-colors duration-150 ease-out hover:bg-[rgb(32_30_29_/_0.04)]"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface transition-transform duration-150 ease-out group-hover:scale-105">
                      <LinkIcon icon={link.icon} />
                    </span>
                    <span className="truncate text-sm">{link.label}</span>
                  </a>
                  <CopyEmailButton value={OWNER.email} />
                </li>
              );
            }

            return (
              <li key={link.id} className="border-t border-line-soft">
                <a
                  href={link.href}
                  {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                  className="group flex items-center gap-3.5 rounded-[10px] px-2 py-3.5 text-ink transition-colors duration-150 ease-out hover:bg-[rgb(32_30_29_/_0.04)]"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface transition-transform duration-150 ease-out group-hover:scale-105">
                    <LinkIcon icon={link.icon} />
                  </span>
                  <span className="flex-1 truncate text-sm">{link.label}</span>
                  <ExternalLink
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden
                    className="shrink-0 text-neutral-500 transition-colors duration-150 ease-out group-hover:text-ink"
                  />
                  {external && <span className="sr-only">(opens in a new tab)</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
