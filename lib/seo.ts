import type { Metadata } from "next";
import { OWNER, PROJECTS, SOCIAL_LINKS } from "@/lib/site";

export const SITE_URL = "https://majedali.com";
export const SITE_NAME = OWNER.name;
export const HOME_TITLE = "Ali Majed | Software Engineer & AI Solutions Architect";
export const HOME_DESCRIPTION =
  "Ali Majed is a full-stack software engineer and solutions architect building practical agentic AI systems, scalable architectures, and production web applications.";
export const SOCIAL_IMAGE_PATH = OWNER.avatarSrc;

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
};

/** Keeps titles, canonicals, and social previews consistent across public routes. */
export function createPageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const socialImage = absoluteUrl(SOCIAL_IMAGE_PATH);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_US",
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: socialImage,
          width: 256,
          height: 256,
          alt: "Ali Majed",
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      creator: "@AliMajed93",
      images: [socialImage],
    },
  };
}

export const rootMetadata: Metadata = {
  ...createPageMetadata({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    path: "/",
  }),
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: "%s | Ali Majed",
  },
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: OWNER.name, url: SITE_URL }],
  creator: OWNER.name,
  publisher: OWNER.name,
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const sameAs = SOCIAL_LINKS.map((link) => link.href).filter((href) => href.startsWith("https://"));
const personId = `${SITE_URL}/#person`;
const websiteId = `${SITE_URL}/#website`;

/** Homepage entity graph: the site, its owner, and the public work it presents. */
export function buildHomeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: `${SITE_URL}/`,
        name: OWNER.name,
        alternateName: "Ali Majed Portfolio",
        description: HOME_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": personId },
      },
      {
        "@type": "ProfilePage",
        "@id": `${SITE_URL}/#profile-page`,
        url: `${SITE_URL}/`,
        name: HOME_TITLE,
        description: HOME_DESCRIPTION,
        isPartOf: { "@id": websiteId },
        mainEntity: { "@id": personId },
      },
      {
        "@type": "Person",
        "@id": personId,
        name: OWNER.name,
        url: `${SITE_URL}/`,
        image: absoluteUrl(OWNER.avatarSrc),
        description: OWNER.bio,
        jobTitle: "Full-Stack Software Engineer and Solutions Architect",
        sameAs,
        knowsAbout: [
          "Agentic AI",
          "Multi-agent systems",
          "AI orchestration",
          "Software architecture",
          "Full-stack web development",
          "Production software delivery",
        ],
      },
      ...PROJECTS.map((project) => ({
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/projects/${project.id}#application`,
        name: project.name,
        url: `${SITE_URL}/projects/${project.id}`,
        description: project.cardBody,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        author: { "@id": personId },
        isPartOf: { "@id": websiteId },
      })),
    ],
  };
}

export function buildProjectJsonLd(project: (typeof PROJECTS)[number]) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/projects/${project.id}#application`,
    name: project.name,
    url: `${SITE_URL}/projects/${project.id}`,
    description: project.cardBody,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    author: {
      "@type": "Person",
      "@id": personId,
      name: OWNER.name,
      url: `${SITE_URL}/`,
    },
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
