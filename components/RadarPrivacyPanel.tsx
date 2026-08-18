import { OWNER } from "@/lib/site";

const SECTIONS = [
  ["Information processed", "Up to 10 recent public candidate posts per scan, plus quoted-source context returned in the same response. This can include post text and identifiers, timestamps, public author details, follower and posting-activity signals, verification status, and public engagement metrics. Protected posts, Direct Messages, email addresses, private metrics, and precise location data are not accessed."],
  ["How it is used", "The radar ranks professional conversations using interaction depth and velocity, professional relevance, author authority, view reach, and room to contribute. It never posts, replies, likes, reposts, follows, or messages anyone."],
  ["Analysis", "Analysis runs locally using deterministic application logic by default. External AI processing remains disabled unless the required data terms and approvals are in place."],
  ["Storage and removal", "Only the latest successful result set and usage counters are cached privately on the Railway volume. The public result display expires within 24 hours, and new successful scans replace it. Account owners may request correction or removal at any time."],
  ["Operational monitoring", "Better Stack receives only controlled scan status, result counts, duration, and safe failure codes. Post text, post and author IDs, credentials, owner tokens, and visitor data are never included."],
  ["Sharing", "X data is not sold, licensed, offered as a dataset, used for surveillance, matched to off-platform identities, or used for advertising."],
] as const;

export function RadarPrivacyPanel() {
  return <div>
    <p className="text-xs font-semibold uppercase text-accent">Radar privacy</p>
    <h3 className="mt-2 text-lg font-semibold text-ink">Public data, limited purpose.</h3>
    <p className="mt-2 text-[12px]/[1.55] text-neutral-600">The radar uses a small amount of public X information to identify professional conversations that may be worth joining manually. Visitors never sign in with X.</p>
    <div className="mt-5 space-y-4">{SECTIONS.map(([title, body]) => <section key={title} className="rounded-lg border border-line bg-panel p-3"><h4 className="text-[13px] font-semibold text-ink">{title}</h4><p className="mt-1 text-[11px]/[1.55] text-neutral-600">{body}</p></section>)}</div>
    <p className="mt-5 border-t border-line pt-4 text-[11px]/[1.55] text-neutral-600">For a privacy question, correction, or removal request, email <a className="text-accent-ink underline underline-offset-2" href={`mailto:${OWNER.email}?subject=Data%20removal%20request`}>{OWNER.email}</a>.</p>
    <p className="mt-3 text-[10px]/[1.5] text-neutral-500">Public post data is sourced from X. This independent project is not affiliated with or endorsed by X. <a href="https://x.com/en/privacy" target="_blank" rel="noopener noreferrer" className="text-accent-ink underline underline-offset-2">X Privacy Policy</a>.</p>
  </div>;
}
