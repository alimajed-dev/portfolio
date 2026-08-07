import type { Metadata } from "next";
import { ContactPane } from "@/components/panes/ContactPane";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Contact Ali Majed | Software Engineer",
  description:
    "Contact Ali Majed about full-stack software engineering, solutions architecture, agentic AI systems, or production web applications.",
  path: "/contact",
});

export default function ContactPage() {
  return <ContactPane />;
}
