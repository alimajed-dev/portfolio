"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Copies any displayed contact value and briefly confirms the action in place. */
export function CopyValueButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }

    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2200);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${value} copied` : `Copy ${value}`}
      title={copied ? "Copied" : "Copy"}
      className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-neutral-500 transition-[width,color,background-color,transform] duration-150 hover:scale-105 hover:bg-panel-raised hover:text-accent active:scale-95"
    >
      {copied ? (
        <>
          <Check size={15} strokeWidth={2.2} aria-hidden className="text-success" />
          <span aria-live="polite" className="text-success">Copied</span>
        </>
      ) : (
        <Copy size={16} strokeWidth={1.7} aria-hidden />
      )}
    </button>
  );
}
