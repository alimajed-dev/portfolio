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
        <section><h2 className="text-base font-semibold text-ink">Information processed</h2><p className="mt-2">Up to 10 recent public posts per scheduled scan, including post text and identifiers, timestamps, public author names, handles and profile descriptions, and public engagement metrics returned by the X API. The radar does not access protected posts, Direct Messages, email addresses, private metrics, or precise location data.</p></section>
        <section><h2 className="text-base font-semibold text-ink">How it is used</h2><p className="mt-2">The service filters unsuitable results and ranks conversations using professional relevance, room to contribute, engagement, velocity, freshness, and network value. It never posts, replies, likes, reposts, follows, or messages anyone. Every decision to engage is made manually on X.</p></section>
        <section><h2 className="text-base font-semibold text-ink">AI processing</h2><p className="mt-2">The default analysis runs locally using deterministic application logic. Gemini analysis remains disabled unless X approves the disclosed processing and the connected Gemini project uses paid-service data terms under which prompts and responses are not used to improve Google products or train models.</p></section>
        <section><h2 className="text-base font-semibold text-ink">Storage and removal</h2><p className="mt-2">Only the latest successful result set and a short-lived list of post IDs used to prevent repeat recommendations are cached privately. The ID list and public result display expire within 24 hours. New successful scans replace the displayed results. Content that is deleted, protected, suspended, withheld, or otherwise unavailable will be removed or updated as soon as reasonably possible. X or the applicable account owner may request removal at any time.</p></section>
        <section><h2 className="text-base font-semibold text-ink">Sharing and advertising</h2><p className="mt-2">X data is not sold, licensed, offered as a downloadable dataset, used for surveillance, matched to off-platform identities, or used to target advertising. API credentials remain private and server-only.</p></section>
        <section><h2 className="text-base font-semibold text-ink">Contact</h2><p className="mt-2">For a privacy question, correction, or removal request, email <a className="text-accent-ink underline underline-offset-2" href={`mailto:${OWNER.email}?subject=Data%20removal%20request`}>{OWNER.email}</a>. Include the post URL or identifier so the request can be handled promptly.</p></section>
      </div>

      <p className="mt-10 border-t border-line pt-5 text-xs text-neutral-500">Public post data is sourced from X. This independent portfolio project is not affiliated with or endorsed by X. See the <a href="https://x.com/en/privacy" target="_blank" rel="noopener noreferrer" className="text-accent-ink underline underline-offset-2">X Privacy Policy</a>.</p>
      <Link href="/" className="mt-5 inline-flex text-sm font-medium text-accent-ink hover:text-accent-hover">Return to portfolio →</Link>
    </div>
  </article>;
}
