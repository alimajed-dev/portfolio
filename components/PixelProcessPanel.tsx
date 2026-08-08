import { Box, Gauge, Lightbulb, MousePointer2 } from "lucide-react";

const PIXEL_TECH = [
  {
    icon: Box,
    name: "3D rendering",
    tools: "React Three Fiber + Three.js",
    detail: "Builds the pixel grid, RGB subpixels, enclosure, camera, and WebGL scene.",
  },
  {
    icon: MousePointer2,
    name: "Motion & interaction",
    tools: "useFrame + OrbitControls",
    detail: "Interpolates camera moves and lets mouse or touch rotate the model.",
  },
  {
    icon: Lightbulb,
    name: "Light & materials",
    tools: "Emissive materials + additive glow",
    detail: "Mixes RGB channels into the enclosure light, halo, and live interface accent.",
  },
  {
    icon: Gauge,
    name: "Performance",
    tools: "Dynamic loading + batched geometry",
    detail: "Loads WebGL only on this route, combines the pixel panel, and caps pixel density.",
  },
] as const;

export function PixelProcessPanel() {
  return (
    <div>
      <h3 className="sr-only">How the Pixels experience was built</h3>
      <details open className="group rounded-lg border border-line bg-panel transition-colors duration-150 open:border-accent">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
          <span className="font-mono text-[11px] text-accent">01</span>
          <span className="min-w-0 flex-1 text-[13px] font-semibold text-ink">How the 3D models were built</span>
          <span className="shrink-0 rounded bg-accent-tint px-2 py-1 font-mono text-[10px] text-accent">
            Procedural
          </span>
        </summary>
        <div className="px-3 pb-3">
          <p className="text-[12px]/[1.5] text-neutral-700">
            I modeled the pixel display, RGB subpixels, enclosure, glow, and camera views directly in TypeScript with Three.js primitives. React Three Fiber connects the scene to React state, so color changes update the model, lighting, and interface together—without downloaded 3D assets.
          </p>
        </div>
      </details>

      <details className="group mt-4 rounded-lg border border-line bg-panel transition-colors duration-150 open:border-accent">
        <summary className="flex cursor-pointer list-none items-center px-3 py-3 [&::-webkit-details-marker]:hidden">
          <span className="text-[13px] font-semibold text-accent">3D & animation stack</span>
        </summary>
        <div className="px-3 pb-3">
          <dl className="flex flex-col gap-3">
            {PIXEL_TECH.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="grid grid-cols-[28px_1fr] gap-2">
                  <span className="mt-0.5 flex size-7 items-center justify-center rounded-md bg-panel-raised text-accent">
                    <Icon size={14} strokeWidth={1.7} aria-hidden />
                  </span>
                  <div>
                    <dt className="text-[12px] font-semibold text-ink">{item.name}</dt>
                    <dd className="mt-0.5 text-[11px]/[1.45] text-neutral-600">
                      <span className="text-neutral-700">{item.tools}</span> — {item.detail}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>
      </details>
    </div>
  );
}
