/** The track and one segment of a segmented control (iOS); shared by `SegmentedControl` and `PillLinks`. */
export const segmentTrack = "flex gap-1 rounded-full bg-fill p-1";
export const segmentClass = (current: boolean) =>
  `flex min-h-touch flex-1 items-center justify-center rounded-full px-3 text-sm font-medium whitespace-nowrap ${
    current ? "bg-card-bg text-fg shadow-floating" : "text-fg-muted"
  }`;

/** One choice out of a few, side by side (Darstellung: System, Hell, Dunkel); the chosen one is raised. */
export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
}) {
  return (
    <div role="group" aria-label={label} className={segmentTrack}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={segmentClass(o.value === value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
