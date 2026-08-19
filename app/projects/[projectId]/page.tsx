import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { buildProjectJsonLd, createPageMetadata } from "@/lib/seo";
import { PROJECTS } from "@/lib/site";
import { ProjectPageClient } from "./project-page-client";

type Props = { params: Promise<{ projectId: string }> };

/** Pre-renders the known project at build time; unlisted ids still 404 correctly via `notFound()` below. */
export function generateStaticParams() {
  return PROJECTS.map((project) => ({ projectId: project.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  const project = PROJECTS.find((p) => p.id === projectId);
  if (!project) return {};
  return createPageMetadata({
    title: `${project.name} | Ali Majed`,
    description: project.experience === "radar"
      ? "A local, personalized filter that finds concise X conversations with real reply momentum, a clear opening, and room for a practical contribution."
      : project.cardBody,
    path: `/projects/${project.id}`,
  });
}

export default async function ProjectPage({ params }: Props) {
  const { projectId } = await params;
  const project = PROJECTS.find((p) => p.id === projectId);
  if (!project) notFound();

  return (
    <>
      <JsonLd data={buildProjectJsonLd(project)} />
      <ProjectPageClient project={project} />
    </>
  );
}
