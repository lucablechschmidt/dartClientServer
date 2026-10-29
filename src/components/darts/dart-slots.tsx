import type { DartSlotView } from "@/domain/game";

/**
 * The three slots of a visit (port of DartScoreView): boxes with a black frame,
 * the current slot blue, bust slots in red. Width as in legacy ≈ 1/6 of the panel width.
 */
export function DartSlots({ slots, isBust, label, size = "large" }: { slots: DartSlotView[]; isBust: boolean; label: string; size?: "large" | "small" }) {
  const large = size === "large";
  return (
    <ol className={`flex justify-center ${large ? "gap-slot-gap" : "gap-2"} tabular`} aria-label={label}>
      {slots.map((s, i) => (
        <li
          key={i}
          className={[
            "grid place-items-center rounded-slot bg-slot-bg font-medium text-frame-text",
            large ? "h-slot-h w-slot-w fluid-text-lg" : "h-8 w-11 rounded-pill fluid-text-sm",
            s.isCurrent ? "border-4 border-frame-active" : "border-3 border-frame-text",
            s.isOverthrown || isBust ? "text-key-undo" : "",
          ].join(" ")}
        >
          {s.label ?? ""}
        </li>
      ))}
    </ol>
  );
}
