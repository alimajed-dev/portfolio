import { BookOpenText, ExternalLink, Play, Video } from "lucide-react";
import Image from "next/image";
import { SOCIAL_LINKS, WRITING_MEDIA } from "@/lib/site";

export function WritingMediaPane() {
  const articles = WRITING_MEDIA.filter((item) => item.type === "article");
  const videos = WRITING_MEDIA.filter((item) => item.type === "video");
  const youtubeChannel = SOCIAL_LINKS.find((link) => link.icon === "youtube")!;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:py-12">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-8">
        <section className="flex flex-col items-start gap-2">
          <p className="text-xs font-semibold uppercase text-accent">Writing &amp; media</p>
          <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em] text-ink sm:text-[32px]">
            Ideas in writing and on video.
          </h1>
          <p className="text-[14px]/[1.6] text-neutral-600 sm:text-[15px]/[1.6]">
            Practical perspectives on AI, software delivery, and the changing role of engineers.
          </p>
        </section>

        <section aria-labelledby="articles-heading" className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-accent">Featured</p>
            <h2 id="articles-heading" className="mt-1 text-xl font-semibold text-ink">
              Articles
            </h2>
          </div>

          {articles.map((article) => (
            <a
              key={article.id}
              href={article.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-line bg-panel p-5 transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px hover:border-line-strong hover:bg-panel-raised active:translate-y-0 sm:p-6"
            >
              <span className="flex items-center justify-between gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent">
                  <BookOpenText size={19} strokeWidth={1.8} aria-hidden />
                </span>
                <ExternalLink
                  size={17}
                  strokeWidth={1.8}
                  aria-hidden
                  className="shrink-0 text-neutral-500 transition-[color,transform] duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </span>
              <span className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-neutral-500">
                {article.source} · {article.published}
              </span>
              <span className="mt-2 block text-[18px]/[1.35] font-semibold text-ink sm:text-[20px]/[1.35]">
                {article.title}
              </span>
              <span className="mt-3 block text-[13px]/[1.55] text-neutral-600 sm:text-[14px]/[1.55]">
                {article.summary}
              </span>
              <span className="mt-5 flex items-center gap-1.5 text-[13px] font-semibold text-accent-ink">
                Read article
                <span aria-hidden>→</span>
              </span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
        </section>

        <hr className="border-0 border-t border-line" />

        <section aria-labelledby="videos-heading" className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-accent">Watch</p>
              <h2 id="videos-heading" className="mt-1 text-xl font-semibold text-ink">
                Videos
              </h2>
            </div>
            <a
              href={youtubeChannel.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-semibold text-neutral-600 transition-[background-color,color] duration-150 hover:bg-panel hover:text-ink"
            >
              <Video size={15} strokeWidth={1.8} aria-hidden />
              View channel
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {videos.map((video, index) => (
              <a
                key={video.id}
                href={video.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-xl border border-line bg-panel transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px hover:border-line-strong hover:bg-panel-raised active:translate-y-0"
              >
                <span className="relative block aspect-video overflow-hidden bg-neutral-800">
                  <Image
                    src={video.thumbnail}
                    alt=""
                    fill
                    loading={index === 0 ? "eager" : "lazy"}
                    sizes="(max-width: 639px) calc(100vw - 32px), 326px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-0 bg-black/10 transition-colors duration-150 group-hover:bg-black/20" />
                  <span className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/95 text-accent shadow-sm transition-transform duration-150 group-hover:scale-105">
                    <Play size={16} fill="currentColor" strokeWidth={1.5} aria-hidden className="ml-0.5" />
                  </span>
                  <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {video.duration}
                  </span>
                </span>
                <span className="block p-4">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.05em] text-neutral-500">
                    {video.source}
                  </span>
                  <span className="mt-1.5 block text-[14px]/[1.4] font-semibold text-ink">
                    {video.title}
                  </span>
                  <span className="mt-2 block text-[12px]/[1.5] text-neutral-600">
                    {video.summary}
                  </span>
                </span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
