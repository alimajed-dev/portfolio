"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";

export function TopHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-line px-4 sm:px-6">
      <Link
        href="/contact"
        aria-label="Open contact page"
        title="Contact"
        className="flex size-9 items-center justify-center rounded-lg border border-line-strong bg-bg text-accent transition-[background-color,transform] duration-150 ease-out hover:scale-105 hover:bg-accent-tint active:scale-95"
      >
        <MessageCircle size={17} strokeWidth={1.8} aria-hidden />
      </Link>
    </header>
  );
}
