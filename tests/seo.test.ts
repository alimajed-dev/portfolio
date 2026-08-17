import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { buildLlmsText } from "@/lib/llms";
import {
  buildHomeJsonLd,
  buildProjectJsonLd,
  createPageMetadata,
  HOME_DESCRIPTION,
  HOME_TITLE,
  serializeJsonLd,
  SITE_URL,
} from "@/lib/seo";
import { OWNER, PROJECTS, SOCIAL_LINKS } from "@/lib/site";

describe("SEO discovery", () => {
  it("publishes every public HTML route once in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/contact`,
      `${SITE_URL}/privacy`,
      ...PROJECTS.map((project) => `${SITE_URL}/projects/${project.id}`),
    ]);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("allows public crawling, protects the agent API, and advertises the sitemap", () => {
    const policy = robots();

    expect(policy.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    });
    expect(policy.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(policy.host).toBe(SITE_URL);
  });

  it("uses a canonical URL and the current avatar for shared-link previews", () => {
    const metadata = createPageMetadata({
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      path: "/",
    });

    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/`);
    expect(metadata.openGraph?.images).toEqual([
      {
        url: `${SITE_URL}${OWNER.avatarSrc}`,
        width: 256,
        height: 256,
        alt: OWNER.name,
        type: "image/png",
      },
    ]);
    expect(metadata.twitter).toMatchObject({ card: "summary" });
  });
});

describe("machine-readable identity", () => {
  it("connects Ali Majed, his website, public profiles, and projects", () => {
    const graph = buildHomeJsonLd()["@graph"];
    const person = graph.find((node) => node["@type"] === "Person");
    const website = graph.find((node) => node["@type"] === "WebSite");
    const profilePage = graph.find((node) => node["@type"] === "ProfilePage");

    expect(person).toMatchObject({
      name: OWNER.name,
      url: `${SITE_URL}/`,
      image: `${SITE_URL}${OWNER.avatarSrc}`,
      sameAs: SOCIAL_LINKS.filter((link) => link.href.startsWith("https://")).map(
        (link) => link.href,
      ),
    });
    expect(website).toMatchObject({ name: OWNER.name, url: `${SITE_URL}/` });
    expect(profilePage).toMatchObject({ mainEntity: { "@id": `${SITE_URL}/#person` } });
    expect(graph.filter((node) => node["@type"] === "SoftwareApplication")).toHaveLength(
      PROJECTS.length,
    );
  });

  it("describes each project at its canonical URL", () => {
    const project = PROJECTS[0];

    expect(buildProjectJsonLd(project)).toMatchObject({
      name: project.name,
      url: `${SITE_URL}/projects/${project.id}`,
      author: { name: OWNER.name },
    });
  });

  it("escapes HTML-opening characters before embedding JSON-LD", () => {
    expect(serializeJsonLd({ value: "</script>" })).toContain("\\u003c/script>");
  });

  it("provides an AI-readable summary with canonical public links", () => {
    const llmsText = buildLlmsText();

    expect(llmsText).toContain(`# ${OWNER.name}`);
    expect(llmsText).toContain(`${SITE_URL}/contact`);
    for (const project of PROJECTS) {
      expect(llmsText).toContain(`${SITE_URL}/projects/${project.id}`);
    }
  });
});
