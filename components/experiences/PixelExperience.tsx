"use client";

import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { capturePixelEvent } from "@/lib/pixel-monitoring";

const PixelCanvas = dynamic(
  () => import("./PixelCanvas").then((module) => module.PixelCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center bg-[#07090f] text-xs uppercase tracking-[0.2em] text-white/45">
        Building the pixels…
      </div>
    ),
  },
);

const SCENES = [
  {
    eyebrow: "01 — The image",
    title: "Millions of lights, one picture",
    body: "A display looks continuous from a distance. Move closer and the illusion starts to separate into a precise grid.",
  },
  {
    eyebrow: "02 — The pixel",
    title: "The smallest addressable point",
    body: "Each pixel is one position in the image. Its final color is produced by three even smaller subpixels.",
  },
  {
    eyebrow: "03 — RGB",
    title: "Three lights create the spectrum",
    body: "Red, green, and blue light combine additively. Equal amounts create white; no light creates black.",
  },
  {
    eyebrow: "04 — Mix light",
    title: "Make a color of your own",
    body: "Change each channel from 0 to 255. The three intensities blend in your eye before your brain names the color.",
  },
] as const;

function toHex([red, green, blue]: [number, number, number]) {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function toRgbText(rgb: [number, number, number]) {
  return `rgb(${rgb.join(", ")})`;
}

function parseHex(value: string): [number, number, number] | null {
  const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return null;
  const expanded = match[1].length === 3
    ? match[1].split("").map((character) => character.repeat(2)).join("")
    : match[1];
  return [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16)) as [number, number, number];
}

function parseRgb(value: string): [number, number, number] | null {
  const normalized = value.trim().replace(/^rgb\s*\(/i, "").replace(/\)$/, "");
  const parts = normalized.split(",").map((part) => part.trim());
  if (parts.length !== 3) return null;
  const channels = parts.map(Number);
  if (channels.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) return null;
  return channels as [number, number, number];
}

export function PixelExperience() {
  const [scene, setScene] = useState(0);
  const [started, setStarted] = useState(false);
  const [rgb, setRgb] = useState<[number, number, number]>([120, 220, 255]);
  const [rgbText, setRgbText] = useState(() => toRgbText(rgb));
  const [hexText, setHexText] = useState(() => toHex(rgb));
  const active = SCENES[scene];
  const mixedColor = useMemo(() => `rgb(${rgb.join(",")})`, [rgb]);
  const onAccent = useMemo(
    () => (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 150 ? "#080b12" : "#ffffff"),
    [rgb],
  );

  useEffect(() => {
    capturePixelEvent("experience_loaded");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        setStarted(true);
        setScene((value) => Math.min(SCENES.length - 1, value + 1));
      }
      if (event.key === "ArrowLeft") setScene((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const goTo = (index: number) => {
    setStarted(true);
    setScene(index);
  };

  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden bg-[#07090f] text-white"
      style={{
        "--experience-accent": mixedColor,
        "--experience-on-accent": onAccent,
        "--experience-accent-outline": onAccent === "#ffffff" ? "rgba(255,255,255,0.68)" : "transparent",
      } as React.CSSProperties}
    >
      <h1 className="sr-only">How Pixels Create Color — interactive 3D experience</h1>
      <PixelCanvas scene={scene} rgb={rgb} />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_64%_43%,transparent_10%,rgba(3,5,10,0.08)_48%,rgba(3,5,10,0.78)_100%)]" />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-5 sm:p-8 lg:p-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--experience-accent)] [text-shadow:0_0_1px_var(--experience-accent-outline)] sm:text-xs">
            <Sparkles size={14} strokeWidth={1.5} aria-hidden />
            Interactive light study
          </div>
          <p className="hidden text-[10px] uppercase tracking-[0.2em] text-white/35 sm:block">Arrow keys to travel</p>
        </div>

        <div className="max-w-[570px] pb-20 sm:pb-16 lg:pb-14">
          <div key={scene} className="experience-copy-enter">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--experience-accent)] [text-shadow:0_0_1px_var(--experience-accent-outline)] sm:text-xs">
              {active.eyebrow}
            </p>
            <h2 className="max-w-[560px] text-[clamp(2rem,5vw,4.5rem)] font-semibold leading-[0.94] tracking-[-0.045em] text-white">
              {!started && scene === 0 ? "How Pixels Create Color" : active.title}
            </h2>
            <p className="mt-4 max-w-[470px] text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
              {!started && scene === 0
                ? "Every color on this screen begins with only three tiny lights."
                : active.body}
            </p>
          </div>

          {scene === 3 && (
            <div aria-label="RGB color mixer" className="pointer-events-auto mt-5 grid max-w-[550px] gap-3 rounded-xl border border-white/10 bg-black/25 p-3 backdrop-blur-md sm:grid-cols-[1fr_220px] sm:items-center">
              <div className="space-y-2">
                {(["Red", "Green", "Blue"] as const).map((label, index) => (
                  <label key={label} className="grid grid-cols-[44px_1fr_34px] items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-white/60">
                    {label}
                    <input
                      aria-label={`${label} channel`}
                      type="range"
                      min="0"
                      max="255"
                      value={rgb[index]}
                      onChange={(event) => {
                        setRgb((current) => {
                          const next = [...current] as [number, number, number];
                          next[index] = Number(event.target.value);
                          setRgbText(toRgbText(next));
                          setHexText(toHex(next));
                          return next;
                        });
                      }}
                      className="h-1 w-full cursor-pointer accent-[var(--experience-accent)]"
                    />
                    <span className="text-right tabular-nums text-white/80">{rgb[index]}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-[46px_1fr] items-center gap-x-2.5 gap-y-2">
                <span className="row-span-2 size-11 rounded-lg border border-white/20 shadow-sm" style={{ background: mixedColor }} aria-hidden />
                <label className="grid grid-cols-[32px_1fr] items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/55">
                  RGB
                  <input
                    data-color-value-input
                    aria-label="RGB value"
                    value={rgbText}
                    onChange={(event) => {
                      const value = event.target.value;
                      setRgbText(value);
                      const parsed = parseRgb(value);
                      if (parsed) {
                        setRgb(parsed);
                        setHexText(toHex(parsed));
                      }
                    }}
                    onBlur={() => setRgbText(toRgbText(rgb))}
                    onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                    spellCheck={false}
                    className="min-w-0 rounded border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-[11px] normal-case tracking-normal text-white/80 outline-none focus:border-[var(--experience-accent)]"
                  />
                </label>
                <label className="grid grid-cols-[32px_1fr] items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/55">
                  Hex
                  <input
                    data-color-value-input
                    aria-label="Hex value"
                    value={hexText}
                    onChange={(event) => {
                      const value = event.target.value;
                      setHexText(value);
                      const parsed = parseHex(value);
                      if (parsed) {
                        setRgb(parsed);
                        setRgbText(toRgbText(parsed));
                      }
                    }}
                    onBlur={() => setHexText(toHex(rgb))}
                    onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                    maxLength={7}
                    spellCheck={false}
                    className="min-w-0 rounded border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-[11px] tracking-normal text-white/80 outline-none focus:border-[var(--experience-accent)]"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-2">
            {!started && scene === 0 ? (
              <button
                type="button"
                onClick={() => goTo(1)}
                className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-white/15 bg-[var(--experience-accent)] px-6 py-3 text-sm font-semibold text-[var(--experience-on-accent)] shadow-[0_8px_30px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 active:translate-y-0"
              >
                Start exploring <ArrowRight size={16} aria-hidden />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={scene === 0}
                  onClick={() => goTo(scene - 1)}
                  aria-label="Previous scene"
                  className="pointer-events-auto grid size-10 place-items-center rounded-full border border-white/20 bg-black/30 text-white/75 backdrop-blur transition hover:border-white/50 hover:text-white active:scale-95 disabled:opacity-25"
                >
                  <ArrowLeft size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={scene === SCENES.length - 1}
                  onClick={() => goTo(scene + 1)}
                  aria-label="Next scene"
                  className="pointer-events-auto inline-flex h-10 items-center gap-3 rounded-full border border-white/15 bg-[var(--experience-accent)] px-5 text-sm font-semibold text-[var(--experience-on-accent)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-25"
                >
                  Next <ArrowRight size={15} aria-hidden />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <nav aria-label="How Pixels Create Color scenes" className="absolute bottom-5 right-5 z-20 sm:bottom-8 sm:right-8 lg:bottom-10 lg:right-10">
        <ol className="flex items-center gap-2">
          {SCENES.map((item, index) => (
            <li key={item.eyebrow}>
              <button
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Scene ${index + 1}: ${item.title}`}
                aria-current={scene === index ? "step" : undefined}
                className={[
                  "grid h-8 place-items-center rounded-full border text-[10px] font-semibold tabular-nums transition-all duration-300",
                  scene === index
                    ? "w-12 border-[var(--experience-accent)] bg-[var(--experience-accent)] text-[var(--experience-on-accent)] shadow-[0_0_0_1px_rgba(255,255,255,0.14)]"
                    : "w-8 border-white/15 bg-black/30 text-white/45 backdrop-blur hover:border-white/40 hover:text-white",
                ].join(" ")}
              >
                {String(index + 1).padStart(2, "0")}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
