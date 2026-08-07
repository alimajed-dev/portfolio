import { HOME_DESCRIPTION, SITE_URL } from "@/lib/seo";
import { OWNER, PROJECTS, SKILLS, SOCIAL_LINKS } from "@/lib/site";

export function buildLlmsText() {
  const expertise = SKILLS.map((skill) => `- ${skill.eyebrow}: ${skill.body}`).join("\n");
  const projects = PROJECTS.map(
    (project) =>
      `- [${project.name}](${SITE_URL}/projects/${project.id}): ${project.cardBody}`,
  ).join("\n");
  const profiles = SOCIAL_LINKS.filter((link) => link.href.startsWith("https://"))
    .map((link) => `- [${link.id}](${link.href})`)
    .join("\n");

  return `# ${OWNER.name}

> Official portfolio of Ali Majed, a full-stack software engineer and solutions architect focused on practical AI systems and production web applications.

## About

${HOME_DESCRIPTION}

## Expertise

${expertise}

## Public pages

- [Home](${SITE_URL}/): Biography, expertise, and selected projects.
- [Contact](${SITE_URL}/contact): Official contact details and social profiles.
${projects}

## Verified profiles

${profiles}
`;
}
