import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { HomePane } from "@/components/panes/HomePane";
import { buildHomeJsonLd, createPageMetadata, HOME_DESCRIPTION, HOME_TITLE } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  path: "/",
});

export default function Page() {
  return (
    <>
      <JsonLd data={buildHomeJsonLd()} />
      <HomePane />
    </>
  );
}
