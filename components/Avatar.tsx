"use client";

import { useState } from "react";

type Props = {
  /** Path under /public. Falls back to initials if missing or it fails to load. */
  src?: string;
  initials: string;
  name: string;
  className?: string;
};

export function Avatar({ src, initials, name, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const base = `size-8 shrink-0 rounded-lg bg-ink text-bg flex items-center justify-center text-[13px] font-bold overflow-hidden ${className}`;

  if (!src || failed) {
    return (
      <div className={base} role="img" aria-label={name}>
        {initials}
      </div>
    );
  }

  return (
    <div className={base}>
      {/* Plain <img> on purpose: a missing file must fall back to initials, not 500. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        width={32}
        height={32}
        className="size-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
