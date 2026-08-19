import type { Metadata } from "next";
import Link from "next/link";
import { OWNER } from "@/lib/site";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy | Ali Majed",
  description: "How Ali Majed's portfolio processes, protects, and removes data used by the Conversation Opportunity Radar.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return <article className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:py-12">
    <div className="mx-auto max-w-[680px]">
      <p className="text-xs font-semibold uppercase text-accent">Privacy</p>
      <h1 className="mt-2 text-[30px] font-bold tracking-[-0.02em] text-ink sm:text-[36px]">Data use and removal requests</h1>
      <p className="mt-3 text-[14px]/[1.65] text-neutral-600">This portfolio does not ask visitors to sign in with X. The Conversation Opportunity Radar uses a small amount of public information to identify professional conversations that may be worth joining manually.</p>

      <div className="mt-8 space-y-7 text-[13px]/[1.65] text-neutral-600 sm:text-[14px]/[1.65]">
        <section><h2 className="text-base font-semibold text-ink">Information processed</h2><p className="mt-2">A bounded set of recent public candidate posts from the official X API. This can include post text and identifiers, timestamps, the public author name, @username and profile image, linked post entities, and public engagement metrics. The radar does not access protected posts, replies, Direct Messages, email addresses, private metrics, location, or sensitive inferred attributes.</p></section>
        <section><h2 className="text-base font-semibold text-ink">How it is used</h2><p className="mt-2">Local application logic filters for concise professional conversations using personal topic fit, the strength of the conversational opening, reply momentum, reply density, brevity, and public reach. Only posts that clear every quality gate are displayed. The service never posts, replies, likes, reposts, follows, messages, or takes any action on X; every decision to engage is made manually on X.</p></section>
        <section><h2 className="text-base font-semibold text-ink">AI and model use</h2><p className="mt-2">X Content is not sent to Gemini or any other external AI provider, and is not used to train or fine-tune any model. Analysis runs inside this application using fixed, reviewable scoring logic. The server also refuses to scan until the revised analysis use case has been disclosed to X and deployment approval is explicitly confirmed.</p></section>
        <section><h2 className="text-base font-semibold text-ink">Storage and removal</h2><p className="mt-2">Only the latest qualifying result set, non-content usage counters, and a content-free last-scan timestamp are cached privately on the Railway volume. X Content expires within 24 hours at the absolute latest, and new successful scans replace the previous snapshot. An independent expiry timer removes the snapshot at the retention boundary; expired or incompatible data is also deleted rather than displayed. X or the applicable account owner may request removal at any time; a protected owner action removes the post immediately and retains only a one-way hash to prevent it from reappearing. Requests are handled within 24 hours.</p></section>
        <section><h2 className="text-base font-semibold text-ink">Operational monitoring</h2><p className="mt-2">Better Stack receives only controlled scan status, result counts, duration, and safe failure codes. Post text, post and author identifiers, credentials, owner tokens, and visitor data are never included.</p></section>
        <section><h2 className="text-base font-semibold text-ink">Sharing and advertising</h2><p className="mt-2">X data is not sold, licensed, offered as a downloadable dataset, shared with external AI providers, used for surveillance, matched to off-platform identities, or used to target advertising. API credentials remain private and server-only.</p></section>
        <section><h2 className="text-base font-semibold text-ink">Contact</h2><p className="mt-2">For a privacy question, correction, or removal request, email <a className="text-accent-ink underline underline-offset-2" href={`mailto:${OWNER.email}?subject=Data%20removal%20request`}>{OWNER.email}</a>. Include the post URL or identifier so the request can be handled promptly.</p></section>
      </div>

      <p className="mt-10 border-t border-line pt-5 text-xs text-neutral-500">Public post data is sourced from X. This independent portfolio project is not affiliated with or endorsed by X. See the <a href="https://x.com/en/privacy" target="_blank" rel="noopener noreferrer" className="text-accent-ink underline underline-offset-2">X Privacy Policy</a>.</p>
      <Link href="/" className="mt-5 inline-flex text-sm font-medium text-accent-ink hover:text-accent-hover">Return to portfolio →</Link>
    </div>
  </article>;
}
