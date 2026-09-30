import type { Metadata } from "next";
import { WritingMediaPane } from "@/components/panes/WritingMediaPane";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Writing & Media — Ali Majed",
  description:
    "Articles and videos by Ali Majed about practical AI systems, software delivery, and software engineering.",
  path: "/writing",
});

export default function WritingPage() {
  return <WritingMediaPane />;
}
