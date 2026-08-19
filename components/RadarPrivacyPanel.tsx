import { OWNER } from "@/lib/site";

const SECTIONS = [
  ["Information processed", "A bounded set of recent public original posts from the official X API: post text and identifiers, timestamp, linked entities, author name, @username and profile image, and public engagement metrics. Protected posts, replies, Direct Messages, private metrics, location, and sensitive inferred attributes are not accessed."],
  ["How it is used", "Local scoring filters for personal topic fit, a real conversational opening, reply momentum and density, brevity, and public reach. Only posts that clear every gate are displayed. The radar never posts, replies, likes, reposts, follows, or messages anyone."],
  ["AI and models", "X Content is not sent to an external AI provider and is never used to train or fine-tune a model. Analysis stays inside the application and uses fixed, reviewable scoring logic."],
  ["Storage and removal", "Only the latest qualifying snapshot, non-content usage counters, and a content-free last-scan timestamp are cached privately. An independent expiry timer removes X Content within 24 hours at the absolute latest. A protected purge removes a requested post immediately and retains only a one-way hash so it cannot reappear; removal requests are handled within 24 hours."],
  ["Operational monitoring", "Better Stack receives only controlled scan status, result counts, duration, and safe failure codes. Post text, post and author IDs, credentials, owner tokens, and visitor data are never included."],
  ["Sharing", "X data is not sold, licensed, offered as a dataset, shared with external AI providers, used for surveillance, matched to off-platform identities, or used for advertising."],
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
