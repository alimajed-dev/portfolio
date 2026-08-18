import { Accessibility, Gauge, MousePointer2 } from "lucide-react";

const INTERACTION_DETAILS = [
  {
    icon: MousePointer2,
    name: "Cursor mapping",
    detail: "The project’s left, center, and right positions map across seconds 0–3 of the video.",
  },
  {
    icon: Gauge,
    name: "Smooth seeking",
    detail: "An animation loop eases toward the latest cursor target while allowing only one video seek at a time.",
  },
  {
    icon: Accessibility,
    name: "Touch controls",
    detail: "On touch screens, tapping the left, center, or right side selects the matching gaze direction.",
  },
] as const;

export function CursorTigerProcessPanel() {
  return (
    <div>
      <h3 className="sr-only">How Cursor Tiger was built</h3>
      <details open className="group rounded-lg border border-line bg-panel transition-colors duration-150 open:border-accent">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
          <span className="font-mono text-[11px] text-accent">01</span>
          <span className="min-w-0 flex-1 text-[13px] font-semibold text-ink">How the tiger follows the cursor</span>
          <span className="shrink-0 rounded bg-accent-tint px-2 py-1 font-mono text-[10px] text-accent">
            Video timeline
          </span>
        </summary>
        <div className="px-3 pb-3">
          <p className="text-[12px]/[1.5] text-neutral-700">
            The complete tiger and environment are rendered in one video. The video stays paused while React maps horizontal cursor movement to its first three seconds and moves the playhead to the matching frame.
          </p>
        </div>
      </details>

      <details className="group mt-4 rounded-lg border border-line bg-panel transition-colors duration-150 open:border-accent">
        <summary className="flex cursor-pointer list-none items-center px-3 py-3 [&::-webkit-details-marker]:hidden">
          <span className="text-[13px] font-semibold text-accent">Interaction details</span>
        </summary>
        <div className="px-3 pb-3">
          <dl className="flex flex-col gap-3">
            {INTERACTION_DETAILS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="grid grid-cols-[28px_1fr] gap-2">
                  <span className="mt-0.5 flex size-7 items-center justify-center rounded-md bg-panel-raised text-accent">
                    <Icon size={14} strokeWidth={1.7} aria-hidden />
                  </span>
                  <div>
                    <dt className="text-[12px] font-semibold text-ink">{item.name}</dt>
                    <dd className="mt-0.5 text-[11px]/[1.45] text-neutral-600">{item.detail}</dd>
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
