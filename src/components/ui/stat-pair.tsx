/** A key figure: big value, small label below. */
export type Figure = { label: string; value: string };

/**
 * One or two key figures side by side, a thin line between them (victory screen: darts | average).
 * Each figure is a named group, so it reads "Darts 5".
 */
export function StatPair({ figures }: { figures: [Figure] | [Figure, Figure] }) {
  return (
    <div className="flex justify-center divide-x divide-separator">
      {figures.map((f) => (
        <div key={f.label} role="group" aria-label={f.label} className="flex min-w-0 flex-col items-center px-6">
          <span className="text-fluid-lg font-semibold tabular-nums">{f.value}</span>
          <span className="text-xs text-fg-muted">{f.label}</span>
        </div>
      ))}
    </div>
  );
}
