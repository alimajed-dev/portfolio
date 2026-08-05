"use client";

import { useState } from "react";

type Props = {
  /** Path under /public. Falls back to initials if missing or it fails to load. */
  src?: string;
  initials: string;
  name: string;
  className?: string;
};

const SHAPE = "size-8 shrink-0 rounded-lg";

export function Avatar({ src, initials, name, className = "" }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={name}
        className={`${SHAPE} flex items-center justify-center bg-ink text-[13px] font-bold text-bg ${className}`}
      >
        {initials}
      </div>
    );
  }

  return (
    /*
     * No background behind the photo: a dark fill under a rounded, clipped
     * image bleeds through the corners where the browser antialiases the clip,
     * which reads as a border on some edges but not others. The image carries
     * its own radius so the corners don't depend on the parent's clip at all,
     * and the hairline ring gives the photo's pale backdrop a defined edge
     * against the sidebar on every side.
     */
    <div className={`${SHAPE} relative ${className}`}>
      {/* Plain <img> on purpose: a missing file must fall back to initials, not 500. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        width={32}
        height={32}
        className={`${SHAPE} block object-cover`}
        onError={() => setFailed(true)}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-line ring-inset"
      />
    </div>
  );
}
