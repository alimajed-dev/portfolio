import type { Metadata } from "next";
import { ContactPane } from "@/components/panes/ContactPane";

export const metadata: Metadata = {
  title: "Contact — Ali Majed",
  description: "Get in touch with Ali Majed — email, LinkedIn, X, YouTube, GitHub.",
};

export default function ContactPage() {
  return <ContactPane />;
}
