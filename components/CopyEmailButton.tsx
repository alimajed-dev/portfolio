"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * A mailto link is a dead end on any desktop without a mail client configured —
 * the click silently does nothing. Copying always works.
 */
export function CopyEmailButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return; // clipboard blocked (insecure context, denied permission)
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Email address copied" : `Copy ${value}`}
      className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-neutral-700 transition-[color,background-color,transform] duration-150 ease-out hover:bg-[rgb(32_30_29_/_0.06)] hover:text-ink active:scale-95"
    >
      {copied ? (
        <Check size={14} strokeWidth={2} aria-hidden />
      ) : (
        <Copy size={14} strokeWidth={1.8} aria-hidden />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
