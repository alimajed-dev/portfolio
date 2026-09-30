/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WritingMediaPane } from "@/components/panes/WritingMediaPane";
import { WRITING_MEDIA } from "@/lib/site";

vi.mock("next/image", () => ({
  default: ({ alt, src }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double for next/image
    <img alt={alt} src={src} />
  ),
}));

afterEach(cleanup);

describe("WritingMediaPane", () => {
  it("presents the article as a featured external link", () => {
    render(<WritingMediaPane />);
    const article = WRITING_MEDIA.find((item) => item.type === "article")!;
    const link = screen.getByRole("link", { name: new RegExp(article.title) });

    expect(screen.getByRole("heading", { name: "Ideas in writing and on video." })).toBeDefined();
    expect(link.getAttribute("href")).toBe(article.href);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("lists videos newest first with canonical URLs", () => {
    render(<WritingMediaPane />);
    const expectedVideos = WRITING_MEDIA.filter((item) => item.type === "video");
    const videoLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("https://www.youtube.com/watch"));

    expect(videoLinks.map((link) => link.getAttribute("href"))).toEqual(
      expectedVideos.map((video) => video.href),
    );
    expect(videoLinks[0].textContent).toContain("How to Use AI in Dev Teams");
    expect(videoLinks.at(-1)?.textContent).toContain("Did AI Actually Replace Software Engineers?");
    expect(videoLinks.every((link) => !link.getAttribute("href")?.includes("&t="))).toBe(true);
  });
});
